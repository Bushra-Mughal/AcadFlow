import { supabase } from '@/db/supabase';
import type { FileRecord } from '@/types';

export interface CopilotPlanStep {
  text: string;
  minutes?: number;
}

export interface CopilotPlanItem {
  title: string;
  kind: 'assignment' | 'project';
  priority?: string;
  dueLabel?: string;
  why?: string;
  effort?: string;
  references?: string[];
  steps?: CopilotPlanStep[];
  subtasks?: CopilotPlanStep[];
}

export interface CopilotPlan {
  summary?: string;
  plan?: CopilotPlanItem[];
  followUpQuestions?: string[];
}

export interface CopilotExplanation {
  name?: string;
  whatIsRequired?: string;
  keyPoints?: string[];
  easyToMiss?: string[];
  actionItems?: string[];
}

export interface CopilotFileRef {
  name: string;
  file_type?: string;
  mime_type?: string;
  url: string;
  assignment_title?: string;
}

export interface CopilotDelegateTask {
  title: string;
  detail?: string;
}

export interface CopilotDelegateAssignment {
  username: string;
  focus?: string;
  tasks?: CopilotDelegateTask[];
}

export interface CopilotDelegateResult {
  summary?: string;
  assignments?: CopilotDelegateAssignment[];
}

const READABLE_EXT = [
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'pdf', 'docx', 'py', 'js', 'jsx',
  'ts', 'tsx', 'java', 'c', 'cpp', 'cc', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php',
  'sh', 'sql', 'html', 'htm', 'css', 'scss', 'xml', 'yml', 'yaml', 'ipynb', 'log',
];

/** True when the Copilot edge function is likely able to read this file's text. */
export function isReadableFile(file: Pick<FileRecord, 'name' | 'mime_type' | 'file_type'>): boolean {
  const mime = (file.mime_type || '').toLowerCase();
  if (mime.startsWith('text/')) return true;
  if (mime === 'application/pdf' || mime === 'application/json' || mime === 'application/x-ipynb+json') return true;
  if (mime.includes('wordprocessingml')) return true;
  const ext = file.name.includes('.') ? (file.name.split('.').pop() || '').toLowerCase() : '';
  return READABLE_EXT.includes(ext);
}

/** Public URL for a file in the `user-files` bucket (matches the upload path used app-wide). */
export function publicUrlFor(file: Pick<FileRecord, 'file_path'>): string {
  return supabase.storage.from('user-files').getPublicUrl(file.file_path).data.publicUrl;
}

const STOP_WORDS = new Set(['the','a','an','and','or','of','for','to','in','on','with','at','by','is','are','be','my','our','your','its','it','as','do','does','how','what','when']);

/** Lowercase keyword tokens of a name or subject, minus stop-words and any file extension. */
export function nameTokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '')
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
  );
}

/** Keyword-overlap relevance between two names (0 = unrelated). Used to match
 *  vault files to assignments and subject folders to courses. */
export function tokenOverlapScore(a: string, b: string): { score: number; matched: string[] } {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  let score = 0;
  const matched: string[] = [];
  for (const t of ta) {
    if (tb.has(t)) {
      score += 1;
      matched.push(t);
    } else if (t.length >= 4) {
      for (const u of tb) {
        if (u.length >= 4 && (u.includes(t) || t.includes(u))) {
          score += 0.5;
          matched.push(t);
          break;
        }
      }
    }
  }
  return { score, matched };
}

async function invokeCopilot(body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke('ai-copilot', { body });
  if (error) {
    let msg = error.message;
    try {
      const text = await (error as unknown as { context?: Response }).context?.text?.();
      if (text) {
        try { const parsed = JSON.parse(text); msg = parsed?.error || text; } catch { msg = text; }
      }
    } catch { /* keep original message */ }
    throw new Error(msg);
  }
  const payload = data as { error?: string; result?: unknown } | undefined;
  if (payload?.error) throw new Error(payload.error);
  return payload?.result;
}

export async function runCopilotPlan(input: {
  assignments: Record<string, unknown>[];
  projects: Record<string, unknown>[];
  files: CopilotFileRef[];
}): Promise<CopilotPlan> {
  const result = await invokeCopilot({ task: 'plan', ...input });
  return (result || {}) as CopilotPlan;
}

export async function runCopilotExplain(input: {
  file: CopilotFileRef;
  assignment?: Record<string, unknown>;
}): Promise<CopilotExplanation> {
  const result = await invokeCopilot({ task: 'explain', ...input });
  return (result || {}) as CopilotExplanation;
}

export async function runCopilotDelegate(input: {
  project: Record<string, unknown>;
  members: { username: string; is_lead?: boolean }[];
  files?: CopilotFileRef[];
}): Promise<CopilotDelegateResult> {
  const result = await invokeCopilot({ task: 'delegate', ...input });
  return (result || {}) as CopilotDelegateResult;
}

export interface CopilotExtractResult {
  name?: string;
  text?: string;
  extracted?: boolean;
  note?: string;
}

/** Reads a file's raw text via the Copilot extractor (no model call). Used to
 *  ground the chat assistant in a user-attached file. */
export async function runCopilotExtract(input: { file: CopilotFileRef }): Promise<CopilotExtractResult> {
  const result = await invokeCopilot({ task: 'extract', ...input });
  return (result || {}) as CopilotExtractResult;
}

export interface CopilotParseResult {
  title?: string | null;
  course?: string | null;
  due_date?: string | null;
  weightage?: number | null;
  priority?: 'low' | 'medium' | 'high' | null;
  description?: string | null;
}

/** Turns a spoken transcript into structured assignment/project fields via the
 *  Copilot model. Sends the client-local date so relative deadlines resolve
 *  against the student's calendar. Used by voice-add to auto-fill the form. */
export async function runCopilotParse(input: {
  transcript: string;
  kind: 'assignment' | 'project';
}): Promise<CopilotParseResult> {
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
  const result = await invokeCopilot({ task: 'parse', today, ...input });
  return (result || {}) as CopilotParseResult;
}
