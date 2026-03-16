
-- Add season_label and template_id to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS season_label text,
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.task_templates(id) ON DELETE SET NULL;

-- Unique constraint: one task per template per season
CREATE UNIQUE INDEX IF NOT EXISTS tasks_template_season_unique
  ON public.tasks (template_id, season_label)
  WHERE template_id IS NOT NULL AND season_label IS NOT NULL;
