import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/db/supabase';
import type { Assignment, FileRecord, Subtask } from '@/types';
import { ArrowLeft, Upload, FileText, Image, File as FileIcon, Download, Trash2, Edit, Eye, Code, Sparkles, ListChecks, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { StatusBadge, PriorityBadge } from '@/components/shared/Badges';
import { formatRelativeTime, extractError } from '@/lib/activity';
import { runCopilotExplain, publicUrlFor, isReadableFile, tokenOverlapScore } from '@/lib/copilot';
import type { CopilotExplanation } from '@/lib/copilot';

// The subtasks column may arrive as JSONB (array), a JSON string, or null
// depending on how it was created - always coerce to a safe array.
function asSubtasks(value: unknown): Subtask[] {
  if (Array.isArray(value)) return value as Subtask[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as Subtask[];
    } catch { /* fall through */ }
  }
  return [];
}

export default function AssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [unlinkedFiles, setUnlinkedFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [linkFilesDialogOpen, setLinkFilesDialogOpen] = useState(false);

  // AI Copilot: per-file explanation
  const [explainFile, setExplainFile] = useState<FileRecord | null>(null);
  const [explanation, setExplanation] = useState<CopilotExplanation | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState('');
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);
  // Sub-tasks checklist
  const [newSubtask, setNewSubtask] = useState('');
  const [savingSubtasks, setSavingSubtasks] = useState(false);

  useEffect(() => {
    if (id) {
      loadAssignment();
      loadFiles();
      loadUnlinkedFiles();
    }
  }, [id]);

  async function loadAssignment() {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setAssignment(data);
    } catch (error) {
      const msg = extractError(error);
      console.error('[AssignmentDetail] Failed to load assignment:', msg, error);
      toast.error('Failed to load assignment: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadFiles() {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('assignment_id', id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      const msg = extractError(error);
      console.error('[AssignmentDetail] Failed to load files:', msg, error);
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
      console.error('[AssignmentDetail] Failed to load unlinked files:', msg, error);
    }
  }

  async function handleLinkFile(fileId: string) {
    try {
      const { error } = await supabase
        .from('files')
        .update({ assignment_id: id })
        .eq('id', fileId);

      if (error) throw error;

      toast.success('File linked to assignment');
      loadFiles();
      loadUnlinkedFiles();
    } catch (error) {
      const msg = extractError(error);
      console.error('[AssignmentDetail] Failed to link file:', msg, error);
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
        assignment_id: id,
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
          console.error('[AssignmentDetail] upload one:', extractError(err), err);
          failed.push(file.name);
        }
      }
      if (okCount > 0) { toast.success(`${okCount} file${okCount > 1 ? 's' : ''} uploaded`); await loadFiles(); }
      if (failed.length) toast.error(`Couldn't upload: ${failed.join(', ')}`);
    } catch (error: any) {
      const uploadMsg = extractError(error);
      console.error('[AssignmentDetail] Upload error:', uploadMsg, error);
      toast.error('Failed to upload: ' + uploadMsg);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleOpenFile(file: FileRecord) {
    // For text files and code files, open in editor
    if (
      file.mime_type?.startsWith('text/') || 
      file.mime_type === 'application/json' ||
      file.mime_type === 'application/x-ipynb+json'
    ) {
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
        console.error('[AssignmentDetail] Failed to open file:', msg, error);
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
        console.error('[AssignmentDetail] Failed to open file:', msg, error);
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
      console.error('[AssignmentDetail] Save error:', msg, error);
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
      console.error('[AssignmentDetail] Download error:', msg, error);
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
      console.error('[AssignmentDetail] Delete error:', msg, error);
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
          assignment_title: assignment?.title,
        },
        assignment: assignment
          ? { title: assignment.title, course: assignment.course, description: assignment.description, due_date: assignment.due_date }
          : undefined,
      });
      setExplanation(result);
    } catch (error) {
      const msg = extractError(error);
      console.error('[AssignmentDetail] Explain error:', msg, error);
      setExplainError(msg);
      toast.error('Failed to explain file: ' + msg);
    } finally {
      setExplaining(false);
    }
  }

  async function persistSubtasks(next: Subtask[]) {
    if (!assignment) return;
    setSavingSubtasks(true);
    setAssignment({ ...assignment, subtasks: next });
    const { error } = await supabase
      .from('assignments')
      .update({ subtasks: next })
      .eq('id', assignment.id);
    setSavingSubtasks(false);
    if (error) {
      const msg = extractError(error);
      console.error('[AssignmentDetail] persistSubtasks:', msg, error);
      toast.error('Failed to save sub-tasks: ' + msg);
      loadAssignment();
    }
  }

  async function toggleSubtask(subtaskId: string) {
    const current = asSubtasks(assignment?.subtasks);
    await persistSubtasks(current.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)));
  }

  async function removeSubtask(subtaskId: string) {
    const current = asSubtasks(assignment?.subtasks);
    await persistSubtasks(current.filter((s) => s.id !== subtaskId));
  }

  async function addSubtask() {
    const text = newSubtask.trim();
    if (!text) return;
    const current = asSubtasks(assignment?.subtasks);
    const next: Subtask[] = [
      ...current,
      { id: crypto.randomUUID(), text, done: false, source: 'manual', created_at: new Date().toISOString() },
    ];
    setNewSubtask('');
    await persistSubtasks(next);
  }

  function getFileIcon(type: string) {
    if (type === 'image') return Image;
    if (type === 'code') return Code;
    if (type === 'text') return FileText;
    if (type === 'application') return FileText;
    return FileIcon;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  if (loading) {
    return <div className="space-y-6"><p>Loading assignment...</p></div>;
  }

  if (!assignment) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/assignments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assignments
        </Button>
        <Card className="p-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Assignment not found</p>
          </div>
        </Card>
      </div>
    );
  }

  const subtasks = asSubtasks(assignment.subtasks);
  const doneCount = subtasks.filter((s) => s.done).length;

  // Suggest vault files whose names share keywords with this assignment.
  const suggestedFiles = unlinkedFiles
    .map((f) => ({ file: f, rel: tokenOverlapScore(f.name, `${assignment.title} ${assignment.course || ''}`) }))
    .filter((x) => x.rel.score > 0)
    .sort((a, b) => b.rel.score - a.rel.score)
    .slice(0, 4);

  const isTextFile = (file: FileRecord) => 
    file.mime_type?.startsWith('text/') || 
    file.mime_type === 'application/json' ||
    file.mime_type === 'application/x-ipynb+json' ||
    file.name.endsWith('.md') ||
    file.name.endsWith('.txt') ||
    file.name.endsWith('.py') ||
    file.name.endsWith('.ipynb') ||
    file.name.endsWith('.java') ||
    file.name.endsWith('.cpp') ||
    file.name.endsWith('.c') ||
    file.name.endsWith('.h');

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/assignments')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Assignments
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 min-w-0 space-y-2">
              <CardTitle className="text-2xl text-balance">{assignment.title}</CardTitle>
              {assignment.course && (
                <CardDescription className="text-pretty">{assignment.course}</CardDescription>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={assignment.status} />
              <PriorityBadge priority={assignment.priority} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignment.description && (
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1 text-pretty">{assignment.description}</p>
            </div>
          )}
          
          <div className="grid gap-4 md:grid-cols-3">
            {assignment.due_date && (
              <div>
                <Label className="text-sm font-medium">Due Date</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(assignment.due_date).toLocaleDateString()}
                </p>
              </div>
            )}
            {assignment.weightage && (
              <div>
                <Label className="text-sm font-medium">Weightage</Label>
                <p className="text-sm text-muted-foreground mt-1">{assignment.weightage}%</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium">Created</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {formatRelativeTime(assignment.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-balance">Assignment Files</CardTitle>
              <CardDescription className="text-pretty">Upload and manage files for this assignment</CardDescription>
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
                      Select files from your library to link to this assignment
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
          {suggestedFiles.length > 0 && (
            <div className="mb-4 space-y-2 rounded-lg border border-dashed border-border/70 bg-muted/30 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Relevant files from your vault
              </p>
              {suggestedFiles.map(({ file, rel }) => (
                <div key={file.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      matches: {rel.matched.slice(0, 3).join(', ')}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleLinkFile(file.id)}>
                    Link
                  </Button>
                </div>
              ))}
            </div>
          )}
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
                      {isReadableFile(file) && (
                        <Button size="icon" variant="ghost" onClick={() => handleExplain(file)} title="Explain with AI">
                          <Sparkles className="h-4 w-4" />
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-balance flex items-center gap-2">
                <ListChecks className="h-4 w-4" /> Sub-tasks
              </CardTitle>
              <CardDescription className="text-pretty">
                Break this assignment into steps. Use the AI Assistant Planner to auto-generate them.
              </CardDescription>
            </div>
            {subtasks.length > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {doneCount}/{subtasks.length} done
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {subtasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-pretty py-2">
              No sub-tasks yet. Open AI Assistant &rarr; Planner to generate a plan, or add your own below.
            </p>
          ) : (
            <ul className="space-y-2">
              {subtasks.map((s) => (
                <li key={s.id} className="flex items-start gap-3 rounded-lg border p-3 group">
                  <Checkbox
                    id={`subtask-${s.id}`}
                    checked={s.done}
                    onCheckedChange={() => toggleSubtask(s.id)}
                    className="mt-0.5"
                    disabled={savingSubtasks}
                  />
                  <label
                    htmlFor={`subtask-${s.id}`}
                    className={`flex-1 min-w-0 text-sm cursor-pointer text-pretty ${s.done ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {s.text}
                    {s.source === 'ai-copilot' && (
                      <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 align-middle">AI</Badge>
                    )}
                  </label>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSubtask(s.id)}
                    title="Remove sub-task"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
              placeholder="Add a sub-task and press Enter"
              className="text-sm"
              disabled={savingSubtasks}
            />
            <Button onClick={addSubtask} disabled={savingSubtasks || !newSubtask.trim()} size="sm" className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-4xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-balance">Edit File: {editingFile?.name}</DialogTitle>
            <DialogDescription className="text-pretty">
              Make changes to your file and save when done
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
            <DialogTitle className="text-balance flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {explainFile?.name ? `Explain: ${explainFile.name}` : 'Explain file'}
            </DialogTitle>
            <DialogDescription className="text-pretty">
              AI breakdown of what this file requires for the assignment.
            </DialogDescription>
          </DialogHeader>
          {explaining && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Reading and analysing the file...
            </div>
          )}
          {explainError && !explaining && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive text-pretty">
              {explainError}
            </div>
          )}
          {explanation && !explaining && (
            <div className="space-y-4">
              {explanation.whatIsRequired && (
                <div>
                  <Label className="text-sm font-medium">What is required</Label>
                  <p className="text-sm text-muted-foreground mt-1 text-pretty">{explanation.whatIsRequired}</p>
                </div>
              )}
              {explanation.keyPoints && explanation.keyPoints.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Key points</Label>
                  <ul className="mt-1 space-y-1">
                    {explanation.keyPoints.map((k, i) => (
                      <li key={i} className="flex gap-2 text-sm text-pretty">
                        <span className="shrink-0 opacity-40">&bull;</span><span>{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {explanation.easyToMiss && explanation.easyToMiss.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Easy to miss</Label>
                  <ul className="mt-1 space-y-1">
                    {explanation.easyToMiss.map((k, i) => (
                      <li key={i} className="flex gap-2 text-sm text-pretty">
                        <span className="shrink-0 text-amber-600 dark:text-amber-400">&bull;</span><span>{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {explanation.actionItems && explanation.actionItems.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Action items</Label>
                  <ol className="mt-1 space-y-1 list-decimal list-inside">
                    {explanation.actionItems.map((k, i) => (
                      <li key={i} className="text-sm text-pretty">{k}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


