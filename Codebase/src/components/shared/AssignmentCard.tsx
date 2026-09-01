import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MoreVertical } from 'lucide-react';
import { StatusBadge, PriorityBadge } from './Badges';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Assignment } from '@/types';
import { formatRelativeTime, getDaysUntilDue, isOverdue } from '@/lib/activity';

interface AssignmentCardProps {
  assignment: Assignment;
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Assignment['status']) => void;
}

export function AssignmentCard({ assignment, onEdit, onDelete, onStatusChange }: AssignmentCardProps) {
  const navigate = useNavigate();
  const daysUntil = assignment.due_date ? getDaysUntilDue(assignment.due_date) : null;
  const overdue = assignment.due_date ? isOverdue(assignment.due_date) : false;
  const isCompleted = assignment.status === 'completed';

  return (
    <Card 
      className="h-full transition-shadow hover:shadow-md cursor-pointer" 
      onClick={() => navigate(`/assignments/${assignment.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base text-balance">{assignment.title}</CardTitle>
            {assignment.course && (
              <CardDescription className="mt-1 text-pretty">{assignment.course}</CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(assignment); }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(assignment.id, 'in_progress'); }}>
                Mark In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange(assignment.id, 'completed'); }}>
                Mark Completed
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(assignment.id); }}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignment.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 text-pretty">{assignment.description}</p>
        )}
        
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={assignment.status} />
          <PriorityBadge priority={assignment.priority} />
          {assignment.weightage && (
            <span className="text-xs text-muted-foreground">{assignment.weightage}%</span>
          )}
        </div>

        {assignment.due_date && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(assignment.due_date).toLocaleDateString()}</span>
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
          Updated {formatRelativeTime(assignment.updated_at)}
        </div>
      </CardContent>
    </Card>
  );
}


