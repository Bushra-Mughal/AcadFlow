import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/db/supabase';
import type { Activity } from '@/types';
import { formatRelativeTime } from '@/lib/activity';
import { Eye, Edit, Plus, Trash2, CheckCircle } from 'lucide-react';

export default function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatUserEmail(raw: string): string {
    // Normalise legacy `username@miaoda.com` and any `anything@*.com` to `username@acadflow`
    if (!raw || raw === 'Unknown') return raw;
    if (raw.endsWith('@miaoda.com') || raw.endsWith('@miaoda')) {
      return raw.split('@')[0] + '@acadflow';
    }
    // Already in new format or a real email from Google OAuth â€” show local@acadflow
    if (raw.includes('@') && !raw.endsWith('@acadflow')) {
      return raw.split('@')[0] + '@acadflow';
    }
    return raw;
  }

  function getActionIcon(actionType: string) {
    switch (actionType) {
      case 'viewed':
      case 'opened':
        return Eye;
      case 'edited':
        return Edit;
      case 'created':
        return Plus;
      case 'deleted':
        return Trash2;
      case 'status_changed':
        return CheckCircle;
      default:
        return Eye;
    }
  }

  function getActionLabel(actionType: string): string {
    const labels: Record<string, string> = {
      viewed: 'Viewed',
      opened: 'Opened',
      edited: 'Edited',
      created: 'Created',
      deleted: 'Deleted',
      status_changed: 'Changed Status',
    };
    return labels[actionType] || actionType;
  }

  function getActivityDescription(activity: Activity): string {
    const action = getActionLabel(activity.action_type).toLowerCase();
    
    if (activity.details?.file_name) {
      if (activity.action_type === 'opened') {
        return `opened file "${activity.details.file_name}"`;
      }
      if (activity.action_type === 'edited') {
        return `edited file "${activity.details.file_name}"`;
      }
      if (activity.action_type === 'created') {
        return `uploaded file "${activity.details.file_name}"`;
      }
      if (activity.action_type === 'deleted') {
        return `deleted file "${activity.details.file_name}"`;
      }
    }
    
    if (activity.assignment_id) {
      return `${action} an assignment`;
    }
    if (activity.project_id) {
      return `${action} a project`;
    }
    
    return action;
  }

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.action_type === filter);

  if (loading) {
    return <div className="space-y-6"><p>Loading activity log...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-balance">Activity Log</h1>
          <p className="text-muted-foreground text-pretty">Track all actions across your assignments and projects</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Label>Filter:</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="opened">Opened</SelectItem>
            <SelectItem value="edited">Edited</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
            <SelectItem value="status_changed">Status Changed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredActivities.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No activities found</p>
            <p className="text-sm text-muted-foreground text-pretty">Activities will appear here as you work</p>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Recent Activities</CardTitle>
            <CardDescription className="text-pretty">{filteredActivities.length} activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredActivities.map((activity) => {
                const Icon = getActionIcon(activity.action_type);
                return (
                  <div key={activity.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {formatUserEmail(activity.user_email)} {getActivityDescription(activity)}
                      </p>
                      {activity.details && activity.details.new_status && (
                        <p className="text-xs text-muted-foreground mt-1">
                          New status: {activity.details.new_status}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


