import { useState, useMemo } from 'react';
import { useTrainingSlots, useCreateTrainingSlot, useUpdateTrainingSlot, useDeleteTrainingSlot } from '@/hooks/useTrainingSlots';
import { useFacilities } from '@/hooks/useFacilities';
import { useFacilityAvailability } from '@/hooks/useFacilityAvailability';
import { useTrainingPlans } from '@/hooks/useTrainingPlans';
import type { TrainingSlot, Facility, FacilityAvailability } from '@/types/training';
import { WEEKDAYS, WEEKDAY_OPTIONS } from '@/types/training';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, AlertTriangle, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SlotForm {
  facility_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  team_group_name: string;
  subgroup_name: string;
  responsible_name: string;
  notes: string;
}

const emptySlotForm: SlotForm = {
  facility_id: '', weekday: 1, start_time: '17:00', end_time: '18:30',
  team_group_name: '', subgroup_name: '', responsible_name: '', notes: '',
};

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(a1: string, a2: string, b1: string, b2: string) {
  return timeToMinutes(a1) < timeToMinutes(b2) && timeToMinutes(b1) < timeToMinutes(a2);
}

function isSlotOutsideAvailability(slot: TrainingSlot, availability: FacilityAvailability[]): boolean {
  const facAvail = availability.filter(a => a.facility_id === slot.facility_id && a.weekday === slot.weekday);
  if (facAvail.length === 0) return true;
  // Check if slot fits within any availability window
  return !facAvail.some(a => timeToMinutes(slot.start_time) >= timeToMinutes(a.start_time) && timeToMinutes(slot.end_time) <= timeToMinutes(a.end_time));
}

interface ConflictInfo {
  slotId: string;
  message: string;
}

function findCapacityConflicts(slots: TrainingSlot[], facilities: Facility[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const facilityMap = new Map(facilities.map(f => [f.id, f]));

  // Group by facility + weekday
  const groups = new Map<string, TrainingSlot[]>();
  for (const s of slots) {
    const key = `${s.facility_id}_${s.weekday}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  for (const [key, groupSlots] of groups) {
    const facId = key.split('_')[0];
    const fac = facilityMap.get(facId);
    if (!fac) continue;

    // Check each pair for overlaps
    for (let i = 0; i < groupSlots.length; i++) {
      for (let j = i + 1; j < groupSlots.length; j++) {
        if (timesOverlap(groupSlots[i].start_time, groupSlots[i].end_time, groupSlots[j].start_time, groupSlots[j].end_time)) {
          // Count how many overlap at this time
          const overlapping = groupSlots.filter(s =>
            timesOverlap(groupSlots[i].start_time, groupSlots[i].end_time, s.start_time, s.end_time)
          );
          if (overlapping.length > fac.simultaneous_capacity) {
            for (const s of overlapping) {
              if (!conflicts.find(c => c.slotId === s.id)) {
                conflicts.push({
                  slotId: s.id,
                  message: `${fac.name}: ${overlapping.length} samtidige hold (kapacitet: ${fac.simultaneous_capacity})`,
                });
              }
            }
          }
        }
      }
    }
  }
  return conflicts;
}

export default function TrainingSlotsPage({ planId }: { planId: string }) {
  const { data: slots = [], isLoading } = useTrainingSlots(planId);
  const { data: facilities = [] } = useFacilities();
  const { data: availability = [] } = useFacilityAvailability();
  const { data: plans = [] } = useTrainingPlans();
  const createSlot = useCreateTrainingSlot();
  const updateSlot = useUpdateTrainingSlot();
  const deleteSlot = useDeleteTrainingSlot();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingSlot | null>(null);
  const [form, setForm] = useState<SlotForm>(emptySlotForm);

  const plan = plans.find(p => p.id === planId);
  const conflicts = useMemo(() => findCapacityConflicts(slots, facilities), [slots, facilities]);

  const openNew = () => { setEditing(null); setForm({ ...emptySlotForm, facility_id: facilities[0]?.id ?? '' }); setDialogOpen(true); };
  const openEdit = (s: TrainingSlot) => {
    setEditing(s);
    setForm({
      facility_id: s.facility_id,
      weekday: s.weekday,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      team_group_name: s.team_group_name,
      subgroup_name: s.subgroup_name ?? '',
      responsible_name: s.responsible_name ?? '',
      notes: s.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      training_plan_id: planId,
      facility_id: form.facility_id,
      weekday: form.weekday,
      start_time: form.start_time,
      end_time: form.end_time,
      team_group_name: form.team_group_name,
      subgroup_name: form.subgroup_name || null,
      responsible_name: form.responsible_name || null,
      notes: form.notes || null,
    };
    if (editing) {
      await updateSlot.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createSlot.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const facilityName = (id: string) => facilities.find(f => f.id === id)?.name ?? 'Ukendt';

  if (isLoading) return <div className="text-muted-foreground">Indlæser træningspas…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Træningspas</h2>
          {plan && <p className="text-sm text-muted-foreground">Plan: {plan.name}</p>}
        </div>
        <Button onClick={openNew} disabled={facilities.length === 0}><Plus className="mr-2 h-4 w-4" />Nyt træningspas</Button>
      </div>

      {conflicts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{conflicts.length} kapacitetskonflikt(er) fundet</span>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Tabel</TabsTrigger>
          <TabsTrigger value="facility">Pr. facilitet</TabsTrigger>
          <TabsTrigger value="free">Ledige tider</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          {slots.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Ingen træningspas i denne plan</CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ugedag</TableHead>
                    <TableHead>Tid</TableHead>
                    <TableHead>Facilitet</TableHead>
                    <TableHead>Hold</TableHead>
                    <TableHead>Undergruppe</TableHead>
                    <TableHead>Ansvarlig</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map(s => {
                    const conflict = conflicts.find(c => c.slotId === s.id);
                    const outsideAvail = isSlotOutsideAvailability(s, availability);
                    return (
                      <TableRow key={s.id} className={conflict ? 'bg-destructive/5' : outsideAvail ? 'bg-secondary/20' : ''}>
                        <TableCell>{WEEKDAYS[s.weekday]}</TableCell>
                        <TableCell className="font-mono text-sm">{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</TableCell>
                        <TableCell>{facilityName(s.facility_id)}</TableCell>
                        <TableCell className="font-medium">{s.team_group_name}</TableCell>
                        <TableCell>{s.subgroup_name ?? '–'}</TableCell>
                        <TableCell>{s.responsible_name ?? '–'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {conflict && (
                              <Tooltip>
                                <TooltipTrigger><AlertTriangle className="h-4 w-4 text-destructive" /></TooltipTrigger>
                                <TooltipContent>{conflict.message}</TooltipContent>
                              </Tooltip>
                            )}
                            {outsideAvail && (
                              <Tooltip>
                                <TooltipTrigger><AlertCircle className="h-4 w-4 text-secondary" /></TooltipTrigger>
                                <TooltipContent>Ligger udenfor registreret haltilgængelighed</TooltipContent>
                              </Tooltip>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Slet træningspas?</AlertDialogTitle><AlertDialogDescription>Sletter dette træningspas.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Annullér</AlertDialogCancel><AlertDialogAction onClick={() => deleteSlot.mutate(s.id)}>Slet</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="facility" className="mt-4">
          <div className="grid gap-6">
            {facilities.map(fac => {
              const facSlots = slots.filter(s => s.facility_id === fac.id);
              if (facSlots.length === 0) return null;
              return (
                <Card key={fac.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {fac.name}
                      <Badge variant="outline">Kapacitet: {fac.simultaneous_capacity}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-1">
                      {[1,2,3,4,5,6,7].map(day => {
                        const daySlots = facSlots.filter(s => s.weekday === day);
                        if (daySlots.length === 0) return null;
                        return (
                          <div key={day} className="flex items-start gap-3 py-1.5 border-b border-border last:border-0">
                            <span className="w-20 text-sm font-medium text-muted-foreground">{WEEKDAYS[day]}</span>
                            <div className="flex flex-wrap gap-2">
                              {daySlots.map(s => (
                                <Badge key={s.id} variant="secondary" className="cursor-pointer" onClick={() => openEdit(s)}>
                                  {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)} {s.team_group_name}{s.subgroup_name ? ` (${s.subgroup_name})` : ''}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="free" className="mt-4">
          <FreeSlots facilities={facilities} availability={availability} slots={slots} />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Rediger træningspas' : 'Nyt træningspas'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Facilitet</Label>
              <Select value={form.facility_id} onValueChange={v => setForm(f => ({ ...f, facility_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{facilities.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ugedag</Label>
              <Select value={String(form.weekday)} onValueChange={v => setForm(f => ({ ...f, weekday: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WEEKDAY_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div><Label>Slut</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>
            <div><Label>Holdgruppe</Label><Input placeholder="Fx U15 piger" value={form.team_group_name} onChange={e => setForm(f => ({ ...f, team_group_name: e.target.value }))} /></div>
            <div><Label>Undergruppe (valgfrit)</Label><Input placeholder="Fx Hold 1, Fællestræning" value={form.subgroup_name} onChange={e => setForm(f => ({ ...f, subgroup_name: e.target.value }))} /></div>
            <div><Label>Ansvarlig (valgfrit)</Label><Input value={form.responsible_name} onChange={e => setForm(f => ({ ...f, responsible_name: e.target.value }))} /></div>
            <div><Label>Noter (valgfrit)</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annullér</Button>
            <Button onClick={handleSave} disabled={!form.facility_id || !form.team_group_name}>Gem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FreeSlots({ facilities, availability, slots }: { facilities: Facility[]; availability: FacilityAvailability[]; slots: TrainingSlot[] }) {
  return (
    <div className="grid gap-6">
      {facilities.map(fac => {
        const facAvail = availability.filter(a => a.facility_id === fac.id);
        const facSlots = slots.filter(s => s.facility_id === fac.id);
        if (facAvail.length === 0) return null;

        return (
          <Card key={fac.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{fac.name} – Ledige tider</CardTitle>
            </CardHeader>
            <CardContent>
              {[1,2,3,4,5,6,7].map(day => {
                const dayAvail = facAvail.filter(a => a.weekday === day);
                const daySlots = facSlots.filter(s => s.weekday === day);
                if (dayAvail.length === 0) return null;

                // Calculate free windows for each availability block
                const freeWindows: { start: string; end: string }[] = [];
                for (const av of dayAvail) {
                  const avStart = timeToMinutes(av.start_time);
                  const avEnd = timeToMinutes(av.end_time);
                  // Get sorted slot intervals within this availability
                  const overlapping = daySlots
                    .filter(s => timesOverlap(av.start_time, av.end_time, s.start_time, s.end_time))
                    .map(s => ({ start: Math.max(timeToMinutes(s.start_time), avStart), end: Math.min(timeToMinutes(s.end_time), avEnd) }))
                    .sort((a, b) => a.start - b.start);

                  // Account for simultaneous capacity
                  // Simple approach: if capacity allows more, mark as partially free
                  const concurrent = daySlots.filter(s => timesOverlap(av.start_time, av.end_time, s.start_time, s.end_time));
                  if (concurrent.length < fac.simultaneous_capacity && concurrent.length > 0) {
                    // Entire block is partially free (has capacity left)
                    freeWindows.push({ start: av.start_time.slice(0,5), end: av.end_time.slice(0,5) });
                    continue;
                  }

                  let cursor = avStart;
                  for (const ol of overlapping) {
                    if (ol.start > cursor) {
                      freeWindows.push({
                        start: `${String(Math.floor(cursor/60)).padStart(2,'0')}:${String(cursor%60).padStart(2,'0')}`,
                        end: `${String(Math.floor(ol.start/60)).padStart(2,'0')}:${String(ol.start%60).padStart(2,'0')}`,
                      });
                    }
                    cursor = Math.max(cursor, ol.end);
                  }
                  if (cursor < avEnd) {
                    freeWindows.push({
                      start: `${String(Math.floor(cursor/60)).padStart(2,'0')}:${String(cursor%60).padStart(2,'0')}`,
                      end: `${String(Math.floor(avEnd/60)).padStart(2,'0')}:${String(avEnd%60).padStart(2,'0')}`,
                    });
                  }
                }

                if (freeWindows.length === 0) return null;

                return (
                  <div key={day} className="flex items-center gap-3 py-1 border-b border-border last:border-0">
                    <span className="w-20 text-sm font-medium text-muted-foreground">{WEEKDAYS[day]}</span>
                    <div className="flex flex-wrap gap-2">
                      {freeWindows.map((w, i) => (
                        <Badge key={i} variant="outline" className="text-accent border-accent/30">
                          {w.start} – {w.end}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
