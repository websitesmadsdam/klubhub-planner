import { useState } from 'react';
import { useTrainingPlans, useCreateTrainingPlan, useUpdateTrainingPlan, useDeleteTrainingPlan, usePublishPlan, useCopyPlan } from '@/hooks/useTrainingPlans';
import { useTrainingSlots } from '@/hooks/useTrainingSlots';
import type { TrainingPlan } from '@/types/training';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Copy, Upload, Trash2, Pencil, LayoutGrid, CalendarDays } from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active: { label: 'Aktiv', variant: 'default' },
  draft: { label: 'Kladde', variant: 'secondary' },
  archived: { label: 'Arkiveret', variant: 'outline' },
};

interface PlanFormData {
  name: string;
  description: string;
  valid_from: string;
  valid_to: string;
}

function SlotCount({ planId }: { planId: string }) {
  const { data: slots = [] } = useTrainingSlots(planId);
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <LayoutGrid className="h-3 w-3" />{slots.length} pas
    </span>
  );
}

export default function TrainingPlansPage({ onNavigateToSlots }: { onNavigateToSlots?: (planId: string) => void }) {
  const { data: plans = [], isLoading } = useTrainingPlans();
  const createPlan = useCreateTrainingPlan();
  const updatePlan = useUpdateTrainingPlan();
  const deletePlan = useDeleteTrainingPlan();
  const publishPlan = usePublishPlan();
  const copyPlan = useCopyPlan();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TrainingPlan | null>(null);
  const [form, setForm] = useState<PlanFormData>({ name: '', description: '', valid_from: '', valid_to: '' });

  const openNew = () => {
    setEditingPlan(null);
    setForm({ name: '', description: '', valid_from: new Date().toISOString().slice(0, 10), valid_to: '' });
    setDialogOpen(true);
  };

  const openEdit = (p: TrainingPlan) => {
    setEditingPlan(p);
    setForm({ name: p.name, description: p.description ?? '', valid_from: p.valid_from, valid_to: p.valid_to ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      name: form.name,
      description: form.description || null,
      valid_from: form.valid_from,
      valid_to: form.valid_to || null,
    };
    if (editingPlan) {
      await updatePlan.mutateAsync({ id: editingPlan.id, ...payload });
    } else {
      await createPlan.mutateAsync({ ...payload, status: 'draft' });
    }
    setDialogOpen(false);
  };

  const activePlan = plans.find(p => p.status === 'active');

  // Sort: active first, then drafts, then archived
  const sortedPlans = [...plans].sort((a, b) => {
    const order = { active: 0, draft: 1, archived: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  if (isLoading) return <div className="text-muted-foreground">Indlæser planer…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Træningsplaner</h2>
          <p className="text-sm text-muted-foreground">Administrér klubbens træningsplaner. Kun én plan kan være aktiv ad gangen.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Ny plan</Button>
      </div>

      {plans.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Ingen planer oprettet endnu. Opret en plan for at begynde at tilføje træningspas.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {sortedPlans.map(plan => {
            const cfg = statusConfig[plan.status] ?? { label: plan.status, variant: 'outline' as const };
            return (
              <Card key={plan.id} className={plan.status === 'active' ? 'border-primary/40 bg-primary/5' : ''}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      {plan.name}
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </CardTitle>
                    {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(plan)} title="Rediger"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => copyPlan.mutate(plan.id)} title="Kopiér som kladde" disabled={copyPlan.isPending}><Copy className="h-4 w-4" /></Button>
                    {plan.status === 'draft' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Publicér som aktiv"><Upload className="h-4 w-4 text-primary" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Publicér plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {activePlan
                                ? `Den nuværende aktive plan "${activePlan.name}" vil blive arkiveret, og "${plan.name}" bliver den nye aktive plan.`
                                : `"${plan.name}" vil blive sat som den aktive plan.`}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annullér</AlertDialogCancel>
                            <AlertDialogAction onClick={() => publishPlan.mutate(plan.id)}>Publicér</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {plan.status !== 'active' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Slet plan?</AlertDialogTitle>
                            <AlertDialogDescription>Planen og alle dens træningspas slettes permanent.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annullér</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deletePlan.mutate(plan.id)}>Slet</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {plan.valid_from}{plan.valid_to ? ` → ${plan.valid_to}` : ' →'}
                    </span>
                    <SlotCount planId={plan.id} />
                    {onNavigateToSlots && (
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => onNavigateToSlots(plan.id)}>
                        Se træningspas →
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Rediger plan' : 'Ny træningsplan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Navn *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Fx Sæson 2025/26" /></div>
            <div><Label>Beskrivelse</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Valgfri beskrivelse" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Gyldig fra *</Label><Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></div>
              <div><Label>Gyldig til</Label><Input type="date" value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annullér</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.valid_from || createPlan.isPending || updatePlan.isPending}>
              {(createPlan.isPending || updatePlan.isPending) ? 'Gemmer…' : 'Gem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
