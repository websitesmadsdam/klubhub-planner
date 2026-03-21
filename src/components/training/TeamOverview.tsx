import { useState, useMemo, useCallback } from 'react';
import type { TrainingSlot, Facility } from '@/types/training';
import { WEEKDAYS } from '@/types/training';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, MapPin, Users, Filter, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

interface Warning {
  type: 'overlap' | 'location_switch';
  message: string;
  slotIds: string[];
}

function detectWarnings(slots: TrainingSlot[], facilities: Facility[]): Warning[] {
  const warnings: Warning[] = [];
  const facilityMap = new Map(facilities.map(f => [f.id, f]));

  // Group by responsible_name and weekday
  const byCoachDay = new Map<string, TrainingSlot[]>();
  for (const s of slots) {
    if (!s.responsible_name) continue;
    const key = `${s.responsible_name}__${s.weekday}`;
    if (!byCoachDay.has(key)) byCoachDay.set(key, []);
    byCoachDay.get(key)!.push(s);
  }

  for (const [key, daySlots] of byCoachDay) {
    if (daySlots.length < 2) continue;
    const sorted = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
    const coach = key.split('__')[0];

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i], b = sorted[j];
        const aStart = timeToMinutes(a.start_time), aEnd = timeToMinutes(a.end_time);
        const bStart = timeToMinutes(b.start_time), bEnd = timeToMinutes(b.end_time);

        // Time overlap
        if (aStart < bEnd && bStart < aEnd) {
          warnings.push({
            type: 'overlap',
            message: `${coach}: tidsoverlap ${WEEKDAYS[a.weekday]} – ${a.team_group_name} (${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}) og ${b.team_group_name} (${b.start_time.slice(0, 5)}–${b.end_time.slice(0, 5)})`,
            slotIds: [a.id, b.id],
          });
        }
        // Location switch with short buffer (< 30 min between sessions at different facilities)
        else if (a.facility_id !== b.facility_id) {
          const gap = bStart - aEnd;
          if (gap >= 0 && gap < 30) {
            const facA = facilityMap.get(a.facility_id)?.name ?? '?';
            const facB = facilityMap.get(b.facility_id)?.name ?? '?';
            warnings.push({
              type: 'location_switch',
              message: `${coach}: ${WEEKDAYS[a.weekday]} – skift fra ${facA} til ${facB} med kun ${gap} min buffer`,
              slotIds: [a.id, b.id],
            });
          }
        }
      }
    }
  }
  return warnings;
}

interface Props {
  slots: TrainingSlot[];
  facilities: Facility[];
}

export default function TeamOverview({ slots, facilities }: Props) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<string>('all');
  const [selectedWeekday, setSelectedWeekday] = useState<string>('all');
  const [selectedFacility, setSelectedFacility] = useState<string>('all');

  const facilityMap = useMemo(() => new Map(facilities.map(f => [f.id, f])), [facilities]);

  const allTeams = useMemo(() => [...new Set(slots.map(s => s.team_group_name))].sort(), [slots]);
  const allCoaches = useMemo(() => [...new Set(slots.map(s => s.responsible_name).filter(Boolean))].sort() as string[], [slots]);

  // Apply filters
  const filteredSlots = useMemo(() => {
    let result = slots;
    if (selectedTeams.length > 0) {
      result = result.filter(s => selectedTeams.includes(s.team_group_name));
    }
    if (selectedCoach !== 'all') {
      result = result.filter(s => s.responsible_name === selectedCoach);
    }
    if (selectedWeekday !== 'all') {
      result = result.filter(s => s.weekday === Number(selectedWeekday));
    }
    if (selectedFacility !== 'all') {
      result = result.filter(s => s.facility_id === selectedFacility);
    }
    return result;
  }, [slots, selectedTeams, selectedCoach, selectedWeekday, selectedFacility]);

  const warnings = useMemo(() => detectWarnings(filteredSlots, facilities), [filteredSlots, facilities]);
  const warningSlotIds = useMemo(() => new Set(warnings.flatMap(w => w.slotIds)), [warnings]);

  const sortedSlots = useMemo(() =>
    [...filteredSlots].sort((a, b) =>
      a.team_group_name.localeCompare(b.team_group_name) ||
      a.weekday - b.weekday ||
      a.start_time.localeCompare(b.start_time)
    ),
    [filteredSlots]
  );

  const toggleTeam = (team: string) => {
    setSelectedTeams(prev =>
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  };

  const activeFilterCount = (selectedTeams.length > 0 ? 1 : 0) +
    (selectedCoach !== 'all' ? 1 : 0) +
    (selectedWeekday !== 'all' ? 1 : 0) +
    (selectedFacility !== 'all' ? 1 : 0);

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
        Ingen træningspas i denne plan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Hold
              {selectedTeams.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{selectedTeams.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Vælg hold</span>
                {selectedTeams.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSelectedTeams([])}>
                    Ryd
                  </Button>
                )}
              </div>
              <Separator />
              {allTeams.map(team => (
                <div key={team} className="flex items-center gap-2">
                  <Checkbox
                    id={`team-${team}`}
                    checked={selectedTeams.includes(team)}
                    onCheckedChange={() => toggleTeam(team)}
                  />
                  <Label htmlFor={`team-${team}`} className="text-sm cursor-pointer">{team}</Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Select value={selectedCoach} onValueChange={setSelectedCoach}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Træner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle trænere</SelectItem>
            {allCoaches.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedWeekday} onValueChange={setSelectedWeekday}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Ugedag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle dage</SelectItem>
            {[1, 2, 3, 4, 5, 6].map(d => (
              <SelectItem key={d} value={String(d)}>{WEEKDAYS[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedFacility} onValueChange={setSelectedFacility}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="Lokation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle lokationer</SelectItem>
            {facilities.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => {
              setSelectedTeams([]);
              setSelectedCoach('all');
              setSelectedWeekday('all');
              setSelectedFacility('all');
            }}
          >
            Ryd alle filtre
          </Button>
        )}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {warnings.length} advarsel{warnings.length !== 1 ? 'er' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ul className="space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className="text-sm flex items-start gap-1.5">
                  {w.type === 'overlap' ? (
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                  )}
                  <span className={w.type === 'overlap' ? 'text-destructive' : 'text-amber-700'}>
                    {w.message}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" />
          {new Set(filteredSlots.map(s => s.team_group_name)).size} hold
        </Badge>
        <Badge variant="outline" className="gap-1">
          {filteredSlots.length} træningspas
        </Badge>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Filter className="h-3 w-3" />{activeFilterCount} filter aktive
          </Badge>
        )}
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Hold</TableHead>
              <TableHead>Ugedag</TableHead>
              <TableHead>Tid</TableHead>
              <TableHead>Lokation</TableHead>
              <TableHead>Træner</TableHead>
              <TableHead>Undergruppe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSlots.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Ingen træningspas matcher de valgte filtre.
                </TableCell>
              </TableRow>
            ) : (
              sortedSlots.map(s => {
                const hasWarning = warningSlotIds.has(s.id);
                const facName = facilityMap.get(s.facility_id)?.name ?? 'Ukendt';
                return (
                  <TableRow key={s.id} className={hasWarning ? 'bg-destructive/5' : ''}>
                    <TableCell className="pr-0">
                      {hasWarning && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </TableCell>
                    <TableCell className="font-medium">{s.team_group_name}</TableCell>
                    <TableCell>{WEEKDAYS[s.weekday]}</TableCell>
                    <TableCell className="font-mono text-sm">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</TableCell>
                    <TableCell>{facName}</TableCell>
                    <TableCell className="text-muted-foreground">{s.responsible_name ?? '–'}</TableCell>
                    <TableCell className="text-muted-foreground">{s.subgroup_name ?? '–'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
