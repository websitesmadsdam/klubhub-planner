import { formatDate, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskStatusBadge } from './TaskStatusBadge';
import { useTask, useTaskParticipants, useDeleteTask } from '@/hooks/useTasks';
import { TASK_TYPE_LABELS, AREA_OPTIONS } from '@/types/tasks';
import { Pencil, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TaskDetailProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
}

export function TaskDetail({ taskId, open, onClose, onEdit }: TaskDetailProps) {
  const { data: task, isLoading } = useTask(taskId ?? undefined);
  const { data: participants = [] } = useTaskParticipants(taskId ?? undefined);
  const deleteTask = useDeleteTask();

  const fmt = (d: string | null) => formatDate(d);

  const fmtDateTime = (d: string | null) => formatDateTime(d);

  const handleDelete = async () => {
    if (!taskId) return;
    await deleteTask.mutateAsync(taskId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isLoading ? 'Indlæser…' : task?.title ?? 'Opgave'}</DialogTitle>
        </DialogHeader>
        {task && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TaskStatusBadge status={task.status} />
              <span className="text-sm text-muted-foreground">{TASK_TYPE_LABELS[task.task_type] || task.task_type}</span>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <Field label="Ansvarsområde" value={task.area || '—'} />
              <Field label="Prioritet" value={task.priority === 'high' ? 'Høj' : task.priority === 'low' ? 'Lav' : 'Normal'} />
              <Field label="Periode" value={task.period_start ? `${fmt(task.period_start)} – ${fmt(task.period_end)}` : '—'} />
              <Field label="Deadline" value={fmt(task.deadline)} />
              <Field label="Primær ansvarlig" value={task.responsible?.full_name || task.responsible?.email || '—'} />
              <Field label="Øvrige deltagere" value={
                participants.length > 0
                  ? participants.map(p => p.profile?.full_name || p.profile?.email || 'Ukendt').join(', ')
                  : '—'
              } />
            </div>

            {task.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Beskrivelse</p>
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-y-2 text-xs text-muted-foreground border-t border-border pt-3">
              <span>Oprettet: {fmtDateTime(task.created_at)}</span>
              <span>Opdateret: {fmtDateTime(task.updated_at)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1 h-4 w-4" /> Slet
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Slet opgave</AlertDialogTitle>
                    <AlertDialogDescription>Er du sikker på, at du vil slette "{task.title}"?</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuller</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Slet</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" size="sm" onClick={() => { onClose(); onEdit(task.id); }}>
                <Pencil className="mr-1 h-4 w-4" /> Rediger
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
