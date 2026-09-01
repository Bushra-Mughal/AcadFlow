import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/db/supabase';
import type { Assignment, Project } from '@/types';
import { Calendar, CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { getDaysUntilDue, isOverdue } from '@/lib/activity';
import { StatusBadge } from '@/components/shared/Badges';
import RankBar from '@/components/RankBar';

export default function Dashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [assignmentsRes, projectsRes] = await Promise.all([
        supabase
          .from('assignments')
          .select('*')
          .order('due_date', { ascending: true }),
        supabase
          .from('projects')
          .select('*')
          .order('due_date', { ascending: true }),
      ]);

      setAssignments(assignmentsRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  const upcomingDeadlines = [...assignments, ...projects]
    .filter(item => item.due_date && !isOverdue(item.due_date) && item.status !== 'completed')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  const soloCompleted = assignments.filter(a => a.status === 'completed').length;
  const soloTotal = assignments.length;
  const soloProgress = soloTotal > 0 ? (soloCompleted / soloTotal) * 100 : 0;

  const teamCompleted = projects.filter(p => p.status === 'completed').length;
  const teamTotal = projects.length;
  const teamProgress = teamTotal > 0 ? (teamCompleted / teamTotal) * 100 : 0;

  const totalTasks = soloTotal + teamTotal;
  const completedTasks = soloCompleted + teamCompleted;
  const inProgressTasks = [...assignments, ...projects].filter(item => item.status === 'in_progress').length;
  const overdueTasks = [...assignments, ...projects].filter(item => item.due_date && isOverdue(item.due_date) && item.status !== 'completed').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-balance">Dashboard</h1>
          <p className="text-muted-foreground text-pretty">Loading your academic overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-balance">Dashboard</h1>
        <p className="text-muted-foreground text-pretty">Welcome back! Here's your academic overview.</p>
      </div>

      {/* Rank Bar */}
      <RankBar />

      {/* Quick Stats - Compact Design */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs text-pretty">Total Tasks</CardDescription>
            <CardTitle className="text-2xl text-balance">{totalTasks}</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ListTodo className="h-3.5 w-3.5" />
              <span>Assignments & Projects</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs text-pretty">Completed</CardDescription>
            <CardTitle className="text-2xl text-balance">{completedTasks}</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% Done</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs text-pretty">In Progress</CardDescription>
            <CardTitle className="text-2xl text-balance">{inProgressTasks}</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Clock className="h-3.5 w-3.5" />
              <span>Active Work</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs text-pretty">Overdue</CardDescription>
            <CardTitle className="text-2xl text-balance">{overdueTasks}</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <Calendar className="h-3.5 w-3.5" />
              <span>Need Attention</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Solo Progress</CardTitle>
            <CardDescription className="text-pretty">Your individual assignments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-medium">{Math.round(soloProgress)}%</span>
              </div>
              <Progress value={soloProgress} className="h-2" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">{soloCompleted} / {soloTotal}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-balance">Team Progress</CardTitle>
            <CardDescription className="text-pretty">Your collaborative projects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-medium">{Math.round(teamProgress)}%</span>
              </div>
              <Progress value={teamProgress} className="h-2" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium">{teamCompleted} / {teamTotal}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-balance">Upcoming Deadlines</CardTitle>
          <CardDescription className="text-pretty">Your next 5 due items</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No upcoming deadlines. Great job staying on top of things!
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((item) => {
                const daysUntil = item.due_date ? getDaysUntilDue(item.due_date) : 0;
                
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-medium text-sm text-balance">{item.title}</p>
                      {item.course && (
                        <p className="text-xs text-muted-foreground text-pretty">{item.course}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusBadge status={item.status} />
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(item.due_date!).toLocaleDateString()}
                        </p>
                        <p className={`text-xs ${daysUntil <= 3 ? 'text-warning' : 'text-muted-foreground'}`}>
                          {daysUntil === 0 ? 'Due today' : `${daysUntil} days left`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


