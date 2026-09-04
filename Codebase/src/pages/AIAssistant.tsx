import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/db/supabase';
import type { ChatMessage, FileRecord } from '@/types';
import { Bot, Send, User, Trash2, MessageSquare, ClipboardList, FolderKanban, Sparkles, X, FileText, Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractError } from '@/lib/activity';
import AIAnalyzer from './AIAnalyzer';
import CopilotPanel from '@/components/copilot/CopilotPanel';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { runCopilotExtract, publicUrlFor, isReadableFile } from '@/lib/copilot';

// â”€â”€ Markdown renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let key = 0;

  function flushList() {
    if (!listBuffer.length) return;
    if (listType === 'ol') {
      nodes.push(
        <ol key={key++} className="list-decimal list-inside space-y-0.5 my-1.5 pl-2">
          {listBuffer.map((item, i) => <li key={i} className="text-sm leading-relaxed">{inlineMarkdown(item)}</li>)}
        </ol>
      );
    } else {
      nodes.push(
        <ul key={key++} className="space-y-0.5 my-1.5 pl-1">
          {listBuffer.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed flex gap-2">
              <span className="shrink-0 opacity-40">-</span>
              <span>{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
    }
    listBuffer = [];
    listType = null;
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      nodes.push(<div key={key++} className="h-2" />);
      continue;
    }
    if (line.startsWith('## ')) {
      flushList();
      nodes.push(<p key={key++} className="text-sm font-semibold mt-3 mb-0.5 tracking-tight">{inlineMarkdown(line.slice(3))}</p>);
      continue;
    }
    if (line.startsWith('# ')) {
      flushList();
      nodes.push(<p key={key++} className="text-sm font-bold mt-3 mb-0.5 tracking-tight">{inlineMarkdown(line.slice(2))}</p>);
      continue;
    }
    const olMatch = line.match(/^\d+[.)]\s+(.*)/);
    if (olMatch) {
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listBuffer.push(olMatch[1]);
      continue;
    }
    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listBuffer.push(ulMatch[1]);
      continue;
    }
    flushList();
    nodes.push(<p key={key++} className="text-sm leading-relaxed">{inlineMarkdown(line)}</p>);
  }
  flushList();
  return nodes;
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    const italics = part.split(/(\*[^*]+\*)/g);
    if (italics.length > 1) {
      return italics.map((s, j) => {
        if (s.startsWith('*') && s.endsWith('*') && s.length > 2) return <em key={j}>{s.slice(1, -1)}</em>;
        return <span key={j}>{s}</span>;
      });
    }
    return <span key={i}>{part}</span>;
  });
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SESSION_KEY = 'acadflow_chat_session';

// Shape sent to edge function (lean - no internal IDs needed)
interface AssignmentContext {
  id?: string;
  title: string;
  course?: string;
  due_date?: string;
  status: string;
  priority: string;
  description?: string;
}

interface ProjectContext {
  id?: string;
  title: string;
  course?: string;
  due_date?: string;
  status: string;
  priority: string;
  description?: string;
  is_creator: boolean;
  member_count?: number;
}

interface AttachedFile {
  id: string;
  name: string;
  source: 'vault' | 'assignment' | 'project';
  status: 'reading' | 'ready' | 'error';
  text?: string;
  note?: string;
}

// One labelled group of files inside the attachment picker.
function FileGroup({ label, files, attachedIds, onPick }: {
  label: string;
  files: FileRecord[];
  attachedIds: AttachedFile[];
  onPick: (f: FileRecord) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {files.map((f) => {
        const attached = attachedIds.some((a) => a.id === f.id);
        return (
          <button
            key={f.id}
            type="button"
            disabled={attached}
            onClick={() => onPick(f)}
            className="flex w-full items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-left text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate flex-1">{f.name}</span>
            {attached && <span className="text-[11px] text-muted-foreground shrink-0">attached</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function AIAssistant({ dock = false, onClose }: { dock?: boolean; onClose?: () => void } = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'analyzer'>('chat');
  const [planMode, setPlanMode] = useState(false);
  const [attachPickerOpen, setAttachPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentContext[]>([]);
  const [projects, setProjects] = useState<ProjectContext[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => {
    return localStorage.getItem(SESSION_KEY) || crypto.randomUUID();
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const location = useLocation();

  // Page-awareness: tell the model which screen the student is on right now.
  const pageContext = useMemo(() => {
    const path = location.pathname;
    if (path === '/dashboard') return { label: 'the Dashboard (overview of deadlines and stats)' };
    if (path === '/assignments') return { label: 'the My Assignments list' };
    if (path === '/projects') return { label: 'the Team Projects list' };
    if (path === '/files') return { label: 'the My Files library' };
    if (path === '/achievements') return { label: 'the Achievements page' };
    if (path === '/theme') return { label: 'the Theme Customization page' };
    const aMatch = path.match(/^\/assignments\/(.+)$/);
    if (aMatch) {
      const a = assignments.find((x) => x.id === aMatch[1]);
      return { label: 'a specific assignment detail page', entityTitle: a?.title };
    }
    const pMatch = path.match(/^\/projects\/(.+)$/);
    if (pMatch) {
      const p = projects.find((x) => x.id === pMatch[1]);
      return { label: 'a specific team project detail page', entityTitle: p?.title };
    }
    return { label: 'the AI Assistant home page' };
  }, [location.pathname, assignments, projects]);

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, sessionId);
  }, [sessionId]);

  useEffect(() => {
    loadMessages();
    loadFiles();
    loadAssignments();
    loadProjects();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('[AIAssistant] loadMessages:', extractError(err), err);
    }
  }, [sessionId]);

  async function loadFiles() {
    try {
      const { data } = await supabase.from('files').select('*').limit(50);
      setFiles(data || []);
    } catch (err) {
      console.error('[AIAssistant] loadFiles:', extractError(err), err);
    }
  }

  async function loadAssignments() {
    try {
      const { data } = await supabase
        .from('assignments')
        .select('id, title, course, due_date, status, priority, description')
        .order('due_date', { ascending: true })
        .limit(50);
      setAssignments(
        (data || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          course: a.course,
          due_date: a.due_date,
          status: a.status,
          priority: a.priority,
          description: a.description,
        }))
      );
    } catch (err) {
      console.error('[AIAssistant] loadAssignments:', extractError(err), err);
    }
  }

  async function loadProjects() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('projects')
        .select('id, title, course, due_date, status, priority, description, creator_id')
        .order('due_date', { ascending: true })
        .limit(50);

      const projectList = data || [];

      // For each project fetch member count
      const withCounts = await Promise.all(
        projectList.map(async (p: any) => {
          const { count } = await supabase
            .from('project_members')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', p.id);
          return {
            id: p.id,
            title: p.title,
            course: p.course,
            due_date: p.due_date,
            status: p.status,
            priority: p.priority,
            description: p.description,
            is_creator: p.creator_id === user.id,
            member_count: (count ?? 0) + 1, // +1 for creator
          };
        })
      );
      setProjects(withCounts);
    } catch (err) {
      console.error('[AIAssistant] loadProjects:', extractError(err), err);
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setPlanMode(false); // asking a question exits plan mode so the answer is visible

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('You must be logged in'); return; }

      // Save user message with session_id
      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'user',
        content: userMessage,
        session_id: sessionId,
      });

      const optimisticUser: ChatMessage = {
        id: `tmp-${Date.now()}`,
        user_id: user.id,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString(),
        session_id: sessionId,
      };
      setMessages(prev => [...prev, optimisticUser]);

      // Build memory: last 20 messages as rolling context
      const contextHistory = messages.slice(-20);
      const fileContext = files.map(f => ({ name: f.name, file_type: f.file_type }));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: contextHistory,
          fileContext,
          assignmentContext: assignments,
          projectContext: projects,
          pageContext,
          attachments: attachments
            .filter((a) => a.status === 'ready')
            .map((a) => ({ name: a.name, text: a.text, note: a.note })),
          sessionId,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to get AI response');
      }

      let assistantResponse = '';
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let pending = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split('\n');
        pending = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) assistantResponse += text;
            } catch { /* ignore parse errors */ }
          }
        }
      }
      pending += decoder.decode();
      if (pending.startsWith('data: ')) {
        const dataStr = pending.slice(6);
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) assistantResponse += text;
          } catch { /* ignore incomplete final event */ }
        }
      }

      await supabase.from('chat_messages').insert({
        user_id: user.id,
        role: 'assistant',
        content: assistantResponse,
        session_id: sessionId,
      });

      await supabase.rpc('award_points', { p_user_id: user.id, p_action: 'ai_session' });

      setMessages(prev => [
        ...prev,
        {
          id: `tmp-${Date.now() + 1}`,
          user_id: user.id,
          role: 'assistant',
          content: assistantResponse,
          created_at: new Date().toISOString(),
          session_id: sessionId,
        },
      ]);
    } catch (err) {
      const msg = extractError(err);
      console.error('[AIAssistant] handleSend:', msg, err);
      toast.error('Failed to get response: ' + msg);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  async function handleClearChat() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('chat_messages').delete().eq('session_id', sessionId).eq('user_id', user.id);
      const newSession = crypto.randomUUID();
      setSessionId(newSession);
      setMessages([]);
      toast.success('Chat cleared');
    } catch (err) {
      toast.error('Failed to clear chat: ' + extractError(err));
    }
  }

  const readableFiles = files.filter(isReadableFile);

  // Group readable files by where they live so the paperclip picker is scannable.
  const fileGroups = useMemo(() => {
    const aTitle = new Map(assignments.map((a) => [a.id as string, a.title]));
    const pTitle = new Map(projects.map((p) => [p.id as string, p.title]));
    const vault: FileRecord[] = [];
    const byAssignment = new Map<string, FileRecord[]>();
    const byProject = new Map<string, FileRecord[]>();
    for (const f of readableFiles) {
      if (f.assignment_id) {
        const key = aTitle.get(f.assignment_id) || 'Assignment';
        byAssignment.set(key, [...(byAssignment.get(key) || []), f]);
      } else if (f.project_id) {
        const key = pTitle.get(f.project_id) || 'Project';
        byProject.set(key, [...(byProject.get(key) || []), f]);
      } else {
        vault.push(f);
      }
    }
    return { vault, byAssignment, byProject };
  }, [readableFiles, assignments, projects]);

  async function handleAttach(file: FileRecord) {
    setAttachPickerOpen(false);
    if (attachments.some((a) => a.id === file.id)) return;
    const source: AttachedFile['source'] = file.assignment_id ? 'assignment' : file.project_id ? 'project' : 'vault';
    setAttachments((prev) => [...prev, { id: file.id, name: file.name, source, status: 'reading' }]);
    try {
      const res = await runCopilotExtract({
        file: { name: file.name, file_type: file.file_type, mime_type: file.mime_type, url: publicUrlFor(file) },
      });
      const ok = !!res.extracted && !!res.text;
      setAttachments((prev) => prev.map((a) => a.id === file.id
        ? { ...a, status: ok ? 'ready' : 'error', text: res.text, note: res.note || (ok ? undefined : 'contents not readable') }
        : a));
      if (!ok) toast.error(`Couldn't read ${file.name}${res.note ? `: ${res.note}` : ''}`);
    } catch (err) {
      const msg = extractError(err);
      setAttachments((prev) => prev.map((a) => a.id === file.id ? { ...a, status: 'error', note: msg } : a));
      toast.error('Attach failed: ' + msg);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  const isEmpty = messages.length === 0;

  return (
    <div className={dock ? 'flex flex-col h-full min-h-0' : 'flex flex-col h-[calc(100vh-5rem)]'}>
      {/* Header (full page only) */}
      {!dock && (
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full ai-gradient shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-balance">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Your 24/7 academic tutor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Context awareness badges */}
          {assignments.length > 0 && (
            <Badge variant="secondary" className="gap-1 text-xs hidden sm:flex">
              <ClipboardList className="h-3 w-3" />
              {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {projects.length > 0 && (
            <Badge variant="secondary" className="gap-1 text-xs hidden sm:flex">
              <FolderKanban className="h-3 w-3" />
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <div className="flex rounded-md border border-border/60 p-0.5" role="group" aria-label="AI tool">
            <Button variant={mode === 'chat' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('chat')} className="text-xs">
              Chat
            </Button>
            <Button variant={mode === 'analyzer' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('analyzer')} className="text-xs">
              Analyzer
            </Button>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isEmpty}
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear chat
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  All messages in this session will be permanently deleted. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearChat}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear chat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      )}

      {/* Compact header for the global dock */}
      {dock && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ai-gradient">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">AI Assistant</p>
              <p className="text-[11px] text-muted-foreground">Chat & plan mode · Ctrl+K to toggle</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {!dock && mode === 'analyzer' ? <AIAnalyzer /> : <>
      {/* Messages / Plan mode */}
      {planMode ? <CopilotPanel /> : (
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl ai-gradient opacity-90">
              <MessageSquare className="h-7 w-7 text-white" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <p className="text-base font-medium">Start a conversation</p>
              <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
                Ask anything about your work. I have full context of your assignments, projects, and uploaded files.
              </p>
            </div>

            {/* Context summary */}
            {(assignments.length > 0 || projects.length > 0) && (
              <div className="flex flex-wrap gap-2 justify-center">
                {assignments.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
                    <ClipboardList className="h-3 w-3" />
                    {assignments.length} assignment{assignments.length !== 1 ? 's' : ''} loaded
                  </div>
                )}
                {projects.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
                    <FolderKanban className="h-3 w-3" />
                    {projects.length} project{projects.length !== 1 ? 's' : ''} loaded
                  </div>
                )}
              </div>
            )}

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {[
                assignments.length > 0 ? 'What are my upcoming deadlines?' : 'Help me plan my assignments',
                projects.length > 0 ? 'Summarise my team projects' : 'How do I manage team projects?',
                'Explain this concept',
                'Help me study for an exam',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 md:px-8 py-6 space-y-6 max-w-3xl mx-auto w-full">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 opacity-0 intersect:opacity-100 transition duration-300 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ai-gradient mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-foreground text-background rounded-tr-sm'
                      : 'bg-muted/60 rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm leading-relaxed text-pretty">{msg.content}</p>
                  ) : (
                    <div className="space-y-0.5 text-foreground">{renderMarkdown(msg.content)}</div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted border border-border/50 mt-0.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full ai-gradient mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      )}

      {/* Input */}
      <div className="border-t border-border/50 px-4 md:px-8 py-4">
        <div className="max-w-3xl mx-auto">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 text-xs rounded-full border border-border/60 bg-muted/50 px-3 py-1.5">
                  {a.status === 'reading'
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="max-w-[12rem] truncate">{a.name}</span>
                  {a.status === 'error' && <span className="text-destructive">unreadable</span>}
                  <button type="button" onClick={() => removeAttachment(a.id)} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${a.name}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3 focus-within:border-border transition-colors">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Ask me anything... (Enter to send, Shift+Enter for new line)"
              rows={1}
              disabled={loading}
              className="resize-none border-0 p-0 shadow-none focus-visible:ring-0 bg-transparent text-sm min-h-[1.5rem] max-h-40 overflow-y-auto"
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-8 w-8 shrink-0 rounded-xl"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPlanMode((v) => !v)}
                aria-pressed={planMode}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  planMode
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Plan mode
              </button>
              <button
                type="button"
                onClick={() => setAttachPickerOpen(true)}
                disabled={readableFiles.length === 0}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attach a file
              </button>
            </div>
            {planMode && (
              <span className="text-xs text-muted-foreground">Showing your work plan above</span>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground/60 mt-2">
            AI can make mistakes - verify important information
          </p>
        </div>
      </div>
      </>}

      {/* Attachment picker: any readable file, grouped by where it lives */}
      <Dialog open={attachPickerOpen} onOpenChange={setAttachPickerOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md max-h-[70dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-balance">Attach a file</DialogTitle>
            <DialogDescription className="text-pretty">
              Pick a file to ground the chat in its real contents. Then ask "explain this", "summarise it", or "quiz me on it".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {readableFiles.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No readable files yet. Upload a PDF, DOCX, text, or code file.</p>
            ) : (
              <>
                {fileGroups.vault.length > 0 && (
                  <FileGroup label="My Files (vault)" files={fileGroups.vault} attachedIds={attachments} onPick={handleAttach} />
                )}
                {[...fileGroups.byAssignment.entries()].map(([title, fs]) => (
                  <FileGroup key={`a-${title}`} label={`Assignment · ${title}`} files={fs} attachedIds={attachments} onPick={handleAttach} />
                ))}
                {[...fileGroups.byProject.entries()].map(([title, fs]) => (
                  <FileGroup key={`p-${title}`} label={`Project · ${title}`} files={fs} attachedIds={attachments} onPick={handleAttach} />
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


