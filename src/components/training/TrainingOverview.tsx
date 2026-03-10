import { useState, useRef } from 'react';
import type { TrainingSlot, Facility, TrainingPlan } from '@/types/training';
import { WEEKDAYS } from '@/types/training';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Grid3X3, List } from 'lucide-react';

// Mon-Sat only
const OVERVIEW_DAYS = [1, 2, 3, 4, 5, 6] as const;
const DAY_LABELS: Record<number, string> = {
  1: 'Mandag', 2: 'Tirsdag', 3: 'Onsdag', 4: 'Torsdag', 5: 'Fredag', 6: 'Lørdag',
};

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToStr(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Soft colors that also print well (borders make them readable in B&W)
const SLOT_COLORS = [
  'bg-blue-50 border-blue-300 print:bg-white',
  'bg-emerald-50 border-emerald-300 print:bg-white',
  'bg-amber-50 border-amber-300 print:bg-white',
  'bg-purple-50 border-purple-300 print:bg-white',
  'bg-rose-50 border-rose-300 print:bg-white',
  'bg-cyan-50 border-cyan-300 print:bg-white',
  'bg-orange-50 border-orange-300 print:bg-white',
  'bg-teal-50 border-teal-300 print:bg-white',
];

function getTeamColor(teamName: string, teamColorMap: Map<string, string>): string {
  if (!teamColorMap.has(teamName)) {
    teamColorMap.set(teamName, SLOT_COLORS[teamColorMap.size % SLOT_COLORS.length]);
  }
  return teamColorMap.get(teamName)!;
}

interface Props {
  plan: TrainingPlan;
  slots: TrainingSlot[];
  facilities: Facility[];
}

export default function TrainingOverview({ plan, slots, facilities }: Props) {
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('all');
  const printRef = useRef<HTMLDivElement>(null);

  const facilitiesWithSlots = facilities.filter(f => slots.some(s => s.facility_id === f.id));

  const handlePrint = () => window.print();

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
        Ingen træningspas i denne plan. Tilføj pas under fanen "Træningspas".
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls – hidden on print */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'week' | 'day')}>
            <TabsList>
              <TabsTrigger value="week" className="gap-1.5"><Grid3X3 className="h-3.5 w-3.5" />Uge</TabsTrigger>
              <TabsTrigger value="day" className="gap-1.5"><List className="h-3.5 w-3.5" />Dag</TabsTrigger>
            </TabsList>
          </Tabs>
          {viewMode === 'day' && (
            <Select value={selectedFacilityId} onValueChange={setSelectedFacilityId}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle faciliteter</SelectItem>
                {facilitiesWithSlots.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button variant="outline" onClick={handlePrint} className="gap-1.5">
          <Printer className="h-4 w-4" />Print
        </Button>
      </div>

      {/* Printable content */}
      <div ref={printRef}>
        {viewMode === 'week' ? (
          <WeekView plan={plan} slots={slots} facilities={facilitiesWithSlots} />
        ) : (
          <DayView plan={plan} slots={slots} facilities={selectedFacilityId === 'all' ? facilitiesWithSlots : facilitiesWithSlots.filter(f => f.id === selectedFacilityId)} />
        )}
      </div>
    </div>
  );
}

/* ── Week view: one grid per facility ── */
function WeekView({ plan, slots, facilities }: { plan: TrainingPlan; slots: TrainingSlot[]; facilities: Facility[] }) {
  return (
    <div className="space-y-8 print:space-y-0">
      {facilities.map(fac => {
        const facSlots = slots.filter(s => s.facility_id === fac.id);
        if (facSlots.length === 0) return null;
        return (
          <div key={fac.id} className="print:break-before-page first:print:break-before-auto">
            <FacilityWeekGrid facility={fac} plan={plan} slots={facSlots} />
          </div>
        );
      })}
    </div>
  );
}

function FacilityWeekGrid({ facility, plan, slots }: { facility: Facility; plan: TrainingPlan; slots: TrainingSlot[] }) {
  // Determine time range from slots
  const allMinutes = slots.flatMap(s => [timeToMinutes(s.start_time), timeToMinutes(s.end_time)]);
  const rawMin = Math.min(...allMinutes);
  const rawMax = Math.max(...allMinutes);
  // Round down to hour, up to hour
  const gridStart = Math.floor(rawMin / 60) * 60;
  const gridEnd = Math.ceil(rawMax / 60) * 60;
  const totalRows = (gridEnd - gridStart) / 15;

  // Build team color map
  const teamColorMap = new Map<string, string>();
  const uniqueTeams = [...new Set(slots.map(s => s.team_group_name))].sort();
  uniqueTeams.forEach(t => getTeamColor(t, teamColorMap));

  return (
    <div>
      {/* Header – always visible */}
      <div className="mb-3 print:mb-2">
        <h2 className="text-lg font-bold text-foreground print:text-black">Træningsplan – {facility.name}</h2>
        <p className="text-sm text-muted-foreground print:text-gray-600">
          {plan.name} · Gyldig fra {plan.valid_from}{plan.valid_to ? ` til ${plan.valid_to}` : ''}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border print:border-gray-400 print:rounded-none">
        <table className="w-full border-collapse text-xs print:text-[9px]">
          <thead>
            <tr>
              <th className="w-16 border-b border-r border-border bg-muted/50 px-2 py-1.5 text-left font-medium text-muted-foreground print:bg-gray-100 print:border-gray-400 print:text-gray-700">
                Tid
              </th>
              {OVERVIEW_DAYS.map(day => (
                <th key={day} className="border-b border-r border-border bg-muted/50 px-2 py-1.5 text-center font-medium text-muted-foreground last:border-r-0 print:bg-gray-100 print:border-gray-400 print:text-gray-700">
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: totalRows }, (_, rowIdx) => {
              const rowMinutes = gridStart + rowIdx * 15;
              const isHour = rowMinutes % 60 === 0;
              return (
                <tr key={rowIdx} className={isHour ? 'border-t border-border print:border-gray-300' : ''}>
                  <td className={`border-r border-border px-2 py-0 text-right font-mono text-muted-foreground align-top print:border-gray-300 print:text-gray-500 ${isHour ? 'pt-0.5' : ''}`}>
                    {isHour ? minutesToStr(rowMinutes) : ''}
                  </td>
                  {OVERVIEW_DAYS.map(day => {
                    // Find slots that start at this exact 15-min row
                    const startingSlots = slots.filter(s => s.weekday === day && Math.floor(timeToMinutes(s.start_time) / 15) * 15 === rowMinutes);
                    // Find slots that are active in this row but didn't start here (for bg)
                    const activeSlots = slots.filter(s =>
                      s.weekday === day &&
                      timeToMinutes(s.start_time) <= rowMinutes &&
                      timeToMinutes(s.end_time) > rowMinutes
                    );
                    const hasActive = activeSlots.length > 0;

                    return (
                      <td
                        key={day}
                        className={`border-r border-border last:border-r-0 relative px-0.5 py-0 align-top print:border-gray-300 ${
                          hasActive && startingSlots.length === 0 ? 'bg-muted/20 print:bg-gray-50' : ''
                        }`}
                        style={{ height: '20px', minWidth: '120px' }}
                      >
                        {startingSlots.length > 0 && (
                          <div className="flex gap-0.5">
                            {startingSlots.map(s => {
                              const spanRows = (timeToMinutes(s.end_time) - timeToMinutes(s.start_time)) / 15;
                              const colorClass = getTeamColor(s.team_group_name, teamColorMap);
                              return (
                                <div
                                  key={s.id}
                                  className={`absolute left-0.5 right-0.5 rounded-sm border px-1 py-0.5 overflow-hidden z-10 ${colorClass}`}
                                  style={{
                                    height: `${spanRows * 20}px`,
                                    width: startingSlots.length > 1 ? `${Math.floor(95 / startingSlots.length)}%` : undefined,
                                    left: startingSlots.length > 1 ? `${(startingSlots.indexOf(s) * 95) / startingSlots.length}%` : undefined,
                                  }}
                                >
                                  <div className="font-semibold text-foreground leading-tight truncate print:text-black">
                                    {s.team_group_name}
                                  </div>
                                  {s.subgroup_name && (
                                    <div className="text-muted-foreground leading-tight truncate print:text-gray-600">
                                      {s.subgroup_name}
                                    </div>
                                  )}
                                  <div className="text-muted-foreground leading-tight font-mono print:text-gray-500">
                                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Day view: lists per facility per day ── */
function DayView({ plan, slots, facilities }: { plan: TrainingPlan; slots: TrainingSlot[]; facilities: Facility[] }) {
  return (
    <div className="space-y-8 print:space-y-0">
      {facilities.map(fac => {
        const facSlots = slots.filter(s => s.facility_id === fac.id);
        if (facSlots.length === 0) return null;

        return (
          <div key={fac.id} className="print:break-before-page first:print:break-before-auto">
            <div className="mb-3 print:mb-2">
              <h2 className="text-lg font-bold text-foreground print:text-black">Træningsplan – {fac.name}</h2>
              <p className="text-sm text-muted-foreground print:text-gray-600">
                {plan.name} · Gyldig fra {plan.valid_from}{plan.valid_to ? ` til ${plan.valid_to}` : ''}
              </p>
            </div>

            <div className="rounded-lg border border-border overflow-hidden print:border-gray-400 print:rounded-none">
              <table className="w-full border-collapse text-sm print:text-xs">
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
