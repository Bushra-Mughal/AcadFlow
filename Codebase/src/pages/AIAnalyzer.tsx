import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/db/supabase';
import type { AnalysisResult, AnalysisHistory } from '@/types';
import {
  ScanSearch, Sparkles, ExternalLink, CheckCircle2, AlertCircle,
  Clock, Trash2, ChevronRight, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { extractError } from '@/lib/activity';

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 60 ? 'text-amber-600 dark:text-amber-400'
    : 'text-destructive';
  return <span className={`text-4xl font-light tabular-nums ${color}`}>{score}</span>;
}

function SectionScore({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium tabular-nums">{score}</span>
      </div>
      <Progress value={score} className="h-1" />
    </div>
  );
}

export default function AIAnalyzer() {
  const [content, setContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<AnalysisHistory | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    try {
      const { data, error } = await supabase
        .from('analysis_history')
        .select('id, user_id, content_preview, overall_score, result, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('[AIAnalyzer] loadHistory:', extractError(err), err);
    }
  }

  async function handleAnalyze() {
    if (!content.trim()) { toast.error('Please enter some content to analyze'); return; }
    setAnalyzing(true);
    setResult(null);
    setSelectedHistory(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('ai-analyzer', {
        body: { content: content.trim(), contentType: 'text' },
      });
      if (error) {
        const errorMsg = await error?.context?.text?.();
        throw new Error(errorMsg || error.message);
      }

      setResult(data);
      toast.success('Analysis complete');

      // Save to history
      if (user) {
        const preview = content.trim().slice(0, 120) + (content.trim().length > 120 ? 'â€¦' : '');
        await supabase.from('analysis_history').insert({
          user_id: user.id,
          content_preview: preview,
          overall_score: data.overallScore,
          result: data,
        });
        await loadHistory();
      }
    } catch (err) {
      const msg = extractError(err);
      console.error('[AIAnalyzer] handleAnalyze:', msg, err);
      toast.error('Analysis failed: ' + msg);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleClearResult() {
    setResult(null);
    setSelectedHistory(null);
    setContent('');
    toast.success('Cleared');
  }

  async function handleDeleteHistory(id: string) {
    try {
      const { error } = await supabase.from('analysis_history').delete().eq('id', id);
      if (error) throw error;
      setHistory(prev => prev.filter(h => h.id !== id));
      if (selectedHistory?.id === id) { setSelectedHistory(null); setResult(null); }
      toast.success('Deleted');
    } catch (err) {
      toast.error('Failed to delete: ' + extractError(err));
    }
  }

  const activeResult = selectedHistory ? selectedHistory.result : result;

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden">
      {/* History Sidebar */}
      <aside className={`shrink-0 border-r border-border/50 bg-muted/20 overflow-y-auto transition-all duration-200 ${
        showHistory ? 'w-72' : 'w-0 overflow-hidden'
      } hidden md:block`}>
        <div className="p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Past Analyses</p>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No history yet</p>
          ) : history.map(h => (
            <div
              key={h.id}
              onClick={() => { setSelectedHistory(h); setResult(null); }}
              className={`group relative rounded-lg p-3 cursor-pointer transition-colors text-left ${
                selectedHistory?.id === h.id ? 'bg-muted' : 'hover:bg-muted/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{h.content_preview}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-semibold tabular-nums ${
                      h.overall_score >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                      : h.overall_score >= 60 ? 'text-amber-600 dark:text-amber-400'
                      : 'text-destructive'
                    }`}>{h.overall_score}/100</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteHistory(h.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full ai-gradient shrink-0">
              <ScanSearch className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">AI Analyzer</h1>
              <p className="text-xs text-muted-foreground">Detailed feedback before submission</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(v => !v)}
              className="gap-1.5 text-xs hidden md:flex"
            >
              <Clock className="h-3.5 w-3.5" />
              History ({history.length})
            </Button>
            {activeResult && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear this analysis?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The current analysis view will be cleared. Your history is preserved.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearResult}>Clear</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 space-y-6">
            {/* Input panel */}
            {!activeResult && (
              <div className="space-y-3">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your essay, report, code, or draft here for detailed analysisâ€¦"
                  rows={12}
                  disabled={analyzing}
                  className="font-mono text-sm resize-none leading-relaxed"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || !content.trim()}
                  className="w-full"
                >
                  {analyzing ? (
                    <>
                      <span className="mr-2 inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Analyzingâ€¦
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Analyze my work
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Results */}
            {activeResult && (
              <div className="space-y-8 opacity-0 intersect:opacity-100 transition duration-500">
                {/* Score overview */}
                <div className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div>
                      <ScoreBadge score={activeResult.overallScore} />
                      <span className="text-sm text-muted-foreground ml-1">/100</span>
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <div className={`flex items-center gap-1.5 text-sm ${
                        activeResult.readyToSubmit.answer === 'Yes'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {activeResult.readyToSubmit.answer === 'Yes'
                          ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                          : <AlertCircle className="h-4 w-4 shrink-0" />}
                        <span className="font-medium">
                          {activeResult.readyToSubmit.answer === 'Yes' ? 'Ready to submit' : 'Needs revision'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 text-pretty leading-relaxed">
                        {activeResult.readyToSubmit.reasoning}
                      </p>
                    </div>
                  </div>

                  {/* Score bars */}
                  <div className="grid gap-3 rounded-xl border border-border/50 p-4">
                    <SectionScore label="Grammar & Spelling" score={activeResult.grammarAndSpelling.score} />
                    <SectionScore label="Structure" score={activeResult.structure.score} />
                    <SectionScore label="Content Quality" score={activeResult.contentQuality.score} />
                    <SectionScore label="Clarity & Flow" score={activeResult.clarityAndFlow.score} />
                  </div>
                </div>

                <Separator />

                {/* Grammar */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold">Grammar & Spelling</h2>
                  {activeResult.grammarAndSpelling.issues.length === 0 ? (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0" /> No major issues found
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {activeResult.grammarAndSpelling.issues.map((issue, i) => (
                        <li key={i} className="text-sm text-muted-foreground text-pretty flex gap-2">
                          <span className="shrink-0 text-muted-foreground/40 mt-0.5">â€“</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <Separator />

                {/* Structure */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold">Structure</h2>
                  {activeResult.structure.strengths.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Strengths</p>
                      {activeResult.structure.strengths.map((s, i) => (
                        <p key={i} className="text-sm text-emerald-600 dark:text-emerald-400 flex gap-2 text-pretty">
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />{s}
                        </p>
                      ))}
                    </div>
                  )}
                  {activeResult.structure.weaknesses.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Weaknesses</p>
                      {activeResult.structure.weaknesses.map((w, i) => (
                        <p key={i} className="text-sm text-amber-600 dark:text-amber-400 flex gap-2 text-pretty">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{w}
                        </p>
                      ))}
                    </div>
                  )}
                  {activeResult.structure.suggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Suggestions</p>
                      {activeResult.structure.suggestions.map((s, i) => (
                        <p key={i} className="text-sm text-muted-foreground flex gap-2 text-pretty">
                          <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" />{s}
                        </p>
                      ))}
                    </div>
                  )}
                </section>

                <Separator />

                {/* Content Quality */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold">Content Quality</h2>
                  {activeResult.contentQuality.strengths.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Strengths</p>
                      {activeResult.contentQuality.strengths.map((s, i) => (
                        <p key={i} className="text-sm text-emerald-600 dark:text-emerald-400 flex gap-2 text-pretty">
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />{s}
                        </p>
                      ))}
                    </div>
                  )}
                  {activeResult.contentQuality.suggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Suggestions</p>
                      {activeResult.contentQuality.suggestions.map((s, i) => (
                        <p key={i} className="text-sm text-muted-foreground flex gap-2 text-pretty">
                          <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" />{s}
                        </p>
                      ))}
                    </div>
                  )}
                </section>

                <Separator />

                {/* Clarity */}
                <section className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-sm font-semibold">Clarity & Flow</h2>
                    <Badge variant="outline" className="text-xs">{activeResult.clarityAndFlow.rating}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
                    {activeResult.clarityAndFlow.feedback}
                  </p>
                </section>

                <Separator />

                {/* Plagiarism */}
                <section className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-sm font-semibold">Plagiarism Risk</h2>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        activeResult.plagiarismRisk.level === 'Low'
                          ? 'text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-800'
                          : activeResult.plagiarismRisk.level === 'Medium'
                          ? 'text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-800'
                          : 'text-destructive border-destructive/30'
                      }`}
                    >
                      {activeResult.plagiarismRisk.level}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground text-pretty">{activeResult.plagiarismRisk.reasoning}</p>
                  {activeResult.plagiarismRisk.warnings.length > 0 && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 p-3 space-y-1">
                      {activeResult.plagiarismRisk.warnings.map((w, i) => (
                        <p key={i} className="text-sm text-amber-700 dark:text-amber-400 flex gap-2 text-pretty">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />{w}
                        </p>
                      ))}
                    </div>
                  )}
                </section>

                <Separator />

                {/* Summary */}
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold">Summary</h2>
                  <p className="text-sm text-muted-foreground text-pretty leading-relaxed">{activeResult.summary}</p>
                </section>

                <Separator />

                {/* Tools */}
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold">Recommended Tools</h2>
                  <div className="grid gap-2 md:grid-cols-2">
                    {activeResult.recommendedTools.map((tool, i) => (
                      <a
                        key={i}
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 rounded-xl border border-border/50 p-3 transition-colors hover:bg-muted/50 group"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5 group-hover:text-foreground transition-colors" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-balance">{tool.name}</p>
                          <p className="text-xs text-muted-foreground text-pretty mt-0.5">{tool.purpose}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>

                <div className="pt-2">
                  <Button variant="outline" onClick={() => { setResult(null); setSelectedHistory(null); setContent(''); }} className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analyze another piece
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


