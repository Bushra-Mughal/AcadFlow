import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { supabase } from '@/db/supabase';
import type { Assignment, Status, Priority } from '@/types';
import { AssignmentCard } from '@/components/shared/AssignmentCard';
import { Plus } from 'lucide-react';
import { VoiceAdd } from '@/components/common/VoiceAdd';
import { toast } from 'sonner';
import { extractError } from '@/lib/activity';
import { runCopilotParse } from '@/lib/copilot';

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [parsing, setParsing] = useState(false);

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
    loadAssignments();
  }, []);

  async function loadAssignments() {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      const msg = extractError(error);
      console.error('[Assignments] loadAssignments:', msg, error);
      toast.error('Failed to load assignments: ' + msg);
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
        user_id: user.id,
        weightage: formData.weightage ? parseInt(formData.weightage) : null,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      };

      if (editingAssignment) {
        const { error } = await supabase
          .from('assignments')
          .update(payload)
          .eq('id', editingAssignment.id);

        if (error) throw error;
        toast.success('Assignment updated successfully');
      } else {
        const { data, error } = await supabase
          .from('assignments')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        toast.success('Assignment created successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadAssignments();
    } catch (error) {
      const msg = extractError(error);
      console.error('[Assignments] handleSubmit:', msg, error);
      toast.error('Failed to save assignment: ' + msg);
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Assignment deleted');
      loadAssignments();
    } catch (error) {
      const msg = extractError(error);
      console.error('[Assignments] handleDelete:', msg, error);
      toast.error('Failed to delete assignment: ' + msg);
    }
  }

  async function handleStatusChange(id: string, status: Status) {
    try {
      const assignment = assignments.find(a => a.id === id);
      
      const { error } = await supabase
        .from('assignments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      // Award points if status changed to completed
      if (status === 'completed' && assignment) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const now = new Date();
          const due = assignment.due_date ? new Date(assignment.due_date) : null;
          const dueDay = due ? new Date(due.getFullYear(), due.getMonth(), due.getDate()) : null;
          const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const action = !due ? 'assignment_completed_ontime'
            : dueDay && dueDay.getTime() === todayDay.getTime() ? 'assignment_completed_onday'
            : due >= now ? 'assignment_completed_ontime'
            : 'assignment_completed_late';
          
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

          const pts = action === 'assignment_completed_ontime' ? 50
            : action === 'assignment_completed_onday' ? 30 : 10;
          const rankMsg = result?.rank_changed ? ` Rank up to ${result.new_rank}!` : '';
          
          if (action !== 'assignment_completed_late') {
            toast.success(`Status updated! +${pts} pts for on-time completion${rankMsg}`);
          } else {
            toast.success(`Status updated! +${pts} pts${rankMsg}`);
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
          await supabase.rpc('award_points', { p_user_id: user.id, p_action: 'assignment_status_progress' });
        }
        toast.success('Status updated! +5 pts for starting work');
      } else if (status === 'review') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('award_points', { p_user_id: user.id, p_action: 'assignment_status_review' });
        }
        toast.success('Status updated! +10 pts for moving to review');
      } else {
        toast.success('Status updated');
      }
      
      loadAssignments();
    } catch (error) {
      const msg = extractError(error);
      console.error('[Assignments] handleStatusChange:', msg, error);
      toast.error('Failed to update status: ' + msg);
    }
  }

  function handleEdit(assignment: Assignment) {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      course: assignment.course || '',
      due_date: assignment.due_date || '',
      priority: assignment.priority,
      weightage: assignment.weightage?.toString() || '',
      status: assignment.status,
    });
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
    setEditingAssignment(null);
  }

  const filteredAssignments = filterStatus === 'all' 
    ? assignments 
    : assignments.filter(a => a.status === filterStatus);

  if (loading) {
    return <div className="space-y-6"><p>Loading assignments...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-balance">My Assignments</h1>
          <p className="text-muted-foreground text-pretty">Manage your solo assignments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Add Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-balance">{editingAssignment ? 'Edit Assignment' : 'Add New Assignment'}</DialogTitle>
              <DialogDescription className="text-pretty">
                Add an assignment manually or speak its details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex justify-end">
                <VoiceAdd
                  label={parsing ? 'Parsing…' : 'Add by voice'}
                  onFinal={async (text) => {
                    setParsing(true);
                    try {
                      const parsed = await runCopilotParse({ transcript: text, kind: 'assignment' });
                      setFormData((cur) => ({
                        ...cur,
                        title: (parsed.title || '').trim() || cur.title || text,
                        course: (parsed.course || '').trim() || cur.course,
                        due_date: parsed.due_date || cur.due_date,
                        weightage: parsed.weightage != null ? String(parsed.weightage) : cur.weightage,
                        priority: parsed.priority === 'low' || parsed.priority === 'high' ? parsed.priority : cur.priority,
                        description: (parsed.description || '').trim() || cur.description,
                      }));
                      toast.success('Filled the form from your voice — review the fields');
                    } catch (err) {
                      console.error('[Assignments] voice parse failed, using plain dictation:', extractError(err), err);
                      setFormData((cur) => ({
                        ...cur,
                        title: cur.title || text,
                        description: cur.title ? `${cur.description} ${text}`.trim() : cur.description,
                      }));
                      toast.message('Added as plain text (AI parsing unavailable)');
                    } finally {
                      setParsing(false);
                    }
                  }}
                />
              </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Assignment title"
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
                      placeholder="Assignment details"
                      rows={3}
                    />
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
                    <Button type="submit" disabled={parsing}>
                      {editingAssignment ? 'Update' : 'Create'} Assignment
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

      {filteredAssignments.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No assignments found</p>
            <p className="text-sm text-muted-foreground text-pretty">Create your first assignment to get started</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
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


