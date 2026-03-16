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
  completed: 'Afsluttet',
  cancelled: 'Annulleret',
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
