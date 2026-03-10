
-- ============================================
-- DROP ALL EXISTING RLS POLICIES
-- ============================================

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- facilities
DROP POLICY IF EXISTS "Authenticated can delete facilities" ON public.facilities;
DROP POLICY IF EXISTS "Authenticated can insert facilities" ON public.facilities;
DROP POLICY IF EXISTS "Authenticated can update facilities" ON public.facilities;
DROP POLICY IF EXISTS "Authenticated users can read facilities" ON public.facilities;

-- facility_availability
DROP POLICY IF EXISTS "Authenticated can delete facility_availability" ON public.facility_availability;
DROP POLICY IF EXISTS "Authenticated can insert facility_availability" ON public.facility_availability;
DROP POLICY IF EXISTS "Authenticated can update facility_availability" ON public.facility_availability;
DROP POLICY IF EXISTS "Authenticated users can read facility_availability" ON public.facility_availability;

-- training_plans
DROP POLICY IF EXISTS "Authenticated can insert training_plans" ON public.training_plans;
DROP POLICY IF EXISTS "Authenticated can read training_plans" ON public.training_plans;
DROP POLICY IF EXISTS "Authenticated can update training_plans" ON public.training_plans;

-- training_slots
DROP POLICY IF EXISTS "Authenticated can delete training_slots" ON public.training_slots;
DROP POLICY IF EXISTS "Authenticated can insert training_slots" ON public.training_slots;
DROP POLICY IF EXISTS "Authenticated can update training_slots" ON public.training_slots;
DROP POLICY IF EXISTS "Authenticated users can read training_slots" ON public.training_slots;

-- yearwheel_items
DROP POLICY IF EXISTS "Authenticated can delete yearwheel_items" ON public.yearwheel_items;
DROP POLICY IF EXISTS "Authenticated can insert yearwheel_items" ON public.yearwheel_items;
DROP POLICY IF EXISTS "Authenticated can update yearwheel_items" ON public.yearwheel_items;
DROP POLICY IF EXISTS "Authenticated users can read yearwheel_items" ON public.yearwheel_items;

-- tasks
DROP POLICY IF EXISTS "Authenticated can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can read tasks" ON public.tasks;

-- ============================================
-- 1. PROFILES
-- ============================================
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- Trigger to prevent non-admin from changing role or is_active
CREATE OR REPLACE FUNCTION public.prevent_self_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only admins can change role';
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Only admins can change is_active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_promotion_trigger ON public.profiles;
CREATE TRIGGER prevent_self_promotion_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_promotion();

-- ============================================
-- 2. FACILITIES
-- ============================================
CREATE POLICY "facilities_select" ON public.facilities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "facilities_insert" ON public.facilities
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "facilities_update" ON public.facilities
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "facilities_delete" ON public.facilities
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================
-- 3. FACILITY_AVAILABILITY
-- ============================================
CREATE POLICY "facility_availability_select" ON public.facility_availability
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "facility_availability_insert" ON public.facility_availability
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "facility_availability_update" ON public.facility_availability
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "facility_availability_delete" ON public.facility_availability
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================
-- 4. TRAINING_PLANS
-- ============================================
CREATE POLICY "training_plans_select" ON public.training_plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "training_plans_insert" ON public.training_plans
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "training_plans_update" ON public.training_plans
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "training_plans_delete" ON public.training_plans
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================
-- 5. TRAINING_SLOTS
-- ============================================
CREATE POLICY "training_slots_select" ON public.training_slots
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "training_slots_insert" ON public.training_slots
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "training_slots_update" ON public.training_slots
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "training_slots_delete" ON public.training_slots
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================
-- 6. YEARWHEEL_ITEMS
-- ============================================
CREATE POLICY "yearwheel_items_select" ON public.yearwheel_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "yearwheel_items_insert" ON public.yearwheel_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "yearwheel_items_update" ON public.yearwheel_items
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "yearwheel_items_delete" ON public.yearwheel_items
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================
-- 7. TASKS
-- ============================================
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
