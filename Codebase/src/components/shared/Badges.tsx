import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Status, Priority } from '@/types';
import { getStatusLabel, getPriorityLabel } from '@/lib/activity';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border',
        status === 'queue' && 'status-queue',
        status === 'in_progress' && 'status-in-progress',
        status === 'review' && 'status-review',
        status === 'completed' && 'status-completed',
        className
      )}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'text-sm font-medium',
        priority === 'low' && 'priority-low',
        priority === 'medium' && 'priority-medium',
        priority === 'high' && 'priority-high',
        className
      )}
    >
      {getPriorityLabel(priority)}
    </span>
  );
}


