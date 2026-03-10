
-- Drop existing restrictive policies on training_plans
DROP POLICY IF EXISTS "Authenticated users can read training_plans" ON public.training_plans;
DROP POLICY IF EXISTS "Authenticated can insert training_plans" ON public.training_plans;
DROP POLICY IF EXISTS "Authenticated can update training_plans" ON public.training_plans;
DROP POLICY IF EXISTS "Authenticated can delete training_plans" ON public.training_plans;

-- All authenticated can read
CREATE POLICY "Authenticated can read training_plans" ON public.training_plans
  FOR SELECT TO authenticated USING (true);

-- All authenticated can insert
CREATE POLICY "Authenticated can insert training_plans" ON public.training_plans
  FOR INSERT TO authenticated WITH CHECK (true);

-- All authenticated can update
CREATE POLICY "Authenticated can update training_plans" ON public.training_plans
  FOR UPDATE TO authenticated USING (true);

-- No delete allowed
