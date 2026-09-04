import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import type { Project, FileRecord, ProjectMember } from '@/types';
import { ArrowLeft, Upload, FileText, Image, File as FileIcon, Download, Trash2, Edit, Eye, Users, UserPlus, X, Loader2, Sparkles, ListChecks, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { formatRelativeTime, extractError } from '@/lib/activity';
import { runCopilotExplain, runCopilotDelegate, publicUrlFor, isReadableFile } from '@/lib/copilot';
import type { CopilotExplanation, CopilotDelegateResult } from '@/lib/copilot';
import { Checkbox } from '@/components/ui/checkbox';

interface ProjectTask {
  id: string;
  project_id: string;
  assignee_id: string;
  title: string;
  detail?: string;
  done: boolean;
  source: string;
  created_at: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [unlinkedFiles, setUnlinkedFiles] = useState<FileRecord[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [linkFilesDialogOpen, setLinkFilesDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [explainFile, setExplainFile] = useState<FileRecord | null>(null);
  const [explanation, setExplanation] = useState<CopilotExplanation | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [memberUsernames, setMemberUsernames] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [delegating, setDelegating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [delegatePreview, setDelegatePreview] = useState<CopilotDelegateResult | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  useEffect(() => {
    if (id) {
      loadProject();
      loadFiles();
      loadMembers();
      loadUnlinkedFiles();
      loadTasks();
      loadCurrentUser();
    }
  }, [id]);

  useEffect(() => {
    loadMemberUsernames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, project?.creator_id]);

  async function loadProject() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      const msg = extractError(error);
      console.error('[ProjectDetail] Failed to load project:', msg, error);
      toast.error('Failed to load project: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles() {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('project_id', id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      const msg = extractError(error);
      console.error('[ProjectDetail] Failed to load files:', msg, error);
    }
  }

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', id)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      const msg = extractError(error);
      console.error('[ProjectDetail] Failed to load members:', msg, error);
    }
  }

  async function loadUnlinkedFiles() {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .is('assignment_id', null)
        .is('project_id', null)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setUnlinkedFiles(data || []);
    } catch (error) {
      const msg = extractError(error);
      console.error('[ProjectDetail] Failed to load unlinked files:', msg, error);
    }
  }

  async function handleInviteMember() {
    const input = inviteEmail.trim().toLowerCase();
    if (!input) return;

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(input)) {
      toast.error('Username can only contain letters, numbers, and underscores.');
      return;
    }

    setInviting(true);
    try {
      const { data: profileRows, error: profileError } = await supabase
        .rpc('find_user_by_email', { p_email: input });

      if (profileError) throw profileError;

      const profile = Array.isArray(profileRows) && profileRows.length > 0 ? profileRows[0] : null;

      if (!profile) {
        toast.error(`No AcadFlow account found for username "${input}". They must sign up first.`);
        return;
      }

      // Check for duplicate membership
      const { data: existing } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', id)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) {
        toast.info(`${profile.username || input} is already a member of this project.`);
        return;
      }

      const { error: insertError } = await supabase.from('project_members').insert({
        project_id: id,
        user_id: profile.id,
        email: profile.email || `${profile.username}@acadflow.app`,
      });

      if (insertError) throw insertError;

      toast.success(`${profile.username || input} added to the project.`);
      setInviteEmail('');
      setInviteDialogOpen(false);
      loadMembers();
    } catch (err) {
      const msg = extractError(err);
      console.error('[ProjectDetail] Invite error:', msg, err);
      toast.error('Failed to add member: ' + msg);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(memberId: string, memberEmail: string) {
    try {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      toast.success(`${memberEmail} removed from the project.`);
      loadMembers();
    } catch (err) {
      const msg = extractError(err);
      console.error('[ProjectDetail] Remove member error:', msg, err);
      toast.error('Failed to remove member: ' + msg);
    }
  }

  async function handleLinkFile(fileId: string) {
    try {
      const { error } = await supabase
        .from('files')
        .update({ project_id: id })
        .eq('id', fileId);

      if (error) throw error;

      toast.success('File linked to project');
      loadFiles();
      loadUnlinkedFiles();
    } catch (error) {
      const msg = extractError(error);
      console.error('[ProjectDetail] Failed to link file:', msg, error);
      toast.error('Failed to link file: ' + msg);
    }
  }

  async function uploadOne(file: File, userId: string) {
      // Detect MIME type from file extension if browser doesn't provide it
      let mimeType = file.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const mimeMap: Record<string, string> = {
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'pdf': 'application/pdf',
          'txt': 'text/plain',
          'md': 'text/markdown',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          // Code files
          'py': 'text/x-python',
          'ipynb': 'application/x-ipynb+json',
          'java': 'text/x-java',
          'cpp': 'text/x-c++',
          'c': 'text/x-c',
          'h': 'text/x-c',
          'hpp': 'text/x-c++',
          'js': 'text/javascript',
          'ts': 'text/typescript',
          'jsx': 'text/javascript',
          'tsx': 'text/typescript',
          'json': 'application/json',
          'xml': 'text/xml',
          'html': 'text/html',
          'css': 'text/css',
        };
        mimeType = ext ? (mimeMap[ext] || 'application/octet-stream') : 'application/octet-stream';
      }

      // Store all files in my-files folder (same location as My Files page)
      const fileName = `my-files/${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(fileName, file, {
          contentType: mimeType,
        });

      if (uploadError) throw uploadError;

      // Determine file type category
      let fileType = 'document';
      if (mimeType.startsWith('image/')) {
        fileType = 'image';
      } else if (mimeType.startsWith('video/')) {
        fileType = 'video';
      } else if (mimeType.startsWith('audio/')) {
        fileType = 'audio';
      } else if (
        mimeType.startsWith('text/x-') || 
        mimeType === 'application/x-ipynb+json' ||
        mimeType === 'text/javascript' ||
        mimeType === 'text/typescript' ||
        mimeType === 'application/json'
      ) {
        fileType = 'code';
      } else if (mimeType.startsWith('text/')) {
        fileType = 'text';
      } else if (mimeType.startsWith('application/')) {
        fileType = 'application';
      }

      // Insert file record into database
      const { error: dbError } = await supabase.from('files').insert({
        user_id: userId,
        name: file.name,
        file_path: fileName,
        file_type: fileType,
        file_size: file.size,
        mime_type: mimeType,
        project_id: id,
      });

      if (dbError) {
        console.error('Database insert error:', dbError);
        console.error('Error details:', JSON.stringify(dbError, null, 2));
        throw new Error(dbError.message || 'Failed to insert file record');
      }

  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || []);
    if (!list.length) return;
    if (list.length > 5) {
      toast.error('You can upload up to 5 files at a time');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('You must be logged in'); return; }
      let okCount = 0;
      const failed: string[] = [];
      for (const file of list) {
        if (file.size > 10 * 1024 * 1024) { failed.push(`${file.name} (over 10 MB)`); continue; }
        try {
          await uploadOne(file, user.id);
          okCount++;
        } catch (err) {
          console.error('[ProjectDetail] upload one:', extractError(err), err);
          failed.push(file.name);
        }
      }
      if (okCount > 0) { toast.success(`${okCount} file${okCount > 1 ? 's' : ''} uploaded`); await loadFiles(); }
      if (failed.length) toast.error(`Couldn't upload: ${failed.join(', ')}`);
    } catch (error: any) {
      const uploadMsg = extractError(error);
      console.error('[ProjectDetail] Upload error:', uploadMsg, error);
      toast.error('Failed to upload: ' + uploadMsg);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleOpenFile(file: FileRecord) {
    // For text files, open in editor
    if (file.mime_type?.startsWith('text/') || file.mime_type === 'application/json') {
      try {
        const { data, error } = await supabase.storage
          .from('user-files')
          .download(file.file_path);

        if (error) throw error;

        const text = await data.text();
        setFileContent(text);
        setEditingFile(file);
        setEditDialogOpen(true);
      } catch (error) {
        const msg = extractError(error);
        console.error('[ProjectDetail] Failed to open file:', msg, error);
        toast.error('Failed to open file: ' + msg);
      }
    } 
    // For viewable files (images, PDFs, videos), open in new tab
    else if (
      file.mime_type?.startsWith('image/') || 
      file.mime_type === 'application/pdf' ||
      file.mime_type?.startsWith('video/')
    ) {
      try {
        const { data } = supabase.storage
          .from('user-files')
          .getPublicUrl(file.file_path, {
            download: false, // Don't force download
          });

        window.open(data.publicUrl, '_blank');
      } catch (error) {
        const msg = extractError(error);
        console.error('[ProjectDetail] Failed to open file:', msg, error);
        toast.error('Failed to open file: ' + msg);
      }
    }
    // For other files (Office docs, etc.), download them
    else {
      toast.info('This file type cannot be viewed in browser. Downloading instead.');
      handleDownload(file);
    }
  }

  async function handleSaveFile() {
    if (!editingFile) return;

    try {
      const blob = new Blob([fileContent], { type: editingFile.mime_type || 'text/plain' });
      
      const { error } = await supabase.storage
        .from('user-files')
        .update(editingFile.file_path, blob, {
          contentType: editingFile.mime_type || 'text/plain',
          upsert: true,
        });

      if (error) throw error;

      // Award coins for file edit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('award_coins_for_file_edit', {
          p_user_id: user.id,
          p_coins_amount: 2,
        });
        
        // Check for new badges
        const { data: newBadges } = await supabase.rpc('check_and_award_badges', {
          p_user_id: user.id,
        });
        
        toast.success('File saved successfully! +2 coins');
        
        // Show badge notifications
        if (newBadges && newBadges.length > 0) {
          newBadges.forEach((badge: any) => {
            toast.success(`Badge Unlocked: ${badge.badge_name}!`, {
              description: badge.badge_description,
              duration: 5000,
            });
          });
        }
      } else {
        toast.success('File saved successfully');
      }
      
      setEditDialogOpen(false);
    } catch (error) {
      const msg = extractError(error);
      console.error('[ProjectDetail] Save error:', msg, error);
      toast.error('Failed to save file: ' + msg);
    }
  }

  async function handleDownload(file: FileRecord) {
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const msg = extractError(error);
      console.error('[ProjectDetail] Download error:', msg, error);
      toast.error('Failed to download file: ' + msg);
    }
  }

  async function handleDelete(file: FileRecord) {
    try {
      await supabase.storage.from('user-files').remove([file.file_path]);
      await supabase.from('files').delete().eq('id', file.id);
      toast.success('File deleted');
      loadFiles();
    } catch (error) {
      const msg = extractError(error);
      console.error('[ProjectDetail] Delete error:', msg, error);
      toast.error('Failed to delete file: ' + msg);
    }
  }

  async function handleExplain(file: FileRecord) {
    setExplainFile(file);
    setExplanation(null);
    setExplainError('');
    setExplainDialogOpen(true);
    setExplaining(true);
    try {
      const result = await runCopilotExplain({
        file: {
          name: file.name,
          file_type: file.file_type,
          mime_type: file.mime_type,
          url: publicUrlFor(file),
          assignment_title: project?.title,
        },
        assignment: project
          ? { title: project.title, course: project.course, due_date: project.due_date, description: project.description }
          : undefined,
      });
      setExplanation(result);
    } catch (err) {
      const msg = extractError(err);
      console.error('[ProjectDetail] Explain error:', msg, err);
      setExplainError(msg);
    } finally {
      setExplaining(false);
    }
  }

  async function loadCurrentUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    } catch (err) {
      console.error('[ProjectDetail] loadCurrentUser:', err);
    }
  }

  async function loadMemberUsernames() {
    const ids = Array.from(new Set([...members.map((m) => m.user_id), ...(project?.creator_id ? [project.creator_id] : [])]));
    if (!ids.length) { setMemberUsernames({}); return; }
    const map: Record<string, string> = {};
    try {
      const { data, error } = await supabase.rpc('get_usernames_by_ids', { p_ids: ids });
      if (error) throw error;
      (data || []).forEach((p: any) => { if (p.username) map[p.id] = p.username; });
    } catch (err) {
      console.error('[ProjectDetail] get_usernames_by_ids unavailable:', err);
    }
    // Fill gaps (or the whole map if the RPC/migration isn't deployed yet) from
    // the stored member email local-part, which for username-only accounts is
    // the AcadFlow username.
    members.forEach((m) => {
      if (!map[m.user_id]) map[m.user_id] = (m.email || '').split('@')[0] || 'teammate';
    });
    if (project?.creator_id && !map[project.creator_id]) map[project.creator_id] = 'lead';
    setMemberUsernames(map);
  }

  async function loadTasks() {
    try {
      const { data } = await supabase.from('project_tasks').select('*').eq('project_id', id).order('created_at', { ascending: true });
      setTasks(data || []);
    } catch (err) {
      console.error('[ProjectDetail] loadTasks:', err);
    }
  }

  async function handleDelegate() {
    if (!project) return;
    setDelegating(true);
    setDelegatePreview(null);
    try {
      const fileRefs = files.filter(isReadableFile).slice(0, 6).map((f) => ({ name: f.name, file_type: f.file_type, mime_type: f.mime_type, url: publicUrlFor(f) }));
      const result = await runCopilotDelegate({
        project: { title: project.title, course: project.course, due_date: project.due_date, description: project.description },
        members: memberListForAI,
        files: fileRefs,
      });
      setDelegatePreview(result);
    } catch (err) {
      toast.error('Divide work failed: ' + extractError(err));
    } finally {
      setDelegating(false);
    }
  }

  async function handleAssignPreview() {
    const assignments = delegatePreview?.assignments || [];
    setAssigning(true);
    try {
      const rowsToInsert: { project_id: string; assignee_id: string; title: string; detail?: string; source: string }[] = [];
      for (const a of assignments) {
        const uid = usernameToId[a.username];
        if (!uid) continue;
        for (const t of a.tasks || []) {
          if (!t.title) continue;
          rowsToInsert.push({ project_id: id!, assignee_id: uid, title: t.title, detail: t.detail, source: 'ai-copilot' });
        }
      }
      if (!rowsToInsert.length) { toast.error('No suggested tasks matched your current team.'); return; }
      const { error } = await supabase.from('project_tasks').insert(rowsToInsert);
      if (error) throw error;
      toast.success(`Assigned ${rowsToInsert.length} tasks across the team.`);
      setDelegatePreview(null);
      await loadTasks();
    } catch (err) {
      toast.error('Failed to assign tasks: ' + extractError(err));
    } finally {
      setAssigning(false);
    }
  }

  async function toggleTask(t: ProjectTask) {
    const next = !t.done;
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: next } : x)));
    const { error } = await supabase.from('project_tasks').update({ done: next }).eq('id', t.id);
    if (error) { toast.error('Failed to update task'); loadTasks(); }
  }

  async function addTask() {
    const title = newTaskTitle.trim();
    if (!title) return;
    const assignee = isLead ? (newTaskAssignee || rows[0]?.id) : currentUserId;
    if (!assignee) { toast.error('Choose a teammate first.'); return; }
    const { error } = await supabase.from('project_tasks').insert({ project_id: id, assignee_id: assignee, title, source: 'manual' });
    if (error) { toast.error('Failed to add task: ' + extractError(error)); return; }
    setNewTaskTitle('');
    loadTasks();
  }

  async function deleteTask(t: ProjectTask) {
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    const { error } = await supabase.from('project_tasks').delete().eq('id', t.id);
    if (error) { toast.error('Failed to delete task'); loadTasks(); }
  }

  function getFileIcon(type: string) {
    if (type === 'image') return Image;
    if (type === 'application') return FileText;
    return FileIcon;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  if (loading) {
    return <div className="space-y-6"><p>Loading project...</p></div>;
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <Card className="p-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Project not found</p>
          </div>
        </Card>
      </div>
    );
  }

  const isLead = !!project && !!currentUserId && project.creator_id === currentUserId;
  const rows: { id: string; username: string }[] = members.map((m) => ({ id: m.user_id, username: memberUsernames[m.user_id] || 'teammate' }));
  if (project?.creator_id && !members.some((m) => m.user_id === project.creator_id)) {
    rows.unshift({ id: project.creator_id, username: memberUsernames[project.creator_id] || 'lead' });
  }
  const usernameToId: Record<string, string> = {};
  rows.forEach((r) => { usernameToId[r.username] = r.id; });
  const memberListForAI = rows.map((r) => ({ username: r.username, is_lead: r.id === project?.creator_id }));

  // "Team Members" card rows. The lead (project creator) is not stored in
  // project_members, so surface them explicitly and always show them to everyone.
  // A teammate does not see their own row (they already know they're a member);
  // the lead sees the full roster.
  const creatorId = project?.creator_id;
  const teamRows: { key: string; userId: string; name: string; isLead: boolean; memberRowId?: string; joinedAt?: string; email?: string }[] = [];
  if (creatorId) {
    teamRows.push({ key: `lead-${creatorId}`, userId: creatorId, name: memberUsernames[creatorId] || 'lead', isLead: true });
  }
  members.forEach((m) => {
    if (creatorId && m.user_id === creatorId) return; // lead already listed above
    teamRows.push({
      key: m.id,
      userId: m.user_id,
      name: memberUsernames[m.user_id] || (m.email || '').split('@')[0] || 'teammate',
      isLead: false,
      memberRowId: m.id,
      joinedAt: m.joined_at,
      email: m.email,
    });
  });
  const visibleTeamRows = teamRows.filter((r) => isLead || r.userId !== currentUserId);

  const isTextFile = (file: FileRecord) => 
    file.mime_type?.startsWith('text/') || 
    file.mime_type === 'application/json' ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.txt');

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/projects')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Projects
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 min-w-0 space-y-2">
              <CardTitle className="text-2xl text-balance">{project.title}</CardTitle>
              {project.course && (
                <CardDescription className="text-pretty">{project.course}</CardDescription>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={project.status} />
              <PriorityBadge priority={project.priority} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1 text-pretty">{project.description}</p>
            </div>
          )}
          
          <div className="grid gap-4 md:grid-cols-3">
            {project.due_date && (
              <div>
                <Label className="text-sm font-medium">Due Date</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(project.due_date).toLocaleDateString()}
                </p>
              </div>
            )}
            {project.weightage && (
              <div>
                <Label className="text-sm font-medium">Weightage</Label>
                <p className="text-sm text-muted-foreground mt-1">{project.weightage}%</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {formatRelativeTime(project.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-balance">
                <Users className="h-5 w-5" />
                Team Members ({visibleTeamRows.length})
              </CardTitle>
              <CardDescription className="text-pretty mt-1">People collaborating on this project</CardDescription>
            </div>
            <Dialog open={inviteDialogOpen} onOpenChange={(open) => { setInviteDialogOpen(open); if (!open) setInviteEmail(''); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="shrink-0">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite a Team Member</DialogTitle>
                  <DialogDescription>
                    Enter the unique AcadFlow username of an existing account. They will be added immediately.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-email">AcadFlow username</Label>
                    <Input
                      id="invite-email"
                      type="text"
                      placeholder="e.g. alex"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleInviteMember(); }}
                      autoComplete="off"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleInviteMember}
                      disabled={inviting || !inviteEmail.trim()}
                    >
                      {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {inviting ? 'Adding...' : 'Add Member'}
                    </Button>
                    <Button variant="outline" onClick={() => { setInviteDialogOpen(false); setInviteEmail(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {visibleTeamRows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No team members yet.</p>
              <p className="text-xs text-muted-foreground">Use the Invite button to add collaborators by AcadFlow username.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleTeamRows.map((r) => (
                <div key={r.key} className="flex items-center justify-between rounded-lg border p-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      {r.isLead && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Lead</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.isLead ? 'Project creator' : r.joinedAt ? `Joined ${formatRelativeTime(r.joinedAt)}` : ''}
                    </p>
                  </div>
                  {!r.isLead && isLead && r.memberRowId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMember(r.memberRowId as string, r.email || r.name)}
                      title="Remove member"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <p className="pt-2 text-center text-xs text-muted-foreground">
                  Use the Invite button to add collaborators by AcadFlow username.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-balance">
                <ListChecks className="h-5 w-5" />
                Team Tasks
              </CardTitle>
              <CardDescription className="text-pretty mt-1">
                {isLead
                  ? "You are the lead - you see everyone's tasks. Teammates see only their own."
                  : 'Your personal tasks for this project.'}
              </CardDescription>
            </div>
            {isLead && (
              <Button size="sm" variant="outline" className="shrink-0" onClick={handleDelegate} disabled={delegating || rows.length === 0}>
                {delegating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {delegating ? 'Dividing work...' : 'Divide work with AI'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {delegatePreview && (
            <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
              <p className="text-sm font-medium text-balance">Suggested division of work</p>
              {delegatePreview.summary && <p className="text-xs text-muted-foreground text-pretty">{delegatePreview.summary}</p>}
              <div className="space-y-3">
                {(delegatePreview.assignments || []).map((a) => (
                  <div key={a.username} className="space-y-1">
                    <p className="text-sm font-medium">
                      {a.username}
                      {!usernameToId[a.username] && <span className="text-xs text-muted-foreground"> (not in team)</span>}
                      {a.focus ? <span className="text-xs font-normal text-muted-foreground"> — {a.focus}</span> : null}
                    </p>
                    <ul className="space-y-0.5">
                      {(a.tasks || []).map((t, i) => (
                        <li key={i} className="flex gap-2 text-xs text-muted-foreground"><span className="shrink-0">-</span><span>{t.title}{t.detail ? ` (${t.detail})` : ''}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setDelegatePreview(null)}>Discard</Button>
                <Button size="sm" onClick={handleAssignPreview} disabled={assigning}>
                  {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Assign to team
                </Button>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No teammates yet - invite members to divide work.</p>
          ) : isLead ? (
            <div className="space-y-4">
              {rows.map((r) => {
                const mine = tasks.filter((t) => t.assignee_id === r.id);
                const done = mine.filter((t) => t.done).length;
                return (
                  <div key={r.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{r.username}{r.id === project?.creator_id ? ' (lead)' : ''}</p>
                      <span className="text-xs text-muted-foreground">{done}/{mine.length} done</span>
                    </div>
                    {mine.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No tasks yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {mine.map((t) => (
                          <div key={t.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5">
                            <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t)} aria-label={`Toggle ${t.title}`} />
                            <span className={`flex-1 text-sm ${t.done ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteTask(t)} title="Delete task">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No tasks assigned to you yet.</p>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5">
                    <Checkbox checked={t.done} onCheckedChange={() => toggleTask(t)} aria-label={`Toggle ${t.title}`} />
                    <span className={`flex-1 text-sm ${t.done ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteTask(t)} title="Delete task">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }}
              placeholder={isLead ? 'Add a task for a teammate...' : 'Add a task for yourself...'}
            />
            {isLead && (
              <select
                value={newTaskAssignee || rows[0]?.id || ''}
                onChange={(e) => setNewTaskAssignee(e.target.value)}
                className="h-9 shrink-0 rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Assign to"
              >
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>{r.username}</option>
                ))}
              </select>
            )}
            <Button size="sm" variant="outline" className="shrink-0" onClick={addTask} disabled={!newTaskTitle.trim()}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-balance">Project Files</CardTitle>
              <CardDescription className="text-pretty">Upload and manage files for this project</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={linkFilesDialogOpen} onOpenChange={setLinkFilesDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FileIcon className="mr-2 h-4 w-4" />
                    Link Existing Files
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Link Files from My Files</DialogTitle>
                    <DialogDescription>
                      Select files from your library to link to this project
                    </DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {unlinkedFiles.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No unlinked files available
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {unlinkedFiles.map((file) => {
                          const Icon = getFileIcon(file.file_type);
                          return (
                            <div key={file.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.file_size)} â€¢ {formatRelativeTime(file.uploaded_at)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  handleLinkFile(file.id);
                                  setLinkFilesDialogOpen(false);
                                }}
                              >
                                Link
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
                multiple
              />
              <Button asChild disabled={uploading}>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload File'}
                </label>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-muted-foreground">No files uploaded yet</p>
              <p className="text-sm text-muted-foreground text-pretty">Upload files to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const Icon = getFileIcon(file.file_type);
                const canEdit = isTextFile(file);
                
                return (
                  <div key={file.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)} â€¢ {formatRelativeTime(file.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isReadableFile(file) && (
                        <Button size="icon" variant="ghost" onClick={() => handleExplain(file)} title="Explain with AI">
                          <Sparkles className="h-4 w-4" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button size="icon" variant="ghost" onClick={() => handleOpenFile(file)} title="Open & Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {!canEdit && (
                        <Button size="icon" variant="ghost" onClick={() => handleOpenFile(file)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => handleDownload(file)} title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(file)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-4xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-balance">Edit File: {editingFile?.name}</DialogTitle>
            <DialogDescription className="text-pretty">
              Make changes to your file and save when done. All team members will see your changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFile}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={explainDialogOpen} onOpenChange={setExplainDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-balance">Explain: {explainFile?.name}</DialogTitle>
            <DialogDescription className="text-pretty">
              What this file requires of you, the key points, and what's easy to miss.
            </DialogDescription>
          </DialogHeader>
          {explaining ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Reading the file and preparing an explanation...
            </div>
          ) : explainError ? (
            <p className="py-4 text-sm text-destructive">{explainError}</p>
          ) : explanation ? (
            <div className="space-y-4">
              {explanation.whatIsRequired && (
                <div>
                  <Label className="text-sm font-medium">What is required</Label>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">{explanation.whatIsRequired}</p>
                </div>
              )}
              {explanation.keyPoints && explanation.keyPoints.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Key points</Label>
                  <ul className="mt-1 space-y-1">
                    {explanation.keyPoints.map((k, i) => (
                      <li key={i} className="flex gap-2 text-sm text-muted-foreground"><span className="shrink-0">-</span><span>{k}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {explanation.easyToMiss && explanation.easyToMiss.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Easy to miss</Label>
                  <ul className="mt-1 space-y-1">
                    {explanation.easyToMiss.map((k, i) => (
                      <li key={i} className="flex gap-2 text-sm text-amber-600 dark:text-amber-400"><span className="shrink-0">!</span><span>{k}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {explanation.actionItems && explanation.actionItems.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Next actions</Label>
                  <ol className="mt-1 list-decimal list-inside space-y-1">
                    {explanation.actionItems.map((k, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{k}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}


