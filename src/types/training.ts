// Local types matching the database schema exactly
// Used because supabase types.ts hasn't synced yet

export type TrainingPlanStatus = 'draft' | 'active' | 'archived';
export type Priority = 'low' | 'normal' | 'high';
export type TeamGender = 'M' | 'K';
export type TeamPersonRole = 'cheftraener' | 'traener' | 'assistent' | 'holdleder' | 'ungtraener';

export interface TrainingPlan {
  id: string;
  name: string;
  description: string | null;
  status: TrainingPlanStatus;
  valid_from: string;
  valid_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  location: string;
  name: string;
  description: string | null;
  simultaneous_capacity: number;
  created_at: string;
  updated_at: string;
}

export interface FacilityAvailability {
  id: string;
  facility_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  abbreviation: string;
  name: string;
  gender: TeamGender;
  birth_year_from: number;
  birth_year_to: number;
  created_at: string;
  updated_at: string;
}

export interface Person {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface PersonTeamRole {
  id: string;
  person_id: string;
  team_id: string;
  role: TeamPersonRole;
  created_at: string;
  updated_at: string;
}

export interface TrainingSlot {
  id: string;
  training_plan_id: string;
  facility_id: string;
  team_id: string | null;
  person_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
  team_group_name: string;
  subgroup_name: string | null;
  responsible_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const WEEKDAYS: Record<number, string> = {
  1: 'Mandag',
  2: 'Tirsdag',
  3: 'Onsdag',
  4: 'Torsdag',
  5: 'Fredag',
  6: 'Lørdag',
  7: 'Søndag',
};

export const WEEKDAY_OPTIONS = Object.entries(WEEKDAYS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

export const TEAM_PERSON_ROLE_LABELS: Record<TeamPersonRole, string> = {
  cheftraener: 'Cheftræner',
  traener: 'Træner',
  assistent: 'Assistent',
  holdleder: 'Holdleder',
  ungtraener: 'Ungtræner',
};

export const TEAM_PERSON_ROLE_OPTIONS = Object.entries(TEAM_PERSON_ROLE_LABELS).map(([value, label]) => ({
  value: value as TeamPersonRole,
  label,
}));
