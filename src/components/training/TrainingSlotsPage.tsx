import { useState, useMemo, useCallback } from 'react';
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
import { Plus, Pencil, Trash2, AlertTriangle, AlertCircle, Users, Clock } from 'lucide-react';
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

function isSlotOutsideAvailability(slot: { facility_id: string; weekday: number; start_time: string; end_time: string }, availability: FacilityAvailability[]): boolean {
  const facAvail = availability.filter(a => a.facility_id === slot.facility_id && a.weekday === slot.weekday);
  if (facAvail.length === 0) return true;
  return !facAvail.some(a => timeToMinutes(slot.start_time) >= timeToMinutes(a.start_time) && timeToMinutes(slot.end_time) <= timeToMinutes(a.end_time));
}

interface ConflictInfo {
  slotId: string;
  message: string;
  count: number;
  capacity: number;
}

function findCapacityConflicts(slots: TrainingSlot[], facilities: Facility[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const facilityMap = new Map(facilities.map(f => [f.id, f]));

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

    for (let i = 0; i < groupSlots.length; i++) {
      const overlapping = groupSlots.filter(s =>
        timesOverlap(groupSlots[i].start_time, groupSlots[i].end_time, s.start_time, s.end_time)
      );
      if (overlapping.length > fac.simultaneous_capacity) {
        for (const s of overlapping) {
          if (!conflicts.find(c => c.slotId === s.id)) {
            conflicts.push({
              slotId: s.id,
              message: `${fac.name}: ${overlapping.length} samtidige hold (kapacitet: ${fac.simultaneous_capacity})`,
              count: overlapping.length,
              capacity: fac.simultaneous_capacity,
            });
          }
        }
      }
    }
  }
  return conflicts;
}

// Check conflicts for a form entry (preview before saving)
function checkFormConflicts(
  form: SlotForm,
  editingId: string | null,
  slots: TrainingSlot[],
  facilities: Facility[],
  availability: FacilityAvailability[]
): { capacityWarning: string | null; availabilityWarning: string | null } {
  const fac = facilities.find(f => f.id === form.facility_id);
  if (!fac || !form.start_time || !form.end_time) return { capacityWarning: null, availabilityWarning: null };

  // Check availability
  const outsideAvail = isSlotOutsideAvailability(
    { facility_id: form.facility_id, weekday: form.weekday, start_time: form.start_time, end_time: form.end_time },
    availability
  );
  const availabilityWarning = outsideAvail ? 'Dette pas ligger udenfor registreret haltilgængelighed' : null;

  // Check capacity
  const otherSlots = slots.filter(s => s.facility_id === form.facility_id && s.weekday === form.weekday && s.id !== editingId);
  const overlapping = otherSlots.filter(s => timesOverlap(form.start_time, form.end_time, s.start_time, s.end_time));
  const totalConcurrent = overlapping.length + 1; // +1 for the new/edited slot
  const capacityWarning = totalConcurrent > fac.simultaneous_capacity
    ? `Kapacitetskonflikt: ${totalConcurrent} samtidige hold i ${fac.name} (kapacitet: ${fac.simultaneous_capacity})`
    : null;

  return { capacityWarning, availabilityWarning };
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

  // Live warnings for form
  const formWarnings = useMemo(
    () => checkFormConflicts(form, editing?.id ?? null, slots, facilities, availability),
    [form, editing, slots, facilities, availability]
  );

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

  // Stats
  const uniqueTeams = [...new Set(slots.map(s => s.team_group_name))];
  const outsideAvailCount = slots.filter(s => isSlotOutsideAvailability(s, availability)).length;

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

      {/* Summary bar */}
      {slots.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{slots.length} pas</Badge>
          <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{uniqueTeams.length} hold</Badge>
          {conflicts.length > 0 && (
            <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{conflicts.length} kapacitetskonflikter</Badge>
          )}
          {outsideAvailCount > 0 && (
            <Badge variant="secondary" className="gap-1 border-secondary"><AlertCircle className="h-3 w-3" />{outsideAvailCount} udenfor tilgængelighed</Badge>
          )}
        </div>
      )}

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">Tabel</TabsTrigger>
          <TabsTrigger value="facility">Pr. facilitet</TabsTrigger>
          <TabsTrigger value="free">Kapacitetsoverblik</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          {slots.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Ingen træningspas i denne plan. Klik "Nyt træningspas" for at tilføje.
            </CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
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
                      <TableRow key={s.id} className={conflict ? 'bg-destructive/5' : outsideAvail ? 'bg-secondary/10' : ''}>
                        <TableCell className="pr-0">
                          {conflict && (
                            <Tooltip>
                              <TooltipTrigger><AlertTriangle className="h-4 w-4 text-destructive" /></TooltipTrigger>
                              <TooltipContent className="max-w-xs">{conflict.message}</TooltipContent>
                            </Tooltip>
                          )}
                          {!conflict && outsideAvail && (
                            <Tooltip>
                              <TooltipTrigger><AlertCircle className="h-4 w-4 text-secondary" /></TooltipTrigger>
                              <TooltipContent>Ligger udenfor registreret haltilgængelighed</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{WEEKDAYS[s.weekday]}</TableCell>
                        <TableCell className="font-mono text-sm">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</TableCell>
                        <TableCell>{facilityName(s.facility_id)}</TableCell>
                        <TableCell className="font-medium">{s.team_group_name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.subgroup_name ?? '–'}</TableCell>
                        <TableCell className="text-muted-foreground">{s.responsible_name ?? '–'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Slet træningspas?</AlertDialogTitle><AlertDialogDescription>Sletter {s.team_group_name} – {WEEKDAYS[s.weekday]} {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</AlertDialogDescription></AlertDialogHeader>
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

              const facConflicts = conflicts.filter(c => facSlots.some(s => s.id === c.slotId));

              return (
                <Card key={fac.id} className={facConflicts.length > 0 ? 'border-destructive/30' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      {fac.name}
                      <Badge variant="outline" className="gap-1 font-normal"><Users className="h-3 w-3" />Kapacitet: {fac.simultaneous_capacity}</Badge>
                      <Badge variant="outline" className="font-normal">{facSlots.length} pas</Badge>
                      {facConflicts.length > 0 && (
                        <Badge variant="destructive" className="gap-1 font-normal"><AlertTriangle className="h-3 w-3" />{facConflicts.length} konflikter</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {[1, 2, 3, 4, 5, 6, 7].map(day => {
                        const daySlots = facSlots.filter(s => s.weekday === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                        if (daySlots.length === 0) return null;
                        return (
                          <div key={day} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                            <span className="w-20 text-sm font-medium text-muted-foreground pt-0.5 shrink-0">{WEEKDAYS[day]}</span>
                            <div className="flex flex-wrap gap-1.5">
                              {daySlots.map(s => {
                                const hasConflict = conflicts.some(c => c.slotId === s.id);
                                const outsideAvail = isSlotOutsideAvailability(s, availability);
                                return (
                                  <Badge
                                    key={s.id}
                                    variant={hasConflict ? 'destructive' : outsideAvail ? 'secondary' : 'secondary'}
                                    className={`cursor-pointer text-xs ${hasConflict ? '' : outsideAvail ? 'border-secondary' : ''}`}
                                    onClick={() => openEdit(s)}
                                  >
                                    {hasConflict && <AlertTriangle className="h-3 w-3 mr-1" />}
                                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} {s.team_group_name}
                                    {s.subgroup_name ? ` (${s.subgroup_name})` : ''}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {facilities.every(fac => slots.filter(s => s.facility_id === fac.id).length === 0) && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Ingen træningspas at vise</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="free" className="mt-4">
          <FreeSlots facilities={facilities} availability={availability} slots={slots} />
        </TabsContent>
      </Tabs>

      {/* Slot dialog with live warnings */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Rediger træningspas' : 'Nyt træningspas'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Facilitet *</Label>
              <Select value={form.facility_id} onValueChange={v => setForm(f => ({ ...f, facility_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Vælg facilitet" /></SelectTrigger>
                <SelectContent>{facilities.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} <span className="text-muted-foreground">(kap. {f.simultaneous_capacity})</span>
                  </SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ugedag *</Label>
              <Select value={String(form.weekday)} onValueChange={v => setForm(f => ({ ...f, weekday: Number(v) }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{WEEKDAY_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start *</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div><Label>Slut *</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>

            {/* Live warnings */}
            {(formWarnings.capacityWarning || formWarnings.availabilityWarning) && (
              <div className="space-y-1.5">
                {formWarnings.capacityWarning && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />{formWarnings.capacityWarning}
                  </div>
                )}
                {formWarnings.availabilityWarning && (
                  <div className="flex items-center gap-2 rounded-md border border-secondary/50 bg-secondary/10 px-3 py-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0" />{formWarnings.availabilityWarning}
                  </div>
                )}
              </div>
            )}

            <div><Label>Holdgruppe *</Label><Input placeholder="Fx U15 piger" value={form.team_group_name} onChange={e => setForm(f => ({ ...f, team_group_name: e.target.value }))} /></div>
            <div><Label>Undergruppe</Label><Input placeholder="Fx Hold 1, Fællestræning" value={form.subgroup_name} onChange={e => setForm(f => ({ ...f, subgroup_name: e.target.value }))} /></div>
            <div><Label>Ansvarlig</Label><Input placeholder="Trænernavn" value={form.responsible_name} onChange={e => setForm(f => ({ ...f, responsible_name: e.target.value }))} /></div>
            <div><Label>Noter</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Valgfri noter" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annullér</Button>
            <Button onClick={handleSave} disabled={!form.facility_id || !form.team_group_name || !form.start_time || !form.end_time || createSlot.isPending || updateSlot.isPending}>
              {(createSlot.isPending || updateSlot.isPending) ? 'Gemmer…' : 'Gem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type SegmentStatus = 'free' | 'partial' | 'full';

interface TimeSegment {
  start: string;
  end: string;
  concurrent: number;
  capacity: number;
  remaining: number;
  status: SegmentStatus;
}

function minutesToStr(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function FreeSlots({ facilities, availability, slots }: { facilities: Facility[]; availability: FacilityAvailability[]; slots: TrainingSlot[] }) {
  const hasAvailability = facilities.some(fac => availability.some(a => a.facility_id === fac.id));

  if (!hasAvailability) {
    return (
      <Card><CardContent className="py-8 text-center text-muted-foreground">
        Ingen haltilgængelighed registreret. Tilføj tilgængelighed under fanen "Haltilgængelighed".
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/40" /> Ledigt</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500/40" /> Delvist optaget</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-destructive/20 border border-destructive/40" /> Fuldt optaget</span>
      </div>

      <div className="grid gap-6">
        {facilities.map(fac => {
          const facAvail = availability.filter(a => a.facility_id === fac.id);
          const facSlots = slots.filter(s => s.facility_id === fac.id);
          if (facAvail.length === 0) return null;

          return (
            <Card key={fac.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {fac.name}
                  <Badge variant="outline" className="font-normal gap-1"><Users className="h-3 w-3" />Kap. {fac.simultaneous_capacity}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => {
                    const dayAvail = facAvail.filter(a => a.weekday === day);
                    const daySlots = facSlots.filter(s => s.weekday === day);
                    if (dayAvail.length === 0) return null;

                    const segments: TimeSegment[] = [];

                    for (const av of dayAvail) {
                      const avStart = timeToMinutes(av.start_time);
                      const avEnd = timeToMinutes(av.end_time);

                      const timePoints = new Set<number>();
                      timePoints.add(avStart);
                      timePoints.add(avEnd);
                      for (const s of daySlots) {
                        const sStart = Math.max(timeToMinutes(s.start_time), avStart);
                        const sEnd = Math.min(timeToMinutes(s.end_time), avEnd);
                        if (sStart < sEnd) {
                          timePoints.add(sStart);
                          timePoints.add(sEnd);
                        }
                      }

                      const sorted = [...timePoints].sort((a, b) => a - b);
                      for (let i = 0; i < sorted.length - 1; i++) {
                        const segStart = sorted[i];
                        const segEnd = sorted[i + 1];
                        const concurrent = daySlots.filter(s => {
                          const sStart = timeToMinutes(s.start_time);
                          const sEnd = timeToMinutes(s.end_time);
                          return sStart < segEnd && sEnd > segStart;
                        }).length;

                        const remaining = fac.simultaneous_capacity - concurrent;
                        const status: SegmentStatus = concurrent === 0 ? 'free' : remaining > 0 ? 'partial' : 'full';

                        // Merge with previous if same status and remaining
                        const prev = segments[segments.length - 1];
                        if (prev && prev.end === minutesToStr(segStart) && prev.status === status && prev.remaining === remaining) {
                          prev.end = minutesToStr(segEnd);
                        } else {
                          segments.push({
                            start: minutesToStr(segStart),
                            end: minutesToStr(segEnd),
                            concurrent,
                            capacity: fac.simultaneous_capacity,
                            remaining,
                            status,
                          });
                        }
                      }
                    }

                    if (segments.length === 0) return null;

                    return (
                      <div key={day} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                        <span className="w-20 text-sm font-medium text-muted-foreground pt-0.5 shrink-0">{WEEKDAYS[day]}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {segments.map((seg, i) => {
                            const badgeClass =
                              seg.status === 'free'
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : seg.status === 'partial'
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                  : 'border-destructive/40 bg-destructive/10 text-destructive';
                            return (
                              <Badge key={i} variant="outline" className={`text-xs gap-1 ${badgeClass}`}>
                                {seg.start} – {seg.end}
                                {seg.status === 'free' && ' Ledigt'}
                                {seg.status === 'partial' && (
                                  <span>Restkapacitet {seg.remaining}/{seg.capacity}</span>
                                )}
                                {seg.status === 'full' && ' Fuldt'}
                              </Badge>
                            );
                          })}
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
    </div>
  );
}
