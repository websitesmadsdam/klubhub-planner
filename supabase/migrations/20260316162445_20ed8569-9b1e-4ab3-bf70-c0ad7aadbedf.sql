-- Fase 1: Tillad alle autentificerede brugere at slette (matcher INSERT/UPDATE policies)
-- Faciliteter
DROP POLICY IF EXISTS "facilities_delete" ON public.facilities;
CREATE POLICY "facilities_delete" ON public.facilities
  FOR DELETE TO authenticated USING (true);

-- Facility availability
DROP POLICY IF EXISTS "facility_availability_delete" ON public.facility_availability;
CREATE POLICY "facility_availability_delete" ON public.facility_availability
  FOR DELETE TO authenticated USING (true);

-- Training plans
DROP POLICY IF EXISTS "training_plans_delete" ON public.training_plans;
CREATE POLICY "training_plans_delete" ON public.training_plans
  FOR DELETE TO authenticated USING (true);

-- Training slots
DROP POLICY IF EXISTS "training_slots_delete" ON public.training_slots;
CREATE POLICY "training_slots_delete" ON public.training_slots
  FOR DELETE TO authenticated USING (true);

-- Tasks
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE TO authenticated USING (true);

-- Yearwheel items
DROP POLICY IF EXISTS "yearwheel_items_delete" ON public.yearwheel_items;
CREATE POLICY "yearwheel_items_delete" ON public.yearwheel_items
  FOR DELETE TO authenticated USING (true);