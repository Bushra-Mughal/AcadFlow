import { supabase } from '@/db/supabase';
import type { ActionType } from '@/types';

export async function trackActivity(
  actionType: ActionType,
  assignmentId?: string,
  projectId?: string,
  details?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, username')
      .eq('id', user.id)
      .single();

    // Build display label: prefer username@acadflow, fall back to raw email
    let userEmail = 'Unknown';
    if (profile?.username) {
      userEmail = `${profile.username}@acadflow`;
    } else if (profile?.email) {
      // Legacy accounts may contain an email; show only the local account name.
      const localPart = profile.email.split('@')[0];
      userEmail = `${localPart}@acadflow`;
    }

    await supabase.from('activities').insert({
      user_id: user.id,
      user_email: userEmail,
      action_type: actionType,
      assignment_id: assignmentId,
      project_id: projectId,
      details,
    });
  } catch (error) {
    console.error('Failed to track activity:', error);
  }
}

export function formatRelativeTime(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return past.toLocaleDateString();
}

export function getDaysUntilDue(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / 86400000);
}

export function isOverdue(dueDate: string): boolean {
  return getDaysUntilDue(dueDate) < 0;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    queue: 'Queue',
    in_progress: 'In Progress',
    review: 'Review',
    completed: 'Completed',
  };
  return labels[status] || status;
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };
  return labels[priority] || priority;
}

/**
 * Extracts a human-readable message from any thrown value.
 * Handles Error objects, Supabase error shapes, plain strings, and unknown objects.
 */
export function extractError(err: unknown): string {
  if (!err) return 'An unexpected error occurred';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    const e = err as Record<string, any>;
    // Supabase error shape: { message, details, hint, code }
    const parts: string[] = [];
    if (e.message) parts.push(String(e.message));
    if (e.details) parts.push(`Details: ${e.details}`);
    if (e.hint) parts.push(`Hint: ${e.hint}`);
    if (e.code) parts.push(`Code: ${e.code}`);
    if (parts.length) return parts.join(' - ');
  }
  return 'An unexpected error occurred';
}


