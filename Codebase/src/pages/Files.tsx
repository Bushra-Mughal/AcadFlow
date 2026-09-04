import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/db/supabase';
import type { FileRecord, FileFolder } from '@/types';
import {
  Upload, FileText, Image, File as FileIcon, Download, Trash2, Eye, Code,
  FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown, MoveRight,
  MoreHorizontal, Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatRelativeTime, extractError } from '@/lib/activity';

// â”€â”€ MIME map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MIME_MAP: Record<string, string> = {
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  py: 'text/x-python',
  ipynb: 'application/x-ipynb+json',
  java: 'text/x-java',
  cpp: 'text/x-c++',
  c: 'text/x-c',
  h: 'text/x-c',
  hpp: 'text/x-c++',
  js: 'text/javascript',
  ts: 'text/typescript',
  jsx: 'text/javascript',
  tsx: 'text/typescript',
  json: 'application/json',
  xml: 'text/xml',
  html: 'text/html',
  css: 'text/css',
};

function detectMime(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

function categorise(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (
    mime.startsWith('text/x-') ||
    mime === 'application/x-ipynb+json' ||
    mime === 'text/javascript' ||
    mime === 'text/typescript' ||
    mime === 'application/json'
  ) return 'code';
  if (mime.startsWith('text/')) return 'text';
  return 'document';
}

function getFileIcon(type: string) {
  if (type === 'image') return Image;
  if (type === 'code') return Code;
  if (type === 'text') return FileText;
  return FileIcon;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// â”€â”€ Folder tree builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildTree(folders: FileFolder[], files: FileRecord[]): {
  rootFolders: FileFolder[];
  rootFiles: FileRecord[];
} {
  const folderMap = new Map<string, FileFolder>();
  folders.forEach(f => folderMap.set(f.id, { ...f, children: [], files: [] }));

  const rootFolders: FileFolder[] = [];
  folderMap.forEach(f => {
    if (f.parent_id) {
      const parent = folderMap.get(f.parent_id);
      if (parent) parent.children = [...(parent.children ?? []), f];
      else rootFolders.push(f);
    } else {
      rootFolders.push(f);
    }
  });

  // Re-reference from map (mutated children)
  const populatedRoots = rootFolders.map(r => folderMap.get(r.id) ?? r);

  // Distribute files
  const rootFiles: FileRecord[] = [];
  files.forEach(file => {
    if (!file.folder_id) {
      rootFiles.push(file);
    } else {
      const folder = folderMap.get(file.folder_id);
      if (folder) folder.files = [...(folder.files ?? []), file];
      else rootFiles.push(file);
    }
  });

  return { rootFolders: populatedRoots, rootFiles };
}

// â”€â”€ FolderNode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface FolderNodeProps {
  folder: FileFolder;
  allFolders: FileFolder[];
  depth: number;
  onOpen: (file: FileRecord) => void;
  onDownload: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  onMoveFile: (file: FileRecord, targetFolderId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
}

function FolderNode({
  folder, allFolders, depth, onOpen, onDownload, onDelete, onMoveFile, onDeleteFolder,
}: FolderNodeProps) {
  const [open, setOpen] = useState(false);
  const hasContents = (folder.children?.length ?? 0) + (folder.files?.length ?? 0) > 0;

  return (
    <div>
      {/* Folder row */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/50 cursor-pointer select-none group"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => setOpen(o => !o)}
      >
        <span className="shrink-0 text-muted-foreground">
          {hasContents
            ? open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
            : <span className="w-3.5" />}
        </span>
        {open ? <FolderOpen className="h-4 w-4 shrink-0 text-primary" /> : <Folder className="h-4 w-4 shrink-0 text-primary" />}
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{folder.name}</span>
        <span className="text-xs text-muted-foreground shrink-0">{(folder.files?.length ?? 0)} files</span>
        {/* Folder actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {open && (
        <div>
          {(folder.children ?? []).map(child => (
            <FolderNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              depth={depth + 1}
              onOpen={onOpen}
              onDownload={onDownload}
              onDelete={onDelete}
              onMoveFile={onMoveFile}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
          {(folder.files ?? []).map(file => (
            <FileRow
              key={file.id}
              file={file}
              depth={depth + 1}
              allFolders={allFolders}
              currentFolderId={folder.id}
              onOpen={onOpen}
              onDownload={onDownload}
              onDelete={onDelete}
              onMove={onMoveFile}
            />
          ))}
          {!hasContents && (
            <p className="text-xs text-muted-foreground py-2" style={{ paddingLeft: `${28 + (depth + 1) * 16}px` }}>
              Empty folder
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// â”€â”€ FileRow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface FileRowProps {
  file: FileRecord;
  depth: number;
  allFolders: FileFolder[];
  currentFolderId: string | null;
  onOpen: (file: FileRecord) => void;
  onDownload: (file: FileRecord) => void;
  onDelete: (file: FileRecord) => void;
  onMove: (file: FileRecord, targetFolderId: string | null) => void;
}

function FileRow({ file, depth, allFolders, currentFolderId, onOpen, onDownload, onDelete, onMove }: FileRowProps) {
  const Icon = getFileIcon(file.file_type);
  const isViewable =
    file.mime_type?.startsWith('image/') ||
    file.mime_type === 'application/pdf' ||
    file.mime_type?.startsWith('video/') ||
    file.mime_type?.startsWith('text/') ||
    file.mime_type === 'application/json' ||
    file.mime_type === 'application/x-ipynb+json';

  const moveTargets = [
    ...(currentFolderId !== null ? [{ id: null, name: 'Root (no folder)' }] : []),
    ...allFolders.filter(f => f.id !== currentFolderId),
  ];

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/30 group"
      style={{ paddingLeft: `${28 + depth * 16}px` }}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatSize(file.file_size)} Â· {formatRelativeTime(file.uploaded_at)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isViewable && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onOpen(file)} title="View">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDownload(file)} title="Download">
          <Download className="h-3.5 w-3.5" />
        </Button>
        {/* Move */}
        {moveTargets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Move to folder">
                <MoveRight className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-48 overflow-y-auto">
              {moveTargets.map(t => (
                <DropdownMenuItem key={String(t.id)} onClick={() => onMove(file, t.id)}>
                  {t.id === null ? <Home className="h-3.5 w-3.5 mr-2" /> : <Folder className="h-3.5 w-3.5 mr-2" />}
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(file)} title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function Files() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = useCallback(async () => {
    try {
      const [{ data: filesData }, { data: foldersData }] = await Promise.all([
        // Vault = personal library only: files not tied to an assignment or a
        // team project. Uploading a file inside an assignment/project keeps it
        // there instead of polluting the vault.
        supabase.from('files').select('*').is('assignment_id', null).is('project_id', null).order('uploaded_at', { ascending: false }),
        supabase.from('file_folders').select('*').order('name'),
      ]);
      setFiles(filesData ?? []);
      setFolders(foldersData ?? []);
    } catch (err) {
      const msg = extractError(err);
      console.error('[Files] loadAll:', msg, err);
      toast.error('Failed to load files: ' + msg);
    } finally {
      setLoading(false);
    }
  }, []);

  async function uploadOne(file: File, userId: string) {

      const mimeType = detectMime(file);
      const fileName = `my-files/${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const { error: uploadError } = await supabase.storage.from('user-files').upload(fileName, file, { contentType: mimeType });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('files').insert({
        user_id: userId,
        name: file.name,
        file_path: fileName,
        file_type: categorise(mimeType),
        file_size: file.size,
        mime_type: mimeType,
        folder_id: null,
      });
      if (dbError) throw new Error(dbError.message);

    await supabase.rpc('award_points', { p_user_id: userId, p_action: 'file_uploaded' });
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
          console.error('[Files] upload one:', extractError(err), err);
          failed.push(file.name);
        }
      }
      if (okCount > 0) toast.success(`${okCount} file${okCount > 1 ? 's' : ''} uploaded! +${okCount * 5} pts`);
      if (failed.length) toast.error(`Couldn't upload: ${failed.join(', ')}`);
      await loadAll();
    } catch (err) {
      const msg = extractError(err);
      console.error('[Files] handleUpload:', msg, err);
      toast.error('Upload failed: ' + msg);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleCreateFolder() {
    if (!folderName.trim()) { toast.error('Folder name is required'); return; }
    setCreatingFolder(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('You must be logged in'); return; }
      const { error } = await supabase.from('file_folders').insert({
        user_id: user.id,
        name: folderName.trim(),
        parent_id: parentFolderId,
      });
      if (error) throw error;
      toast.success('Folder created');
      setCreateFolderOpen(false);
      setFolderName('');
      setParentFolderId(null);
      await loadAll();
    } catch (err) {
      const msg = extractError(err);
      console.error('[Files] handleCreateFolder:', msg, err);
      toast.error('Failed to create folder: ' + msg);
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleDeleteFolder(folderId: string) {
    try {
      // Move contained files to root
      await supabase.from('files').update({ folder_id: null }).eq('folder_id', folderId);
      await supabase.from('file_folders').delete().eq('id', folderId);
      toast.success('Folder deleted (files moved to root)');
      await loadAll();
    } catch (err) {
      const msg = extractError(err);
      console.error('[Files] handleDeleteFolder:', msg, err);
      toast.error('Failed to delete folder: ' + msg);
    }
  }

  async function handleOpenFile(file: FileRecord) {
    const isViewable =
      file.mime_type?.startsWith('image/') ||
      file.mime_type === 'application/pdf' ||
      file.mime_type?.startsWith('video/') ||
      file.mime_type?.startsWith('text/') ||
      file.mime_type === 'application/json' ||
      file.mime_type === 'application/x-ipynb+json';

    if (!isViewable) { handleDownload(file); return; }
    const { data } = supabase.storage.from('user-files').getPublicUrl(file.file_path);
    window.open(data.publicUrl, '_blank');
  }

  async function handleDownload(file: FileRecord) {
    try {
      const { data, error } = await supabase.storage.from('user-files').download(file.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = extractError(err);
      console.error('[Files] handleDownload:', msg, err);
      toast.error('Download failed: ' + msg);
    }
  }

  async function handleDelete(file: FileRecord) {
    try {
      await supabase.storage.from('user-files').remove([file.file_path]);
      await supabase.from('files').delete().eq('id', file.id);
      toast.success('File deleted');
      await loadAll();
    } catch (err) {
      const msg = extractError(err);
      console.error('[Files] handleDelete:', msg, err);
      toast.error('Failed to delete file: ' + msg);
    }
  }

  async function handleMoveFile(file: FileRecord, targetFolderId: string | null) {
    try {
      await supabase.from('files').update({ folder_id: targetFolderId }).eq('id', file.id);
      toast.success(targetFolderId ? 'File moved to folder' : 'File moved to root');
      await loadAll();
    } catch (err) {
      const msg = extractError(err);
      console.error('[Files] handleMoveFile:', msg, err);
      toast.error('Failed to move file: ' + msg);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
      </div>
    );
  }

  const { rootFolders, rootFiles } = buildTree(folders, files);
  const totalFiles = files.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-balance">My Files</h1>
          <p className="text-muted-foreground text-pretty">
            {totalFiles} file{totalFiles !== 1 ? 's' : ''} Â· {folders.length} folder{folders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Create folder */}
          <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="folder-name">Folder name</Label>
                  <Input
                    id="folder-name"
                    placeholder="e.g. Lecture Notes"
                    value={folderName}
                    onChange={e => setFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="parent-folder">Inside folder (optional)</Label>
                  <select
                    id="parent-folder"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={parentFolderId ?? ''}
                    onChange={e => setParentFolderId(e.target.value || null)}
                  >
                    <option value="">- Root level -</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateFolder} disabled={creatingFolder}>
                  {creatingFolder ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Upload */}
          <Input type="file" id="file-upload" className="hidden" onChange={handleUpload} disabled={uploading} multiple />
          <Button asChild disabled={uploading}>
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload File'}
            </label>
          </Button>
        </div>
      </div>

      {/* File tree */}
      {totalFiles === 0 && folders.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No files or folders yet</p>
            <p className="text-sm text-muted-foreground text-pretty">
              Upload a file or create a folder to get started
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-balance">File Explorer</CardTitle>
            <CardDescription className="text-pretty">
              Hover a file or folder to see actions. Use the move icon to organise files.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border/50 -mx-2">
              {/* Folders */}
              {rootFolders.map(folder => (
                <FolderNode
                  key={folder.id}
                  folder={folder}
                  allFolders={folders}
                  depth={0}
                  onOpen={handleOpenFile}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onMoveFile={handleMoveFile}
                  onDeleteFolder={handleDeleteFolder}
                />
              ))}

              {/* Root-level files */}
              {rootFiles.map(file => (
                <FileRow
                  key={file.id}
                  file={file}
                  depth={0}
                  allFolders={folders}
                  currentFolderId={null}
                  onOpen={handleOpenFile}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                  onMove={handleMoveFile}
                />
              ))}

              {rootFolders.length === 0 && rootFiles.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  All files are inside folders
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


