
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can manage facilities" ON public.facilities;
DROP POLICY IF EXISTS "Authenticated users can manage facility_availability" ON public.facility_availability;
DROP POLICY IF EXISTS "Authenticated users can manage training_plans" ON public.training_plans;
DROP POLICY IF EXISTS "Authenticated users can manage training_slots" ON public.training_slots;
DROP POLICY IF EXISTS "Authenticated users can manage yearwheel_items" ON public.yearwheel_items;
DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON public.tasks;

-- Helper: check if user is admin via profiles table
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'admin'
  );
$$;

-- Profiles: users can only read own profile; admins can read all
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

-- Facilities: all authenticated can read; only admins can modify
CREATE POLICY "Authenticated can insert facilities" ON public.facilities FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can update facilities" ON public.facilities FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can delete facilities" ON public.facilities FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Facility availability: all can read; admins can modify
CREATE POLICY "Authenticated can insert facility_availability" ON public.facility_availability FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can update facility_availability" ON public.facility_availability FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can delete facility_availability" ON public.facility_availability FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Training plans: all can read; admins can modify
CREATE POLICY "Authenticated can insert training_plans" ON public.training_plans FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can update training_plans" ON public.training_plans FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can delete training_plans" ON public.training_plans FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Training slots: all can read; admins can modify
CREATE POLICY "Authenticated can insert training_slots" ON public.training_slots FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can update training_slots" ON public.training_slots FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can delete training_slots" ON public.training_slots FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Yearwheel items: all can read; admins can modify
CREATE POLICY "Authenticated can insert yearwheel_items" ON public.yearwheel_items FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can update yearwheel_items" ON public.yearwheel_items FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can delete yearwheel_items" ON public.yearwheel_items FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Tasks: all can read; only responsible user or admin can modify
CREATE POLICY "Authenticated can insert tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (responsible_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (responsible_user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Authenticated can delete tasks" ON public.tasks FOR DELETE TO authenticated
  USING (responsible_user_id = auth.uid() OR public.is_admin(auth.uid()));
