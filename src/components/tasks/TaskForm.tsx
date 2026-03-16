import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateTask, useUpdateTask, useTask, useTaskParticipants, useSetTaskParticipants } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS, AREA_OPTIONS, monthToSeasonDate, type TaskTemplate } from '@/types/tasks';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  editTaskId?: string | null;
  template?: TaskTemplate | null;
  seasonLabel?: string | null;
}

export function TaskForm({ open, onClose, editTaskId, template, seasonLabel }: TaskFormProps) {
  const { user } = useAuth();
  const { data: profiles = [] } = useProfiles();
  const { data: existingTask } = useTask(editTaskId ?? undefined);
  const { data: existingParticipants = [] } = useTaskParticipants(editTaskId ?? undefined);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const setParticipants = useSetTaskParticipants();

  const [form, setForm] = useState({
    title: '',
    description: '',
    area: '',
    task_type: 'ad_hoc',
    status: 'not_started' as string,
    period_start: '',
    period_end: '',
    deadline: '',
    responsible_user_id: '',
  });
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Populate form from existing task or template
  useEffect(() => {
    if (editTaskId && existingTask) {
      setForm({
        title: existingTask.title || '',
        description: existingTask.description || '',
        area: existingTask.area || '',
        task_type: existingTask.task_type || 'ad_hoc',
        status: existingTask.status,
        period_start: existingTask.period_start || '',
        period_end: existingTask.period_end || '',
        deadline: existingTask.deadline || '',
        responsible_user_id: existingTask.responsible_user_id || '',
      });
      setSelectedParticipants(existingParticipants.map(p => p.user_id));
    } else if (template) {
      const sl = seasonLabel || '';
      setForm({
        title: template.title,
        description: template.description || '',
        area: template.area || '',
        task_type: 'yearwheel',
        status: 'not_started',
        period_start: template.default_period_start_month && sl
          ? monthToSeasonDate(template.default_period_start_month, sl)
          : '',
        period_end: template.default_period_end_month && sl
          ? monthToSeasonDate(template.default_period_end_month, sl)
          : '',
        deadline: '',
        responsible_user_id: '',
      });
      setSelectedParticipants([]);
    } else if (!editTaskId) {
      setForm({
        title: '', description: '', area: '', task_type: 'ad_hoc',
        status: 'not_started', period_start: '', period_end: '',
        deadline: '', responsible_user_id: '',
      });
      setSelectedParticipants([]);
    }
  }, [editTaskId, existingTask, existingParticipants, template, seasonLabel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, any> = {
      title: form.title,
      description: form.description || null,
      area: form.area || null,
      task_type: form.task_type,
      status: form.status,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      deadline: form.deadline || null,
      responsible_user_id: form.responsible_user_id || null,
    };

    // If creating from template, attach template_id and season_label
    if (!editTaskId && template && seasonLabel) {
      payload.template_id = template.id;
      payload.season_label = seasonLabel;
    }

    try {
      if (editTaskId) {
        await updateTask.mutateAsync({ id: editTaskId, ...payload });
        await setParticipants.mutateAsync({ taskId: editTaskId, userIds: selectedParticipants });
      } else {
        payload.created_by = user?.id || null;
        const created = await createTask.mutateAsync(payload);
        if (selectedParticipants.length > 0) {
          await setParticipants.mutateAsync({ taskId: created.id, userIds: selectedParticipants });
        }
      }
      onClose();
    } catch {
      // error handled by mutation
    }
  };

  const toggleParticipant = (uid: string) => {
    setSelectedParticipants(prev =>
      prev.includes(uid) ? prev.filter(p => p !== uid) : [...prev, uid]
    );
  };

  const isSubmitting = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editTaskId ? 'Rediger opgave' : 'Ny opgave'}
            {template && seasonLabel && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                Sæson {seasonLabel}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Titel *</Label>
            <Input id="title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea id="description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ansvarsområde</Label>
              <Select value={form.area} onValueChange={v => setForm(f => ({ ...f, area: v }))}>
                <SelectTrigger><SelectValue placeholder="Vælg…" /></SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.task_type} onValueChange={v => setForm(f => ({ ...f, task_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="period_start">Periode fra</Label>
              <Input id="period_start" type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="period_end">Periode til</Label>
              <Input id="period_end" type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
          <div>
            <Label>Primær ansvarlig</Label>
            <Select value={form.responsible_user_id} onValueChange={v => setForm(f => ({ ...f, responsible_user_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Vælg…" /></SelectTrigger>
              <SelectContent>
                {profiles.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || 'Ukendt'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Øvrige deltagere</Label>
            <div className="mt-1 space-y-1 max-h-32 overflow-y-auto rounded border border-input p-2">
              {profiles.filter(p => p.id !== form.responsible_user_id).map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedParticipants.includes(p.id)}
                    onCheckedChange={() => toggleParticipant(p.id)}
                  />
                  {p.full_name || p.email || 'Ukendt'}
                </label>
              ))}
              {profiles.filter(p => p.id !== form.responsible_user_id).length === 0 && (
                <p className="text-sm text-muted-foreground">Ingen andre brugere</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuller</Button>
            <Button type="submit" disabled={isSubmitting || !form.title.trim()}>
              {isSubmitting ? 'Gemmer…' : editTaskId ? 'Gem ændringer' : 'Opret opgave'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
