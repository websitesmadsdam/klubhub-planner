import { useMemo } from 'react';
import { formatDate } from '@/lib/utils';
import type { TrainingSlot, TrainingPlan, Facility } from '@/types/training';

const DAY_SHORT: Record<number, string> = {
  1: 'Man', 2: 'Tir', 3: 'Ons', 4: 'Tor', 5: 'Fre', 6: 'Lør', 7: 'Søn',
};

// Pastel colors that remain distinguishable in grayscale print
const TEAM_COLORS: Record<string, { bg: string; border: string }> = {
  mini:  { bg: '#e6f4ea', border: '#66bb6a' },
  u7:    { bg: '#e6f4ea', border: '#66bb6a' },
  u8:    { bg: '#e6f4ea', border: '#66bb6a' },
  u9:    { bg: '#e3f2fd', border: '#42a5f5' },
  u10:   { bg: '#e3f2fd', border: '#42a5f5' },
  u11:   { bg: '#fffde7', border: '#ffca28' },
  u12:   { bg: '#fffde7', border: '#ffca28' },
  u13:   { bg: '#fff3e0', border: '#ffa726' },
  u14:   { bg: '#fff3e0', border: '#ffa726' },
  u15:   { bg: '#f3e5f5', border: '#ab47bc' },
  u16:   { bg: '#f3e5f5', border: '#ab47bc' },
  u17:   { bg: '#fce4ec', border: '#ef5350' },
  u18:   { bg: '#fce4ec', border: '#ef5350' },
  u19:   { bg: '#e8eaf6', border: '#5c6bc0' },
  senior:{ bg: '#e0f2f1', border: '#26a69a' },
};
const DEFAULT_COLOR = { bg: '#f3f4f6', border: '#555' };

function getTeamColor(name: string) {
  const lower = name.toLowerCase().trim();
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (lower.startsWith(key)) return color;
  }
  return DEFAULT_COLOR;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToLabel(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function assignTracks(colSlots: TrainingSlot[]): Map<string, number> {
  const sorted = [...colSlots].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  const trackEnds = [0, 0];
  const result = new Map<string, number>();
  for (const s of sorted) {
    const st = timeToMinutes(s.start_time);
    const pick = st >= trackEnds[0] ? 0 : st >= trackEnds[1] ? 1 : (trackEnds[0] <= trackEnds[1] ? 0 : 1);
    result.set(s.id, pick);
    trackEnds[pick] = timeToMinutes(s.end_time);
  }
  return result;
}

interface Column {
  dayLabel: string;
  facilityName: string;
  weekday: number;
  facilityId: string;
}

interface Props {
  plan: TrainingPlan;
  slots: TrainingSlot[];
  facilities: Facility[];
}

// Alternating column tints for visual scanning
const COL_TINTS = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.018)'];

export default function TrainingPrintLayout({ plan, slots, facilities }: Props) {
  const facilityMap = useMemo(() => new Map(facilities.map(f => [f.id, f])), [facilities]);

  const columns = useMemo<Column[]>(() => {
    const combos = new Set<string>();
    const cols: Column[] = [];
    const sorted = [...slots].sort((a, b) => {
      if (a.weekday !== b.weekday) return a.weekday - b.weekday;
      const fa = facilityMap.get(a.facility_id)?.name ?? '';
      const fb = facilityMap.get(b.facility_id)?.name ?? '';
      return fa.localeCompare(fb);
    });
    for (const s of sorted) {
      const key = `${s.weekday}-${s.facility_id}`;
      if (combos.has(key)) continue;
      combos.add(key);
      const fac = facilityMap.get(s.facility_id);
      const shortFac = fac ? `${fac.location} · ${fac.name}`.replace(/hallen$/i, '').replace(/\s+$/, '') : 'Ukendt';
      cols.push({
        dayLabel: DAY_SHORT[s.weekday] ?? `D${s.weekday}`,
        facilityName: shortFac,
        weekday: s.weekday,
        facilityId: s.facility_id,
      });
    }
    return cols;
  }, [slots, facilityMap]);

  const { gridStart, gridEnd } = useMemo(() => {
    if (slots.length === 0) return { gridStart: 480, gridEnd: 1320 };
    let earliest = Infinity, latest = 0;
    for (const s of slots) {
      const st = timeToMinutes(s.start_time);
      const en = timeToMinutes(s.end_time);
      if (st < earliest) earliest = st;
      if (en > latest) latest = en;
    }
    return {
      gridStart: Math.max(0, Math.floor((earliest - 30) / 30) * 30),
      gridEnd: Math.min(1440, Math.ceil((latest + 30) / 30) * 30),
    };
  }, [slots]);

  const timeLabels = useMemo(() => {
    const labels: number[] = [];
    for (let m = gridStart; m < gridEnd; m += 30) labels.push(m);
    return labels;
  }, [gridStart, gridEnd]);

  const totalMinutes = gridEnd - gridStart;
  const BODY_HEIGHT = 460;
  const pxPerMin = BODY_HEIGHT / totalMinutes;

  const slotIndex = useMemo(() => {
    const idx = new Map<string, TrainingSlot[]>();
    for (const s of slots) {
      const colKey = `${s.weekday}-${s.facility_id}`;
      if (!idx.has(colKey)) idx.set(colKey, []);
      idx.get(colKey)!.push(s);
    }
    return idx;
  }, [slots]);

  if (slots.length === 0) return null;

  return (
    <div className="print-layout-root">
      <style>{`
        @media screen {
          .print-layout-root { display: none; }
        }
        @media print {
          @page { size: A4 landscape; margin: 10mm 8mm; }
          body * { visibility: hidden; }
          .print-layout-root,
          .print-layout-root * { visibility: visible !important; }
          .print-layout-root {
            position: fixed; left: 0; top: 0;
            width: 277mm;
            display: block !important;
            font-family: 'Inter', system-ui, sans-serif;
          }
          .print-layout-root * { box-sizing: border-box; }
          .print-header { margin-bottom: 6px; }
          .print-header h1 { font-size: 14pt; font-weight: 700; margin: 0 0 1px 0; color: #111; }
          .print-header p { font-size: 8pt; color: #555; margin: 0; }
          .print-grid-wrapper { display: flex; width: 100%; }
          .print-time-col { width: 38px; min-width: 38px; flex-shrink: 0; }
          .print-time-label {
            font-family: monospace; font-size: 7pt; font-weight: 600;
            color: #333; text-align: right; padding-right: 4px;
            position: absolute; left: 0; right: 0;
          }
          .print-time-label span { position: relative; top: -0.55em; }
          .print-cols-container { display: flex; flex: 1; }
          .print-col { flex: 1; min-width: 0; border-left: 1px solid #333; }
          .print-col:last-child { border-right: 1px solid #333; }
          .print-col-header {
            background: #e5e7eb; font-weight: 700; font-size: 7pt;
            text-align: center; padding: 2px 1px;
            border-top: 1px solid #333; border-bottom: 1px solid #333;
            white-space: nowrap; overflow: hidden;
          }
          .print-col-body { position: relative; height: ${BODY_HEIGHT}px; }
          .print-row-line {
            position: absolute; left: 0; right: 0;
            border-top: 1px solid #ddd; height: 0;
          }
          .print-row-line-hour { border-top: 1px solid #999; }
          .print-zebra {
            position: absolute; left: 0; right: 0;
            pointer-events: none;
          }
          .print-slot-block {
            position: absolute;
            border-radius: 1px;
            padding: 0px 2px; overflow: hidden;
            font-size: 6.5pt; line-height: 1.2; z-index: 1;
          }
          .print-slot-name { font-weight: 600; color: #111; }
          .print-slot-sub { font-weight: 400; color: #555; font-size: 6pt; }
          .print-slot-time { font-weight: 400; color: #666; font-size: 5.5pt; }
          .print-time-grid { position: relative; height: ${BODY_HEIGHT}px; }
        }
      `}</style>

      <div className="print-header">
        <h1>{plan.name}</h1>
        <p>
          Gyldig fra {formatDate(plan.valid_from)}{plan.valid_to ? ` til ${formatDate(plan.valid_to)}` : ''}
          {plan.description ? ` · ${plan.description}` : ''}
        </p>
      </div>

      <div className="print-grid-wrapper">
        <div className="print-time-col">
          <div style={{ height: '20px' }} />
          <div className="print-time-grid">
            {timeLabels.map(m => (
              <div
                key={m}
                className="print-time-label"
                style={{ top: `${(m - gridStart) * pxPerMin}px`, height: `${30 * pxPerMin}px` }}
              >
                <span>{minutesToLabel(m)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="print-cols-container">
          {columns.map((col, colIdx) => {
            const colSlots = slotIndex.get(`${col.weekday}-${col.facilityId}`) ?? [];
            const tracks = assignTracks(colSlots);
            const colBg = COL_TINTS[colIdx % 2];
            return (
              <div className="print-col" key={colIdx} style={{ background: colBg }}>
                <div className="print-col-header">
                  {col.dayLabel} · {col.facilityName}
                </div>
                <div className="print-col-body">
                  {/* Zebra striping every other 30-min row */}
                  {timeLabels.map((m, rowIdx) => (
                    rowIdx % 2 === 1 ? (
                      <div
                        key={`z-${m}`}
                        className="print-zebra"
                        style={{
                          top: `${(m - gridStart) * pxPerMin}px`,
                          height: `${30 * pxPerMin}px`,
                          background: 'rgba(0,0,0,0.025)',
                        }}
                      />
                    ) : null
                  ))}
                  {/* Grid lines */}
                  {timeLabels.map(m => (
                    <div
                      key={m}
                      className={`print-row-line${m % 60 === 0 ? ' print-row-line-hour' : ''}`}
                      style={{ top: `${(m - gridStart) * pxPerMin}px` }}
                    />
                  ))}
                  <div className="print-row-line print-row-line-hour" style={{ top: `${BODY_HEIGHT}px` }} />
                  {/* Slot blocks */}
                  {colSlots.map(s => {
                    const st = timeToMinutes(s.start_time);
                    const en = timeToMinutes(s.end_time);
                    const top = (st - gridStart) * pxPerMin;
                    const height = (en - st) * pxPerMin;
                    const track = tracks.get(s.id) ?? 0;
                    const color = getTeamColor(s.team_group_name);
                    return (
                      <div
                        key={s.id}
                        className="print-slot-block"
                        style={{
                          top: `${top}px`,
                          height: `${Math.max(height, 12)}px`,
                          left: `${track * 50}%`,
                          width: '50%',
                          background: color.bg,
                          borderLeft: `3px solid ${color.border}`,
                        }}
                      >
                        <span className="print-slot-name">{s.team_group_name}</span>
                        {s.subgroup_name && <span className="print-slot-sub"> ({s.subgroup_name})</span>}
                        <br />
                        <span className="print-slot-time">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
