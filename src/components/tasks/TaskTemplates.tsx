import { useState } from 'react';
import { Plus, Pencil, Trash2, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTaskTemplates, useCreateTaskTemplate, useUpdateTaskTemplate, useDeleteTaskTemplate } from '@/hooks/useTaskTemplates';
import { AREA_OPTIONS, type TaskTemplate } from '@/types/tasks';

const MONTHS = [
  'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'December',
];

interface Props {
  onCreateFromTemplate: (t: TaskTemplate) => void;
}

export function TaskTemplates({ onCreateFromTemplate }: Props) {
  const { data: templates = [], isLoading } = useTaskTemplates();
  const createTemplate = useCreateTaskTemplate();
  const updateTemplate = useUpdateTaskTemplate();
  const deleteTemplate = useDeleteTaskTemplate();

  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    area: '',
    default_period_start_month: '',
    default_period_end_month: '',
    is_active: true,
  });

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', area: '', default_period_start_month: '', default_period_end_month: '', is_active: true });
    setFormOpen(true);
  };

  const openEdit = (t: TaskTemplate) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || '',
      area: t.area || '',
      default_period_start_month: t.default_period_start_month?.toString() || '',
      default_period_end_month: t.default_period_end_month?.toString() || '',
      is_active: t.is_active,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description || null,
      area: form.area || null,
      default_period_start_month: form.default_period_start_month ? parseInt(form.default_period_start_month) : null,
      default_period_end_month: form.default_period_end_month ? parseInt(form.default_period_end_month) : null,
      is_active: form.is_active,
    };
    if (editing) {
      await updateTemplate.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createTemplate.mutateAsync(payload);
    }
    setFormOpen(false);
  };

  const toggleActive = (t: TaskTemplate) => {
    updateTemplate.mutate({ id: t.id, is_active: !t.is_active });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Ny skabelon
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Indlæser…</div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
          Ingen skabeloner endnu
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Ansvarsområde</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell className="text-muted-foreground">{t.area || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.default_period_start_month
                      ? `${MONTHS[t.default_period_start_month - 1]}${t.default_period_end_month ? ` – ${MONTHS[t.default_period_end_month - 1]}` : ''}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? 'default' : 'secondary'} className="text-xs">
                      {t.is_active ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Opret opgave" onClick={() => onCreateFromTemplate(t)}>
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(t)}>
                        <Switch checked={t.is_active} className="pointer-events-none scale-75" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Slet skabelon</AlertDialogTitle>
                            <AlertDialogDescription>Er du sikker?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuller</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTemplate.mutate(t.id)}>Slet</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Template form dialog */}
      <Dialog open={formOpen} onOpenChange={v => !v && setFormOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Rediger skabelon' : 'Ny skabelon'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tpl-title">Titel *</Label>
              <Input id="tpl-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="tpl-desc">Beskrivelse</Label>
              <Textarea id="tpl-desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Ansvarsområde</Label>
              <Select value={form.area} onValueChange={v => setForm(f => ({ ...f, area: v }))}>
                <SelectTrigger><SelectValue placeholder="Vælg…" /></SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Startmåned</Label>
                <Select value={form.default_period_start_month} onValueChange={v => setForm(f => ({ ...f, default_period_start_month: v }))}>
                  <SelectTrigger><SelectValue placeholder="Vælg…" /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Slutmåned</Label>
                <Select value={form.default_period_end_month} onValueChange={v => setForm(f => ({ ...f, default_period_end_month: v }))}>
                  <SelectTrigger><SelectValue placeholder="Vælg…" /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Aktiv</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Annuller</Button>
              <Button type="submit" disabled={!form.title.trim()}>
                {editing ? 'Gem ændringer' : 'Opret skabelon'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
