import { useState, useMemo, useCallback } from 'react';
import { useTrainingSlots, useCreateTrainingSlot, useUpdateTrainingSlot, useDeleteTrainingSlot } from '@/hooks/useTrainingSlots';
import { useFacilities } from '@/hooks/useFacilities';
import { useFacilityAvailability } from '@/hooks/useFacilityAvailability';
import { useTrainingPlans } from '@/hooks/useTrainingPlans';
import { useTeams } from '@/hooks/useTeams';
import { usePersons } from '@/hooks/usePersons';
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
import { Plus, Pencil, Trash2, AlertTriangle, AlertCircle, Users, Clock, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SlotForm {
  facility_id: string;
  team_id: string;
  person_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  team_group_name: string;
  subgroup_name: string;
  responsible_name: string;
  notes: string;
}

const emptySlotForm: SlotForm = {
  facility_id: '', team_id: '', person_id: '', weekday: 1, start_time: '17:00', end_time: '18:30',
  team_group_name: '', subgroup_name: '', responsible_name: '', notes: '',
};

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(a1: string, a2: string, b1: string, b2: string) {
  return timeToMinutes(a1) < timeToMinutes(b2) && timeToMinutes(b1) < timeToMinutes(a2);
}

function toUtcDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function overlapsOnWeekday(
  aFrom: string,
  aTo: string | null,
  bFrom: string,
  bTo: string | null,
  weekday: number
): boolean {
  const overlapStart = toUtcDate(aFrom > bFrom ? aFrom : bFrom);
  const overlapEnd = toUtcDate((aTo ?? '9999-12-31') < (bTo ?? '9999-12-31') ? (aTo ?? '9999-12-31') : (bTo ?? '9999-12-31'));

  if (overlapStart > overlapEnd) return false;

  const targetJsWeekday = weekday % 7; // 1..6 => 1..6, 7 (søndag) => 0
  const startJsWeekday = overlapStart.getUTCDay();
  const daysUntilTarget = (targetJsWeekday - startJsWeekday + 7) % 7;

  const firstMatchingDate = new Date(overlapStart);
  firstMatchingDate.setUTCDate(firstMatchingDate.getUTCDate() + daysUntilTarget);

  return firstMatchingDate <= overlapEnd;
}

function availabilityAppliesToPlan(
  av: Pick<FacilityAvailability, 'valid_from' | 'valid_to' | 'weekday'>,
  plan?: { valid_from: string; valid_to: string | null }
): boolean {
  if (!plan) return true;
  return overlapsOnWeekday(av.valid_from, av.valid_to, plan.valid_from, plan.valid_to, av.weekday);
}

function isSlotOutsideAvailability(
  slot: { facility_id: string; weekday: number; start_time: string; end_time: string },
  availability: FacilityAvailability[],
  plan?: { valid_from: string; valid_to: string | null }
): boolean {
  const facAvail = availability.filter(a =>
    a.facility_id === slot.facility_id &&
    a.weekday === slot.weekday &&
    availabilityAppliesToPlan(a, plan)
  );
  if (facAvail.length === 0) return true;
  return !facAvail.some(a => timeToMinutes(slot.start_time) >= timeToMinutes(a.start_time) && timeToMinutes(slot.end_time) <= timeToMinutes(a.end_time));
}

interface ConflictInfo {
  slotId: string;
  message: string;
  count: number;
  capacity: number;
}

interface IntervalLike {
  id: string;
  start_time: string;
  end_time: string;
}

function getMaxConcurrentBySlot(intervals: IntervalLike[]): Map<string, number> {
  const parsed = intervals
    .map(i => ({ id: i.id, start: timeToMinutes(i.start_time), end: timeToMinutes(i.end_time) }))
    .filter(i => i.end > i.start);

  const points = [...new Set(parsed.flatMap(i => [i.start, i.end]))].sort((a, b) => a - b);
  const maxBySlot = new Map<string, number>();

  for (let i = 0; i < points.length - 1; i++) {
    const segStart = points[i];
    const segEnd = points[i + 1];
    if (segEnd <= segStart) continue;

    const active = parsed.filter(p => p.start < segEnd && segStart < p.end);
    const concurrent = active.length;

    for (const slot of active) {
      maxBySlot.set(slot.id, Math.max(maxBySlot.get(slot.id) ?? 0, concurrent));
    }
  }

  return maxBySlot;
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

    const maxConcurrentBySlot = getMaxConcurrentBySlot(groupSlots);

    for (const slot of groupSlots) {
      const concurrent = maxConcurrentBySlot.get(slot.id) ?? 0;
      if (concurrent > fac.simultaneous_capacity) {
        conflicts.push({
          slotId: slot.id,
          message: `${fac.location} · ${fac.name}: ${concurrent} samtidige hold (kapacitet: ${fac.simultaneous_capacity})`,
          count: concurrent,
          capacity: fac.simultaneous_capacity,
        });
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
  availability: FacilityAvailability[],
  plan?: { valid_from: string; valid_to: string | null }
): { capacityWarning: string | null; availabilityWarning: string | null } {
  const fac = facilities.find(f => f.id === form.facility_id);
  if (!fac || !form.start_time || !form.end_time) return { capacityWarning: null, availabilityWarning: null };

  // Check availability
  const outsideAvail = isSlotOutsideAvailability(
    { facility_id: form.facility_id, weekday: form.weekday, start_time: form.start_time, end_time: form.end_time },
    availability,
    plan
  );
  const availabilityWarning = outsideAvail ? 'Dette pas ligger udenfor registreret haltilgængelighed' : null;

  // Check capacity
  const otherSlots = slots.filter(s => s.facility_id === form.facility_id && s.weekday === form.weekday && s.id !== editingId);
  const previewId = '__preview__';
  const maxConcurrentBySlot = getMaxConcurrentBySlot([
    ...otherSlots,
    {
      id: previewId,
      start_time: form.start_time,
      end_time: form.end_time,
    },
  ]);
  const totalConcurrent = maxConcurrentBySlot.get(previewId) ?? 1;
  const capacityWarning = totalConcurrent > fac.simultaneous_capacity
    ? `Kapacitetskonflikt: ${totalConcurrent} samtidige hold i ${fac.location} · ${fac.name} (kapacitet: ${fac.simultaneous_capacity})`
    : null;

  return { capacityWarning, availabilityWarning };
}

type SlotSortKey = 'weekday' | 'time' | 'facility' | 'team' | 'subgroup' | 'coach';
type SlotSortDir = 'asc' | 'desc';

export default function TrainingSlotsPage({ planId }: { planId: string }) {
  const { data: slots = [], isLoading } = useTrainingSlots(planId);
  const { data: facilities = [] } = useFacilities();
  const { data: availability = [] } = useFacilityAvailability();
  const { data: plans = [] } = useTrainingPlans();
  const { data: teams = [] } = useTeams();
  const { data: persons = [] } = usePersons();
  const createSlot = useCreateTrainingSlot();
  const updateSlot = useUpdateTrainingSlot();
  const deleteSlot = useDeleteTrainingSlot();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingSlot | null>(null);
  const [form, setForm] = useState<SlotForm>(emptySlotForm);
  const [sortKey, setSortKey] = useState<SlotSortKey>('weekday');
  const [sortDir, setSortDir] = useState<SlotSortDir>('asc');

  const toggleSort = useCallback((key: SlotSortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return key;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sortedSlots = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const fn = (fId: string) => {
      const fac = facilities.find(f => f.id === fId);
      return fac ? `${fac.location} ${fac.name}` : '';
    };
    const comparators: Record<SlotSortKey, (a: TrainingSlot, b: TrainingSlot) => number> = {
      weekday: (a, b) => (a.weekday - b.weekday) * dir,
      time: (a, b) => a.start_time.localeCompare(b.start_time) * dir,
      facility: (a, b) => fn(a.facility_id).localeCompare(fn(b.facility_id)) * dir,
      team: (a, b) => a.team_group_name.localeCompare(b.team_group_name) * dir,
      subgroup: (a, b) => (a.subgroup_name ?? '').localeCompare(b.subgroup_name ?? '') * dir,
      coach: (a, b) => (a.responsible_name ?? '').localeCompare(b.responsible_name ?? '') * dir,
    };
    const primary = comparators[sortKey];
    return [...slots].sort((a, b) =>
      primary(a, b) || (a.weekday - b.weekday) || a.start_time.localeCompare(b.start_time)
    );
  }, [slots, sortKey, sortDir, facilities]);

  const plan = plans.find(p => p.id === planId);
  const conflicts = useMemo(() => findCapacityConflicts(slots, facilities), [slots, facilities]);

  // Live warnings for form
  const formWarnings = useMemo(
    () => checkFormConflicts(form, editing?.id ?? null, slots, facilities, availability, plan),
    [form, editing, slots, facilities, availability, plan]
  );

  const openNew = () => { setEditing(null); setForm({ ...emptySlotForm, facility_id: facilities[0]?.id ?? '' }); setDialogOpen(true); };
  const openEdit = (s: TrainingSlot) => {
    setEditing(s);
    setForm({
      facility_id: s.facility_id,
      team_id: s.team_id ?? '',
      person_id: s.person_id ?? '',
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
      team_id: form.team_id || null,
      person_id: form.person_id || null,
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

  const facilityName = (id: string) => {
    const fac = facilities.find(f => f.id === id);
    return fac ? `${fac.location} · ${fac.name}` : 'Ukendt';
  };

  // Stats
  const uniqueTeams = [...new Set(slots.map(s => s.team_group_name))];
  const outsideAvailCount = slots.filter(s => isSlotOutsideAvailability(s, availability, plan)).length;

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
                    {([
                      ['weekday', 'Ugedag'],
                      ['time', 'Tid'],
                      ['facility', 'Facilitet'],
                      ['team', 'Hold'],
                      ['subgroup', 'Undergruppe'],
                      ['coach', 'Ansvarlig'],
                    ] as [SlotSortKey, string][]).map(([key, label]) => (
                      <TableHead
                        key={key}
                        className="cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={() => toggleSort(key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {sortKey === key ? (
                            sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </span>
                      </TableHead>
                    ))}
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSlots.map(s => {
                    const conflict = conflicts.find(c => c.slotId === s.id);
                    const outsideAvail = isSlotOutsideAvailability(s, availability, plan);
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
                      {fac.location} · {fac.name}
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
                                const outsideAvail = isSlotOutsideAvailability(s, availability, plan);
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
          <FreeSlots facilities={facilities} availability={availability} slots={slots} plan={plan} />
        </TabsContent>
      </Tabs>

      {/* Slot dialog with live warnings */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Rediger træningspas' : 'Nyt træningspas'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Facilitet *</Label>
              <Select value={form.facility_id} onValueChange={v => {
                const availDays = availability
                  .filter(a => a.facility_id === v && availabilityAppliesToPlan(a, plan))
                  .map(a => a.weekday);
                const uniqueDays = [...new Set(availDays)].sort((a, b) => a - b);
                setForm(f => ({
                  ...f,
                  facility_id: v,
                  weekday: uniqueDays.length > 0 && !uniqueDays.includes(f.weekday) ? uniqueDays[0] : f.weekday,
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Vælg facilitet" /></SelectTrigger>
                <SelectContent>{facilities.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.location} · {f.name} <span className="text-muted-foreground">(kap. {f.simultaneous_capacity})</span>
                  </SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ugedag *</Label>
              {(() => {
                const availDays = form.facility_id
                  ? [...new Set(availability
                    .filter(a => a.facility_id === form.facility_id && availabilityAppliesToPlan(a, plan))
                    .map(a => a.weekday))].sort((a, b) => a - b)
                  : [];
                const options = availDays.length > 0
                  ? WEEKDAY_OPTIONS.filter(o => availDays.includes(o.value))
                  : WEEKDAY_OPTIONS;
                return (
                  <Select value={String(form.weekday)} onValueChange={v => setForm(f => ({ ...f, weekday: Number(v) }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {options.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                      {availDays.length > 0 && availDays.length < 7 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground border-t">Kun dage med haltilgængelighed</div>
                      )}
                    </SelectContent>
                  </Select>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start *</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} /></div>
              <div><Label>Slut *</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} /></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hold</Label>
                <Select value={form.team_id || 'none'} onValueChange={v => {
                  const team = teams.find(t => t.id === v);
                  setForm(f => ({
                    ...f,
                    team_id: v === 'none' ? '' : v,
                    team_group_name: team ? team.name : f.team_group_name,
                  }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Vælg hold" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Fritekst / intet fast hold</SelectItem>
                    {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.abbreviation} · {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ansvarlig person</Label>
                <Select value={form.person_id || 'none'} onValueChange={v => {
                  const person = persons.find(p => p.id === v);
                  setForm(f => ({
                    ...f,
                    person_id: v === 'none' ? '' : v,
                    responsible_name: person ? person.name : f.responsible_name,
                  }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Vælg person" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Fritekst / ingen fast person</SelectItem>
                    {persons.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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

function FreeSlots({ facilities, availability, slots, plan }: { facilities: Facility[]; availability: FacilityAvailability[]; slots: TrainingSlot[]; plan?: { valid_from: string; valid_to: string | null } }) {
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
          const facAvail = availability.filter(a => a.facility_id === fac.id && availabilityAppliesToPlan(a, plan));
          const facSlots = slots.filter(s => s.facility_id === fac.id);
          if (facAvail.length === 0) return null;

          return (
            <Card key={fac.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {fac.location} · {fac.name}
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
