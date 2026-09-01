import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MoreVertical, Users as UsersIcon } from 'lucide-react';
import { StatusBadge, PriorityBadge } from './Badges';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Project } from '@/types';
import { formatRelativeTime, getDaysUntilDue, isOverdue } from '@/lib/activity';

interface ProjectCardProps {
  project: Project;
  memberCount?: number;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Project['status']) => void;
}

export function ProjectCard({ project, memberCount = 0, onEdit, onDelete, onStatusChange }: ProjectCardProps) {
  const navigate = useNavigate();
  const daysUntil = project.due_date ? getDaysUntilDue(project.due_date) : null;
  const overdue = project.due_date ? isOverdue(project.due_date) : false;
  const isCompleted = project.status === 'completed';

  return (
    <Card 
      className="h-full transition-shadow hover:shadow-md cursor-pointer" 
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base text-balance">{project.title}</CardTitle>
            {project.course && (
              <CardDescription className="mt-1 text-pretty">{project.course}</CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project.id, 'in_progress'); }}>
                Mark In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(project.id, 'completed'); }}>
                Mark Completed
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 text-pretty">{project.description}</p>
        )}
        
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={project.status} />
          <PriorityBadge priority={project.priority} />
          {project.weightage && (
            <span className="text-xs text-muted-foreground">{project.weightage}%</span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon className="h-4 w-4" />
          <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
        </div>

        {project.due_date && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(project.due_date).toLocaleDateString()}</span>
            </div>
            {daysUntil !== null && !isCompleted && (
              <div className={`flex items-center gap-1.5 ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                <Clock className="h-4 w-4" />
                <span>
                  {overdue ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days left`}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(project.updated_at)}
        </div>
      </CardContent>
    </Card>
  );
}


