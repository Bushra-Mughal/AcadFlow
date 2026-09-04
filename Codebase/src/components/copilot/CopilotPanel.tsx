import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import { extractError } from '@/lib/activity';
import { runCopilotPlan, isReadableFile, publicUrlFor, tokenOverlapScore } from '@/lib/copilot';
import type { CopilotPlan, CopilotPlanItem } from '@/lib/copilot';
import { toast } from 'sonner';
import { Sparkles, HelpCircle, ChevronRight, Save, CalendarClock, Hammer } from 'lucide-react';
import type { FileRecord, Subtask } from '@/types';

interface AssignRow {
  id: string; title: string; course?: string; due_date?: string; status: string;
  priority: string; description?: string; weightage?: number; subtasks?: Subtask[];
}
interface ProjectRow {
  id: string; title: string; course?: string; due_date?: string; status: string;
  priority: string; description?: string; creator_id: string; subtasks?: Subtask[];
  is_creator?: boolean; member_count?: number;
}

function priorityTone(p?: string): string {
  const v = (p || '').toLowerCase();
  if (v.includes('first')) return 'text-destructive border-destructive/30';
  if (v.includes('soon')) return 'text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800';
  return 'text-muted-foreground border-border';
}

function itemKey(item: CopilotPlanItem): string {
  return `${item.kind}:${(item.title || '').toLowerCase()}`;
}

// The model may return steps as plain strings (older output) or {text, minutes}.
function asStep(x: unknown): { text: string; minutes?: number } {
  if (typeof x === 'string') return { text: x };
  if (x && typeof x === 'object') {
    const o = x as { text?: unknown; minutes?: unknown };
    return {
      text: typeof o.text === 'string' ? o.text : JSON.stringify(x),
      minutes: typeof o.minutes === 'number' ? o.minutes : undefined,
    };
  }
  return { text: String(x) };
}

function fmtMinutes(m: number): string {
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `~${h}h ${r}m` : `~${h}h`;
  }
  return `~${m}m`;
}

export default function CopilotPanel() {
  const [assignments, setAssignments] = useState<AssignRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<CopilotPlan | null>(null);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [matchedFolders, setMatchedFolders] = useState<string[]>([]);

  const loadContext = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const [aRes, pRes] = await Promise.all([
      supabase.from('assignments').select('*').order('due_date', { ascending: true }).limit(50),
      supabase.from('projects').select('*').order('due_date', { ascending: true }).limit(50),
    ]);
    const aRows = (aRes.data || []) as AssignRow[];
    let pRows = (pRes.data || []) as ProjectRow[];
    if (user) {
      pRows = await Promise.all(pRows.map(async (p) => {
        const { count } = await supabase
          .from('project_members')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', p.id);
        return { ...p, is_creator: p.creator_id === user.id, member_count: (count ?? 0) + 1 };
      }));
    }
    setAssignments(aRows);
    setProjects(pRows);
    return { aRows, pRows };
  }, []);

  useEffect(() => { loadContext(); }, [loadContext]);

  async function handlePlan() {
    setLoading(true);
    setError('');
    try {
      const { aRows, pRows } = await loadContext();
      if (aRows.length === 0 && pRows.length === 0) {
        setError('Nothing to plan yet. Add an assignment or project first, then hit Plan my work.');
        return;
      }

      const titleById = new Map<string, string>();
      aRows.forEach((a) => titleById.set(a.id, a.title));
      const projectTitleById = new Map<string, string>();
      pRows.forEach((p) => projectTitleById.set(p.id, p.title));

      const [{ data: fData }, { data: folderData }] = await Promise.all([
        supabase.from('files').select('*').limit(100),
        supabase.from('file_folders').select('*'),
      ]);
      const folderName = new Map<string, string>(
        ((folderData || []) as { id: string; name: string }[]).map((fo) => [fo.id, fo.name])
      );

      const allReadable = ((fData || []) as FileRecord[]).filter(isReadableFile);
      const toRef = (f: FileRecord, title?: string) => ({
        name: f.name,
        file_type: f.file_type,
        mime_type: f.mime_type,
        url: publicUrlFor(f),
        assignment_title: title,
      });

      // 1) Files already linked to an assignment or team project (briefs, worksheets).
      const linked = allReadable
        .filter((f) => f.assignment_id || f.project_id)
        .map((f) => toRef(
          f,
          f.assignment_id ? titleById.get(f.assignment_id as string) : projectTitleById.get(f.project_id as string)
        ));

      // 2) Vault lectures stored in a subject-named folder whose name matches a
      //    course, so the plan is grounded in the right subject's material.
      const subjects = [
        ...aRows.map((a) => ({ course: a.course || '', title: a.title })),
        ...pRows.map((p) => ({ course: p.course || '', title: p.title })),
      ].filter((s) => s.course);
      const usedFolders = new Set<string>();
      const lectures = allReadable
        .filter((f) => !f.assignment_id && f.folder_id)
        .map((f) => {
          const fname = folderName.get(f.folder_id as string) || '';
          const hit = fname ? subjects.find((s) => tokenOverlapScore(fname, s.course).score > 0) : undefined;
          if (hit) usedFolders.add(fname);
          return hit ? toRef(f, hit.title) : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const readable = [...linked, ...lectures].slice(0, 6);
      setMatchedFolders([...usedFolders]);

      const result = await runCopilotPlan({
        assignments: aRows.map((a) => ({ title: a.title, course: a.course, due_date: a.due_date, status: a.status, priority: a.priority, weightage: a.weightage, description: a.description })),
        projects: pRows.map((p) => ({ title: p.title, course: p.course, due_date: p.due_date, status: p.status, priority: p.priority, description: p.description, is_creator: p.is_creator, member_count: p.member_count })),
        files: readable,
      });

      setPlan(result);
      setSavedKeys(new Set());
      toast.success('Your plan is ready');
    } catch (err) {
      const msg = extractError(err);
      setError(msg);
      toast.error('Planning failed: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function saveSubtasks(item: CopilotPlanItem) {
    const isProject = item.kind === 'project';
    const match = (isProject ? projects : assignments)
      .find((x) => x.title.toLowerCase() === (item.title || '').toLowerCase());
    if (!match) { toast.error(`Couldn't find "${item.title}" to save into`); return; }

    const rawSteps = (item.subtasks && item.subtasks.length ? item.subtasks : item.steps) || [];
    const texts = rawSteps.map((s) => {
      const st = asStep(s);
      return st.minutes ? `${st.text} (~${st.minutes}m)` : st.text;
    });
    if (!texts.length) { toast.error('No sub-tasks to save for this item'); return; }

    const existing: Subtask[] = Array.isArray(match.subtasks) ? match.subtasks : [];
    const seen = new Set(existing.map((s) => s.text.trim().toLowerCase()));
    const now = new Date().toISOString();
    const added: Subtask[] = [];
    for (const t of texts) {
      const key = t.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      added.push({ id: crypto.randomUUID(), text: t.trim(), done: false, source: 'ai-copilot', created_at: now });
    }
    if (!added.length) { toast.info('All sub-tasks are already saved'); return; }

    const merged = [...existing, ...added];
    const skey = itemKey(item);
    setSavingKey(skey);
    const { error: updErr } = await supabase
      .from(isProject ? 'projects' : 'assignments')
      .update({ subtasks: merged })
      .eq('id', match.id);
    setSavingKey(null);
    if (updErr) { toast.error('Failed to save sub-tasks: ' + extractError(updErr)); return; }

    if (isProject) setProjects((prev) => prev.map((p) => (p.id === match.id ? { ...p, subtasks: merged } : p)));
    else setAssignments((prev) => prev.map((a) => (a.id === match.id ? { ...a, subtasks: merged } : a)));
    setSavedKeys((prev) => new Set(prev).add(skey));
    toast.success(`Saved ${added.length} sub-task${added.length > 1 ? 's' : ''} to "${item.title}"`);
  }

  const items = plan?.plan || [];
  const followUps = plan?.followUpQuestions || [];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Trigger */}
        <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ai-gradient">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Plan my work</h2>
              <p className="text-xs text-muted-foreground text-pretty mt-0.5">
                Reads your assignments, projects, your uploaded briefs, and the lectures in matching subject folders, then drafts a prioritized, actionable plan you can save as sub-tasks.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handlePlan} disabled={loading} className="gap-1.5">
              {loading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Planning...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {plan ? 'Re-plan' : 'Plan my work'}
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} &middot; {projects.length} project{projects.length !== 1 ? 's' : ''} loaded
            </span>
            {matchedFolders.length > 0 && (
              <span className="text-xs text-muted-foreground">
                &middot; using lectures from: {matchedFolders.join(', ')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/80 text-pretty">
            Tip: keep each subject's lectures in a My Files folder named after the subject (e.g. "Artificial Intelligence"). The planner reads matching folders automatically.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive text-pretty">
            {error}
          </div>
        )}

        {plan && (
          <div className="space-y-6">
            {plan.summary && (
              <p className="text-sm text-foreground/90 text-pretty leading-relaxed">{plan.summary}</p>
            )}

            {items.length > 0 && (
              <div className="space-y-3">
                {items.map((item, i) => {
                  const skey = itemKey(item);
                  const steps = item.steps || [];
                  const subs = item.subtasks || [];
                  const saveCount = subs.length || steps.length;
                  const isSaved = savedKeys.has(skey);
                  const isSaving = savingKey === skey;
                  return (
                    <div key={i} className="rounded-xl border border-border/50 p-4 space-y-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-balance">{item.title}</h3>
                          <Badge variant="outline" className="text-xs capitalize">{item.kind}</Badge>
                          {item.priority && (
                            <Badge variant="outline" className={`text-xs ${priorityTone(item.priority)}`}>{item.priority}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {item.dueLabel && (
                            <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{item.dueLabel}</span>
                          )}
                          {item.effort && (
                            <span className="inline-flex items-center gap-1"><Hammer className="h-3 w-3" />{item.effort}</span>
                          )}
                        </div>
                      </div>

                      {item.why && <p className="text-xs text-muted-foreground text-pretty">{item.why}</p>}

                      {item.references && item.references.length > 0 && (
                        <p className="text-[11px] text-muted-foreground text-pretty">
                          Sources: {item.references.join(', ')}
                        </p>
                      )}

                      {steps.length > 0 && (
                        <ol className="space-y-1.5">
                          {steps.map((raw, j) => {
                            const s = asStep(raw);
                            return (
                              <li key={j} className="flex gap-2.5 text-sm text-pretty">
                                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums">{j + 1}</span>
                                <span className="flex-1 min-w-0">
                                  {s.text}
                                  {s.minutes ? <span className="ml-1.5 whitespace-nowrap text-xs text-muted-foreground">({fmtMinutes(s.minutes)})</span> : null}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      )}

                      {saveCount > 0 && (
                        <div className="pt-1">
                          <Button variant="outline" size="sm" onClick={() => saveSubtasks(item)} disabled={savingKey !== null} className="gap-1.5 text-xs">
                            {isSaving ? (
                              <span className="inline-block h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            {isSaved ? 'Sub-tasks saved' : `Save ${saveCount} sub-task${saveCount > 1 ? 's' : ''}`}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {followUps.length > 0 && (
              <div className="rounded-xl border border-border/50 p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" /> To sharpen this plan
                </p>
                {followUps.map((q, i) => (
                  <p key={i} className="text-sm text-pretty flex gap-2">
                    <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />{q}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
