export interface Task {
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  task_type: string;
  status: 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high';
  period_start: string | null;
  period_end: string | null;
  deadline: string | null;
  responsible_user_id: string | null;
  yearwheel_item_id: string | null;
  notes: string | null;
  completed_at: string | null;
  created_by: string | null;
  season_label: string | null;
  template_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  responsible?: { id: string; full_name: string | null; email: string | null } | null;
}

export interface TaskParticipant {
  id: string;
  task_id: string;
  user_id: string;
  created_at: string;
  profile?: { id: string; full_name: string | null; email: string | null };
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  area: string | null;
  default_period_start_month: number | null;
  default_period_end_month: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const TASK_STATUS_LABELS: Record<Task['status'], string> = {
  not_started: 'Ikke startet',
  in_progress: 'I gang',
  waiting: 'Afventer',
  completed: 'Færdig',
  cancelled: 'Annulleret',
};

export const ACTIVE_STATUSES: Task['status'][] = ['not_started', 'in_progress', 'waiting'];
export const CLOSED_STATUSES: Task['status'][] = ['completed', 'cancelled'];

export const isActiveStatus = (s: Task['status']) => ACTIVE_STATUSES.includes(s);
export const isClosedStatus = (s: Task['status']) => CLOSED_STATUSES.includes(s);

/** Logical next-status transitions for a simple workflow */
export const STATUS_TRANSITIONS: Record<Task['status'], Task['status'][]> = {
  not_started: ['in_progress', 'cancelled'],
  in_progress: ['waiting', 'completed', 'cancelled'],
  waiting: ['in_progress', 'completed', 'cancelled'],
  completed: ['in_progress'],            // reopen
  cancelled: ['not_started'],            // reopen
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  ad_hoc: 'Ad hoc',
  yearwheel: 'Årshjul',
};

export const PRIORITY_LABELS: Record<Task['priority'], string> = {
  low: 'Lav',
  normal: 'Normal',
  high: 'Høj',
};

export const AREA_OPTIONS = [
  'Bestyrelse',
  'Ungdomsudvalg',
  'Træning',
  'Økonomi',
  'Kommunikation',
  'Faciliteter',
  'Events',
  'Andet',
];

// Season helpers – season runs May 1 → April 30
export function getCurrentSeasonLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startYear = now.getMonth() < 4 ? year - 1 : year;
  return `${startYear}/${startYear + 1}`;
}

export function getPreviousSeasonLabel(seasonLabel: string): string {
  const [startYear] = seasonLabel.split('/').map(Number);
  return `${startYear - 1}/${startYear}`;
}

export function getSeasonOptions(): string[] {
  const now = new Date();
  const currentStart = now.getMonth() < 4 ? now.getFullYear() - 1 : now.getFullYear();
  return [
    `${currentStart - 1}/${currentStart}`,
    `${currentStart}/${currentStart + 1}`,
    `${currentStart + 1}/${currentStart + 2}`,
  ];
}

/** Get start/end dates for a season label like "2026/2027" */
export function getSeasonDates(seasonLabel: string): { start: string; end: string } {
  const [startYear] = seasonLabel.split('/').map(Number);
  return {
    start: `${startYear}-05-01`,
    end: `${startYear + 1}-04-30`,
  };
}

/** Convert a month number (1-12) to a date within the given season */
export function monthToSeasonDate(month: number, seasonLabel: string): string {
  const [startYear, endYear] = seasonLabel.split('/').map(Number);
  // Months 5-12 belong to startYear, months 1-4 belong to endYear
  const year = month >= 5 ? startYear : endYear;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
