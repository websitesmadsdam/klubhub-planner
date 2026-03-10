import { useState, useMemo } from 'react';
import type { TrainingSlot, Facility, TrainingPlan } from '@/types/training';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Grid3X3, List } from 'lucide-react';
import TrainingPrintLayout from './TrainingPrintLayout';

const OVERVIEW_DAYS = [1, 2, 3, 4, 5, 6] as const;
const DAY_LABELS: Record<number, string> = {
  1: 'Mandag', 2: 'Tirsdag', 3: 'Onsdag', 4: 'Torsdag', 5: 'Fredag', 6: 'Lørdag',
};

const ROW_HEIGHT = 24;

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToStr(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

const SLOT_COLORS = [
  'bg-blue-50 border-blue-300 print:bg-blue-50',
  'bg-emerald-50 border-emerald-300 print:bg-emerald-50',
  'bg-amber-50 border-amber-300 print:bg-amber-50',
  'bg-purple-50 border-purple-300 print:bg-purple-50',
  'bg-rose-50 border-rose-300 print:bg-rose-50',
  'bg-cyan-50 border-cyan-300 print:bg-cyan-50',
  'bg-orange-50 border-orange-300 print:bg-orange-50',
  'bg-teal-50 border-teal-300 print:bg-teal-50',
];

function buildTeamColorMap(slots: TrainingSlot[]): Map<string, string> {
  const map = new Map<string, string>();
  const teams = [...new Set(slots.map(s => s.team_group_name))].sort();
  teams.forEach((t, i) => map.set(t, SLOT_COLORS[i % SLOT_COLORS.length]));
  return map;
}

function assignTracks(daySlots: TrainingSlot[], capacity: number): Map<string, number> {
  const sorted = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time));
  const trackEnds: number[] = new Array(capacity).fill(0);
  const assignment = new Map<string, number>();

  for (const s of sorted) {
    const sStart = timeToMinutes(s.start_time);
    let bestTrack = 0;
    for (let t = 0; t < capacity; t++) {
      if (trackEnds[t] <= sStart) { bestTrack = t; break; }
      if (trackEnds[t] < trackEnds[bestTrack]) bestTrack = t;
    }
    assignment.set(s.id, bestTrack);
    trackEnds[bestTrack] = timeToMinutes(s.end_time);
  }
  return assignment;
}

function computeTimeRange(slots: TrainingSlot[]): { gridStart: number; gridEnd: number } {
  if (slots.length === 0) return { gridStart: 8 * 60, gridEnd: 22 * 60 };
  let earliest = Infinity, latest = 0;
  for (const s of slots) {
    const st = timeToMinutes(s.start_time);
    const en = timeToMinutes(s.end_time);
    if (st < earliest) earliest = st;
    if (en > latest) latest = en;
  }
  // Round down to 30min, subtract 30min; round up to 30min, add 30min
  const gridStart = Math.max(0, Math.floor((earliest - 30) / 30) * 30);
  const gridEnd = Math.min(24 * 60, Math.ceil((latest + 30) / 30) * 30);
  return { gridStart, gridEnd };
}

interface Props {
  plan: TrainingPlan;
  slots: TrainingSlot[];
  facilities: Facility[];
}

export default function TrainingOverview({ plan, slots, facilities }: Props) {
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');

  const facilitiesWithSlots = facilities.filter(f => slots.some(s => s.facility_id === f.id));
  const effectiveFacilityId = selectedFacilityId || facilitiesWithSlots[0]?.id || '';
  const selectedFacility = effectiveFacilityId !== 'all' ? facilities.find(f => f.id === effectiveFacilityId) : undefined;

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
        Ingen træningspas i denne plan. Tilføj pas under fanen "Træningspas".
      </div>
    );
  }

  const showAllFacilities = effectiveFacilityId === 'all';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'week' | 'day')}>
            <TabsList>
              <TabsTrigger value="week" className="gap-1.5"><Grid3X3 className="h-3.5 w-3.5" />Uge</TabsTrigger>
              <TabsTrigger value="day" className="gap-1.5"><List className="h-3.5 w-3.5" />Dag</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={effectiveFacilityId} onValueChange={setSelectedFacilityId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Vælg facilitet" /></SelectTrigger>
            <SelectContent>
              {viewMode === 'day' && <SelectItem value="all">Alle faciliteter</SelectItem>}
              {facilitiesWithSlots.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-4 w-4" />Print
        </Button>
      </div>

      {/* Screen: show selected facility only */}
      <div className="print:hidden">
        {viewMode === 'week' ? (
          selectedFacility ? (
            <FacilityWeekGrid facility={selectedFacility} plan={plan} slots={slots.filter(s => s.facility_id === effectiveFacilityId)} allSlots={slots} />
          ) : facilitiesWithSlots[0] ? (
            <FacilityWeekGrid facility={facilitiesWithSlots[0]} plan={plan} slots={slots.filter(s => s.facility_id === facilitiesWithSlots[0].id)} allSlots={slots} />
          ) : null
        ) : (
          <DayView
            plan={plan}
            slots={showAllFacilities ? slots : selectedFacility ? slots.filter(s => s.facility_id === effectiveFacilityId) : slots}
            facilities={showAllFacilities ? facilitiesWithSlots : selectedFacility ? [selectedFacility] : facilitiesWithSlots}
          />
        )}
      </div>

      {/* Print: separate compact layout */}
      <TrainingPrintLayout plan={plan} slots={slots} facilities={facilities} />
    </div>
  );
}

/* ─── Week grid for a single facility ─── */
function FacilityWeekGrid({ facility, plan, slots, allSlots }: {
  facility: Facility; plan: TrainingPlan; slots: TrainingSlot[]; allSlots: TrainingSlot[];
}) {
  const capacity = facility.simultaneous_capacity;
  const teamColors = buildTeamColorMap(allSlots);
  const { gridStart, gridEnd } = useMemo(() => computeTimeRange(slots), [slots]);
  const totalRows = (gridEnd - gridStart) / 15;

  const dayTracks = useMemo(() => {
    const map = new Map<number, Map<string, number>>();
    for (const day of OVERVIEW_DAYS) {
      const daySlots = slots.filter(s => s.weekday === day);
      map.set(day, assignTracks(daySlots, capacity));
    }
    return map;
  }, [slots, capacity]);

  return (
    <div className="print:break-before-page first:print:break-before-auto">
      {/* Print-only header */}
      <div className="hidden print:block print:mb-6">
        <h1 className="text-3xl font-bold text-black">Træningsplan – {facility.name}</h1>
        <p className="text-base text-gray-700 mt-1">
          {plan.name} · Gyldig fra {plan.valid_from}{plan.valid_to ? ` til ${plan.valid_to}` : ''} · Kapacitet: {capacity}
        </p>
      </div>

      {/* Screen header */}
      <div className="mb-3 print:hidden">
        <h2 className="text-lg font-bold text-foreground">
          Træningsplan – {facility.name}
          <span className="ml-2 text-sm font-normal text-muted-foreground">(kapacitet: {capacity})</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          {plan.name} · Gyldig fra {plan.valid_from}{plan.valid_to ? ` til ${plan.valid_to}` : ''}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border print:border-black print:rounded-none print:overflow-visible">
        <div className="inline-grid print:w-full" style={{
          gridTemplateColumns: `56px repeat(${OVERVIEW_DAYS.length}, 1fr)`,
          minWidth: `${56 + OVERVIEW_DAYS.length * 160}px`,
        }}>
          {/* Header row */}
          <div className="border-b-2 border-r border-border bg-muted/50 px-2 py-2 text-xs font-semibold text-muted-foreground print:bg-gray-200 print:border-black print:text-black print:text-sm print:font-bold">
            Tid
          </div>
          {OVERVIEW_DAYS.map(day => (
            <div key={day} className="border-b-2 border-r border-border last:border-r-0 bg-muted/50 px-2 py-2 text-xs font-semibold text-center text-muted-foreground print:bg-gray-200 print:border-black print:text-black print:text-sm print:font-bold">
              {DAY_LABELS[day]}
            </div>
          ))}

          {/* Grid rows */}
          {Array.from({ length: totalRows }, (_, rowIdx) => {
            const rowMinutes = gridStart + rowIdx * 15;
            const isHalfHour = rowMinutes % 30 === 0;
            const isHour = rowMinutes % 60 === 0;

            return [
              <div
                key={`t-${rowIdx}`}
                className={`border-r border-border px-1 text-right font-mono text-muted-foreground flex items-start justify-end print:text-black print:font-semibold ${
                  isHour ? 'border-t border-border print:border-t-black' : isHalfHour ? 'border-t border-border/50 print:border-t-gray-400' : ''
                }`}
                style={{ height: ROW_HEIGHT, fontSize: '11px', lineHeight: '16px' }}
              >
                {isHalfHour ? minutesToStr(rowMinutes) : ''}
              </div>,

              ...OVERVIEW_DAYS.map(day => {
                const tracks = dayTracks.get(day)!;
                const startingSlots = slots.filter(
                  s => s.weekday === day && Math.floor(timeToMinutes(s.start_time) / 15) * 15 === rowMinutes
                );

                return (
                  <div
                    key={`${day}-${rowIdx}`}
                    className={`border-r border-border last:border-r-0 relative print:border-gray-300 ${
                      isHour ? 'border-t border-border print:border-t-black' : isHalfHour ? 'border-t border-border/50 print:border-t-gray-400' : ''
                    }`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {startingSlots.map(s => {
                      const sStart = timeToMinutes(s.start_time);
                      const sEnd = timeToMinutes(s.end_time);
                      const spanRows = (sEnd - sStart) / 15;
                      const track = tracks.get(s.id) ?? 0;
                      const trackWidth = 100 / capacity;
                      const colorClass = teamColors.get(s.team_group_name) ?? SLOT_COLORS[0];

                      return (
                        <div
                          key={s.id}
                          className={`absolute rounded-sm border overflow-hidden z-10 px-1.5 py-0.5 ${colorClass}`}
                          style={{
                            top: 0,
                            height: spanRows * ROW_HEIGHT - 1,
                            left: `${track * trackWidth}%`,
                            width: `${trackWidth - 1}%`,
                          }}
                        >
                          <div className="font-semibold text-foreground leading-tight truncate print:text-black print:text-xs" style={{ fontSize: '11px' }}>
                            {s.team_group_name}
                          </div>
                          {s.subgroup_name && (
                            <div className="text-muted-foreground leading-tight truncate print:text-gray-700 print:text-xs" style={{ fontSize: '10px' }}>
                              {s.subgroup_name}
                            </div>
                          )}
                          <div className="text-muted-foreground leading-tight font-mono print:text-gray-600 print:text-xs" style={{ fontSize: '10px' }}>
                            {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }),
            ];
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Day view ─── */
function DayView({ plan, slots, facilities }: { plan: TrainingPlan; slots: TrainingSlot[]; facilities: Facility[] }) {
  return (
    <div className="space-y-8 print:space-y-0">
      {facilities.map(fac => {
        const facSlots = slots.filter(s => s.facility_id === fac.id);
        if (facSlots.length === 0) return null;

        return (
          <div key={fac.id} className="print:break-before-page first:print:break-before-auto">
            <div className="hidden print:block print:mb-4">
              <h1 className="text-2xl font-bold text-black">Træningsplan – {fac.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {plan.name} · Gyldig fra {plan.valid_from}{plan.valid_to ? ` til ${plan.valid_to}` : ''}
              </p>
            </div>
            <div className="mb-3 print:hidden">
              <h2 className="text-lg font-bold text-foreground">{fac.name}</h2>
              <p className="text-sm text-muted-foreground">
                {plan.name} · Gyldig fra {plan.valid_from}{plan.valid_to ? ` til ${plan.valid_to}` : ''}
              </p>
            </div>

            <div className="rounded-lg border border-border overflow-hidden print:border-gray-400 print:rounded-none">
              <table className="w-full border-collapse text-sm print:text-base">
                <thead>
                  <tr>
                    <th className="border-b border-r border-border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground w-28 print:bg-gray-100 print:border-gray-400">Dag</th>
                    <th className="border-b border-r border-border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground w-28 print:bg-gray-100 print:border-gray-400">Tid</th>
                    <th className="border-b border-r border-border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground print:bg-gray-100 print:border-gray-400">Hold</th>
                    <th className="border-b border-r border-border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground print:bg-gray-100 print:border-gray-400">Undergruppe</th>
                    <th className="border-b border-border bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground print:bg-gray-100 print:border-gray-400">Ansvarlig</th>
                  </tr>
                </thead>
                <tbody>
                  {OVERVIEW_DAYS.map(day => {
                    const daySlots = facSlots.filter(s => s.weekday === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
                    if (daySlots.length === 0) return null;

                    return daySlots.map((s, idx) => (
                      <tr key={s.id} className={`border-b border-border last:border-b-0 print:border-gray-300 ${idx === 0 ? 'border-t border-border' : ''}`}>
                        {idx === 0 && (
                          <td rowSpan={daySlots.length} className="border-r border-border px-3 py-1.5 font-medium text-foreground align-top bg-muted/30 print:bg-gray-50 print:border-gray-400 print:text-black">
                            {DAY_LABELS[day]}
                          </td>
                        )}
                        <td className="border-r border-border px-3 py-1.5 font-mono text-sm text-foreground print:border-gray-300 print:text-black">
                          {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                        </td>
                        <td className="border-r border-border px-3 py-1.5 font-medium text-foreground print:border-gray-300 print:text-black">
                          {s.team_group_name}
                        </td>
                        <td className="border-r border-border px-3 py-1.5 text-muted-foreground print:border-gray-300 print:text-gray-600">
                          {s.subgroup_name || '–'}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground print:text-gray-600">
                          {s.responsible_name || '–'}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
