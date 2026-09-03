import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { supabase } from '@/db/supabase';
import type { Project, Status, Priority } from '@/types';
import { ProjectCard } from '@/components/shared/ProjectCard';
import { Plus } from 'lucide-react';
import { VoiceAdd } from '@/components/common/VoiceAdd';
import { toast } from 'sonner';
import { trackActivity, extractError } from '@/lib/activity';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [memberEmails, setMemberEmails] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: '',
    due_date: '',
    priority: 'medium' as Priority,
    weightage: '',
    status: 'queue' as Status,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);

      const counts: Record<string, number> = {};
      for (const project of data || []) {
        const { count } = await supabase
          .from('project_members')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);
        counts[project.id] = count || 0;
      }
      setMemberCounts(counts);
    } catch (error) {
      const msg = extractError(error);
      console.error('[Projects] loadProjects:', msg, error);
      toast.error('Failed to load projects: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const payload = {
        ...formData,
        creator_id: user.id,
        weightage: formData.weightage ? parseInt(formData.weightage) : null,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      };

      console.log('Submitting project payload:', payload);

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingProject.id);

        if (error) {
          console.error('Project update error:', error);
          throw error;
        }

        // Add new team members if specified in edit mode
        if (memberEmails.trim()) {
          const usernames = memberEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
          console.log('Adding members by AcadFlow username (edit mode):', usernames);
          
          const successfulAdds: string[] = [];
          const failedAdds: string[] = [];
          
          for (const username of usernames) {
            try {
              if (!/^[a-zA-Z0-9_]+$/.test(username)) { failedAdds.push(username); continue; }
              const { data: profileRows, error: profileError } = await supabase
                .rpc('find_user_by_email', { p_email: username });

              const profile = Array.isArray(profileRows) && profileRows.length > 0 ? profileRows[0] : null;

              if (profileError) {
                console.error('Error fetching profile:', profileError);
                failedAdds.push(username);
                continue;
              }

              if (profile) {
                // Check if member already exists
                const { data: existingMember } = await supabase
                  .from('project_members')
                  .select('id')
                  .eq('project_id', editingProject.id)
                  .eq('user_id', profile.id)
                  .maybeSingle();

                if (existingMember) {
                  toast.info(`${username} is already a member of this project`);
                  continue;
                }

                const { error: memberError } = await supabase.from('project_members').insert({
                  project_id: editingProject.id,
                  user_id: profile.id,
                  email: profile.email || `${profile.username}@acadflow.app`,
                });

                if (memberError) {
                  console.error('Error adding member:', memberError);
                  failedAdds.push(username);
                } else {
                  successfulAdds.push(username);
                }
              } else {
                failedAdds.push(username);
                toast.error(`No AcadFlow account found for username "${username}". They must sign up first.`);
              }
            } catch (memberError: any) {
              console.error('Failed to add member:', username, memberError);
              failedAdds.push(username);
            }
          }

          if (successfulAdds.length > 0) {
            // Award points per invited member
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              for (let i = 0; i < successfulAdds.length; i++) {
                await supabase.rpc('award_points', { p_user_id: currentUser.id, p_action: 'team_member_invited' });
              }
            }
            toast.success(`Successfully added ${successfulAdds.length} member(s) - +${successfulAdds.length * 15} pts`);
          }
          if (failedAdds.length > 0) {
            toast.warning(`Failed to add ${failedAdds.length} member(s). Please check the AcadFlow usernames.`);
          }
        }

        await trackActivity('edited', undefined, editingProject.id);
        toast.success('Project updated successfully');
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert(payload)
          .select()
          .single();

        if (error) {
          console.error('Project creation error:', error);
          throw error;
        }

        // Add team members if specified
        // Note: RLS policies use SECURITY DEFINER helper functions to prevent infinite recursion
        if (memberEmails.trim()) {
          const usernames = memberEmails.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
          console.log('Adding members by AcadFlow username:', usernames);
          
          const successfulAdds: string[] = [];
          const failedAdds: string[] = [];
          
          for (const username of usernames) {
            try {
              if (!/^[a-zA-Z0-9_]+$/.test(username)) { failedAdds.push(username); continue; }
              const { data: profileRows, error: profileError } = await supabase
                .rpc('find_user_by_email', { p_email: username });

              const profile = Array.isArray(profileRows) && profileRows.length > 0 ? profileRows[0] : null;

              if (profileError) {
                console.error('Error fetching profile:', profileError);
                failedAdds.push(username);
                continue;
              }

              if (profile) {
                // Check if member already exists
                const { data: existingMember } = await supabase
                  .from('project_members')
                  .select('id')
                  .eq('project_id', data.id)
                  .eq('user_id', profile.id)
                  .maybeSingle();

                if (existingMember) {
                  toast.info(`${username} is already a member of this project`);
                  continue;
                }

                const { error: memberError } = await supabase.from('project_members').insert({
                  project_id: data.id,
                  user_id: profile.id,
                  email: profile.email || `${profile.username}@acadflow.app`,
                });

                if (memberError) {
                  console.error('Error adding member:', memberError);
                  failedAdds.push(username);
                } else {
                  successfulAdds.push(username);
                }
              } else {
                failedAdds.push(username);
                toast.error(`No AcadFlow account found for username "${username}". They must sign up first.`);
              }
            } catch (memberError: any) {
              console.error('Failed to add member:', username, memberError);
              failedAdds.push(username);
            }
          }

          if (successfulAdds.length > 0) {
            toast.success(`Successfully added ${successfulAdds.length} member(s)`);
          }
          if (failedAdds.length > 0) {
            toast.warning(`Failed to add ${failedAdds.length} member(s). You can retry by editing the project.`);
          }
        }

        await trackActivity('created', undefined, data.id);
        toast.success('Project created successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadProjects();
    } catch (error) {
      const msg = extractError(error);
      console.error('[Projects] handleSubmit:', msg, error);
      toast.error('Failed to save project: ' + msg);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await trackActivity('deleted', undefined, id);
      toast.success('Project deleted');
      loadProjects();
    } catch (error) {
      const msg = extractError(error);
      console.error('[Projects] handleDelete:', msg, error);
      toast.error('Failed to delete project: ' + msg);
    }
  }

  async function handleStatusChange(id: string, status: Status) {
    try {
      const project = projects.find(p => p.id === id);
      
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      // Award points if status changed to completed
      if (status === 'completed' && project) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const now = new Date();
          const due = project.due_date ? new Date(project.due_date) : null;
          const dueDay = due ? new Date(due.getFullYear(), due.getMonth(), due.getDate()) : null;
          const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const action = !due ? 'project_completed_ontime'
            : dueDay && dueDay.getTime() === todayDay.getTime() ? 'project_completed_onday'
            : due >= now ? 'project_completed_ontime'
            : 'project_completed_late';
          
          // Update streak
          await supabase.rpc('update_submission_streak', { p_user_id: user.id });
          
          // Award points
          const { data: result } = await supabase.rpc('award_points', {
            p_user_id: user.id,
            p_action: action,
          });
          
          // Check for new badges
          const { data: newBadges } = await supabase.rpc('check_and_award_badges', {
            p_user_id: user.id,
          });

          const pts = action === 'project_completed_ontime' ? 70
            : action === 'project_completed_onday' ? 50 : 15;
          const rankMsg = result?.rank_changed ? ` Rank up to ${result.new_rank}!` : '';
          
          if (action !== 'project_completed_late') {
            toast.success(`Project completed! +${pts} pts${rankMsg}`);
          } else {
            toast.success(`Project completed! +${pts} pts${rankMsg}`);
          }
          
          // Show badge notifications
          if (newBadges && newBadges.length > 0) {
            newBadges.forEach((badge: any) => {
              toast.success(`Badge Unlocked: ${badge.badge_name}!`, {
                description: badge.badge_description,
                duration: 5000,
              });
            });
          }
        }
      } else if (status === 'in_progress') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('award_points', { p_user_id: user.id, p_action: 'project_status_progress' });
        }
        toast.success('Status updated! +5 pts for starting project');
      } else if (status === 'review') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('award_points', { p_user_id: user.id, p_action: 'project_status_review' });
        }
        toast.success('Status updated! +10 pts for moving to review');
      } else {
        toast.success('Status updated');
      }
      
      await trackActivity('status_changed', undefined, id, { new_status: status });
      loadProjects();
    } catch (error) {
      const msg = extractError(error);
      console.error('[Projects] handleStatusChange:', msg, error);
      toast.error('Failed to update status: ' + msg);
    }
  }

  function handleEdit(project: Project) {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      course: project.course || '',
      due_date: project.due_date || '',
      priority: project.priority,
      weightage: project.weightage?.toString() || '',
      status: project.status,
    });
    setMemberEmails(''); // Clear member emails for fresh input
    setDialogOpen(true);
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      course: '',
      due_date: '',
      priority: 'medium',
      weightage: '',
      status: 'queue',
    });
    setMemberEmails('');
    setEditingProject(null);
  }

  const filteredProjects = filterStatus === 'all' 
    ? projects 
    : projects.filter(p => p.status === filterStatus);

  if (loading) {
    return <div className="space-y-6"><p>Loading projects...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-balance">Team Projects</h1>
          <p className="text-muted-foreground text-pretty">Collaborate on group projects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-balance">{editingProject ? 'Edit Project' : 'Add New Project'}</DialogTitle>
              <DialogDescription className="text-pretty">
                Create a team project and invite members
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex justify-end">
                <VoiceAdd onTranscript={(text) => setFormData((current) => ({ ...current, title: current.title || text, description: current.title ? `${current.description} ${text}`.trim() : current.description }))} label="Add by voice" />
              </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Project title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course">Course</Label>
                    <Input
                      id="course"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      placeholder="Course name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Project details"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="members">Invite Team Members (comma-separated AcadFlow usernames)</Label>
                    <Textarea
                      id="members"
                      value={memberEmails}
                      onChange={(e) => setMemberEmails(e.target.value)}
                      placeholder="alex, jordan, sam_123"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter usernames of existing AcadFlow users. Gmail and other email addresses are not accepted.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weightage">Weightage (%)</Label>
                      <Input
                        id="weightage"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.weightage}
                        onChange={(e) => setFormData({ ...formData, weightage: e.target.value })}
                        placeholder="0-100"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={formData.priority} onValueChange={(value: Priority) => setFormData({ ...formData, priority: value })}>
                        <SelectTrigger id="priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: Status) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="queue">Queue</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingProject ? 'Update' : 'Create'} Project
                    </Button>
                  </div>
                </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Label>Filter:</Label>
        <Select value={filterStatus} onValueChange={(value: Status | 'all') => setFilterStatus(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="queue">Queue</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredProjects.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No projects found</p>
            <p className="text-sm text-muted-foreground text-pretty">Create your first team project to get started</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              memberCount={memberCounts[project.id] || 0}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}


