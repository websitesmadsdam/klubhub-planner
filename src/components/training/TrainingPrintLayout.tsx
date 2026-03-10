import { useMemo } from 'react';
import type { TrainingSlot, TrainingPlan, Facility } from '@/types/training';

const DAY_SHORT: Record<number, string> = {
  1: 'Man', 2: 'Tir', 3: 'Ons', 4: 'Tor', 5: 'Fre', 6: 'Lør', 7: 'Søn',
};

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToLabel(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
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

const ROW_HEIGHT = 28; // px per 30 min

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
      const shortFac = (fac?.name ?? 'Ukendt').replace(/hallen$/i, '').replace(/\s+$/, '');
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
  const totalHeight = (totalMinutes / 30) * ROW_HEIGHT;

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
          .print-layout-root {
            display: block !important;
            font-family: 'Inter', system-ui, sans-serif;
          }
          .print-layout-root * { box-sizing: border-box; }
          .print-header {
            margin-bottom: 12px;
          }
          .print-header h1 {
            font-size: 18pt;
            font-weight: 700;
            margin: 0 0 2px 0;
            color: #111;
          }
          .print-header p {
            font-size: 9pt;
            color: #555;
            margin: 0;
          }
          .print-grid-wrapper {
            display: flex;
            width: 100%;
          }
          .print-time-col {
            width: 50px;
            min-width: 50px;
            flex-shrink: 0;
          }
          .print-time-label {
            height: ${ROW_HEIGHT}px;
            font-family: monospace;
            font-size: 8pt;
            font-weight: 600;
            color: #333;
            text-align: right;
            padding-right: 6px;
            display: flex;
            align-items: flex-start;
            justify-content: flex-end;
            position: relative;
          }
          .print-time-label span {
            position: relative;
            top: -0.55em;
          }
          .print-cols-container {
            display: flex;
            flex: 1;
          }
          .print-col {
            flex: 1;
            min-width: 80px;
            border-left: 1px solid #333;
          }
          .print-col:last-child {
            border-right: 1px solid #333;
          }
          .print-col-header {
            background: #e5e7eb;
            font-weight: 700;
            font-size: 8pt;
            text-align: center;
            padding: 3px 2px;
            border-top: 1px solid #333;
            border-bottom: 1px solid #333;
          }
          .print-col-body {
            position: relative;
            height: ${totalHeight}px;
          }
          .print-row-line {
            position: absolute;
            left: 0;
            right: 0;
            border-top: 1px solid #ddd;
            height: 0;
          }
          .print-row-line-hour {
            border-top: 1px solid #999;
          }
          .print-col-body .print-row-line:first-child {
            border-top: none;
          }
          .print-slot-block {
            position: absolute;
            left: 2px;
            right: 2px;
            background: #f3f4f6;
            border-left: 3px solid #555;
            border-radius: 1px;
            padding: 1px 3px;
            overflow: hidden;
            font-size: 7.5pt;
            line-height: 1.25;
            z-index: 1;
          }
          .print-slot-name {
            font-weight: 600;
            color: #111;
          }
          .print-slot-sub {
            font-weight: 400;
            color: #666;
            font-size: 7pt;
          }
          .print-slot-time {
            font-weight: 400;
            color: #888;
            font-size: 6.5pt;
          }
          /* Time column grid lines */
          .print-time-grid {
            position: relative;
            height: ${totalHeight}px;
          }
        }
      `}</style>

      <div className="print-header">
        <h1>{plan.name}</h1>
        <p>
          Gyldig fra {plan.valid_from}{plan.valid_to ? ` til ${plan.valid_to}` : ''}
          {plan.description ? ` · ${plan.description}` : ''}
        </p>
      </div>

      <div className="print-grid-wrapper">
        {/* Time labels column */}
        <div className="print-time-col">
          <div style={{ height: `${ROW_HEIGHT + 6}px` }} />
          <div className="print-time-grid">
            {timeLabels.map(m => (
              <div
                key={m}
                className="print-time-label"
                style={{
                  position: 'absolute',
                  top: `${((m - gridStart) / totalMinutes) * totalHeight}px`,
                  left: 0,
                  right: 0,
                  height: `${ROW_HEIGHT}px`,
                }}
              >
                <span>{minutesToLabel(m)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data columns */}
        <div className="print-cols-container">
          {columns.map((col, i) => {
            const colSlots = slotIndex.get(`${col.weekday}-${col.facilityId}`) ?? [];
            return (
              <div className="print-col" key={i}>
                <div className="print-col-header">
                  {col.dayLabel} · {col.facilityName}
                </div>
                <div className="print-col-body">
                  {/* Grid lines every 30 min */}
                  {timeLabels.map(m => (
                    <div
                      key={m}
                      className={`print-row-line${m % 60 === 0 ? ' print-row-line-hour' : ''}`}
                      style={{ top: `${((m - gridStart) / totalMinutes) * totalHeight}px` }}
                    />
                  ))}
                  {/* Bottom border */}
                  <div
                    className="print-row-line print-row-line-hour"
                    style={{ top: `${totalHeight}px` }}
                  />
                  {/* Slot blocks with precise positioning */}
                  {colSlots.map(s => {
                    const st = timeToMinutes(s.start_time);
                    const en = timeToMinutes(s.end_time);
                    const top = ((st - gridStart) / totalMinutes) * totalHeight;
                    const height = ((en - st) / totalMinutes) * totalHeight;
                    return (
                      <div
                        key={s.id}
                        className="print-slot-block"
                        style={{ top: `${top}px`, height: `${Math.max(height, 14)}px` }}
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
