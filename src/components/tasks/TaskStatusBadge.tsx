import { Badge } from '@/components/ui/badge';
import { TASK_STATUS_LABELS, isClosedStatus, type Task } from '@/types/tasks';

const statusVariant: Record<Task['status'], string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/15 text-primary border-primary/30',
  waiting: 'bg-secondary/30 text-secondary-foreground border-secondary/40',
  completed: 'bg-accent/15 text-accent border-accent/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function TaskStatusBadge({ status }: { status: Task['status'] }) {
  const closed = isClosedStatus(status);
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${statusVariant[status]} ${closed ? 'opacity-60 line-through' : ''}`}
    >
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}
