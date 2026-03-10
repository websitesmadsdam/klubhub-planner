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
  capacity: number;
}

interface Props {
  plan: TrainingPlan;
  slots: TrainingSlot[];
  facilities: Facility[];
}

export default function TrainingPrintLayout({ plan, slots, facilities }: Props) {
  const facilityMap = useMemo(() => new Map(facilities.map(f => [f.id, f])), [facilities]);

  // Build columns: only day+facility combos that have slots
  const columns = useMemo<Column[]>(() => {
    const combos = new Set<string>();
    const cols: Column[] = [];
    // Sort by weekday then facility name
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
      const shortFac = (fac?.name ?? 'Ukendt').replace(/hallen$/i, '').replace(/\s+$/,'');
      cols.push({
        dayLabel: DAY_SHORT[s.weekday] ?? `D${s.weekday}`,
        facilityName: shortFac,
        weekday: s.weekday,
        facilityId: s.facility_id,
        capacity: fac?.simultaneous_capacity ?? 1,
      });
    }
    return cols;
  }, [slots, facilityMap]);

  // Compute time range (30-min aligned)
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

  // 30-min time rows
  const timeRows = useMemo(() => {
    const rows: number[] = [];
    for (let m = gridStart; m < gridEnd; m += 30) rows.push(m);
    return rows;
  }, [gridStart, gridEnd]);

  // Index slots by column+time for fast lookup
  const slotIndex = useMemo(() => {
    const idx = new Map<string, TrainingSlot[]>();
    for (const s of slots) {
      const colKey = `${s.weekday}-${s.facility_id}`;
      if (!idx.has(colKey)) idx.set(colKey, []);
      idx.get(colKey)!.push(s);
    }
    return idx;
  }, [slots]);

  // Find slots that overlap a given 30-min row
  function getSlotsInRow(col: Column, rowStart: number): TrainingSlot[] {
    const colSlots = slotIndex.get(`${col.weekday}-${col.facilityId}`) ?? [];
    const rowEnd = rowStart + 30;
    return colSlots.filter(s => {
      const st = timeToMinutes(s.start_time);
      const en = timeToMinutes(s.end_time);
      return st < rowEnd && en > rowStart;
    });
  }

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
          .print-grid {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
            table-layout: fixed;
          }
          .print-grid th,
          .print-grid td {
            border: 1px solid #333;
            padding: 2px 4px;
            vertical-align: top;
            text-align: left;
          }
          .print-grid thead th {
            background: #e5e7eb;
            font-weight: 700;
            text-align: center;
            font-size: 8pt;
          }
          .print-grid .time-cell {
            width: 50px;
            min-width: 50px;
            text-align: right;
            font-family: monospace;
            font-size: 8pt;
            font-weight: 600;
            color: #333;
            background: #f9fafb;
            vertical-align: middle;
          }
          .print-grid .slot-cell {
            font-size: 7.5pt;
            line-height: 1.2;
            color: #111;
            height: 18px;
          }
          .print-grid .slot-name {
            font-weight: 600;
          }
          .print-grid .slot-sub {
            font-weight: 400;
            color: #666;
            font-size: 7pt;
          }
          .col-header-day {
            font-size: 8pt;
            font-weight: 700;
            display: block;
          }
          .col-header-fac {
            font-size: 7pt;
            font-weight: 400;
            color: #555;
            display: block;
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

      <table className="print-grid">
        <thead>
          <tr>
            <th className="time-cell">Tid</th>
            {columns.map((col, i) => (
              <th key={i}>
                <span className="col-header-day">{col.dayLabel}</span>
                <span className="col-header-fac">{col.facilityName}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeRows.map(rowStart => (
            <tr key={rowStart}>
              <td className="time-cell">{minutesToLabel(rowStart)}</td>
              {columns.map((col, colIdx) => {
                const active = getSlotsInRow(col, rowStart);
                return (
                  <td key={colIdx} className="slot-cell">
                    {active.length > 0 ? (
                      active.map((s, si) => (
                        <span key={s.id}>
                          {si > 0 && ' / '}
                          <span className="slot-name">{s.team_group_name}</span>
                          {s.subgroup_name && <span className="slot-sub"> ({s.subgroup_name})</span>}
                        </span>
                      ))
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
