
-- Add columns to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'ad_hoc',
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Task participants (øvrige deltagere)
CREATE TABLE public.task_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_participants_select" ON public.task_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_participants_insert" ON public.task_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_participants_delete" ON public.task_participants FOR DELETE TO authenticated USING (true);

-- Task templates (årshjulsskabeloner)
CREATE TABLE public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  area text,
  default_period_start_month integer,
  default_period_end_month integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_templates_select" ON public.task_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_templates_insert" ON public.task_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_templates_update" ON public.task_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "task_templates_delete" ON public.task_templates FOR DELETE TO authenticated USING (true);
