CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND is_active = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

ALTER POLICY facilities_select ON public.facilities
  USING (public.is_active_user(auth.uid()));
ALTER POLICY facilities_insert ON public.facilities
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY facilities_update ON public.facilities
  USING (public.is_active_user(auth.uid()))
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY facilities_delete ON public.facilities
  USING (public.is_active_user(auth.uid()));

ALTER POLICY facility_availability_select ON public.facility_availability
  USING (public.is_active_user(auth.uid()));
ALTER POLICY facility_availability_insert ON public.facility_availability
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY facility_availability_update ON public.facility_availability
  USING (public.is_active_user(auth.uid()))
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY facility_availability_delete ON public.facility_availability
  USING (public.is_active_user(auth.uid()));

ALTER POLICY training_plans_select ON public.training_plans
  USING (public.is_active_user(auth.uid()));
ALTER POLICY training_plans_insert ON public.training_plans
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY training_plans_update ON public.training_plans
  USING (public.is_active_user(auth.uid()))
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY training_plans_delete ON public.training_plans
  USING (public.is_active_user(auth.uid()));

ALTER POLICY training_slots_select ON public.training_slots
  USING (public.is_active_user(auth.uid()));
ALTER POLICY training_slots_insert ON public.training_slots
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY training_slots_update ON public.training_slots
  USING (public.is_active_user(auth.uid()))
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY training_slots_delete ON public.training_slots
  USING (public.is_active_user(auth.uid()));

ALTER POLICY teams_select ON public.teams
  USING (public.is_active_user(auth.uid()));
ALTER POLICY teams_insert ON public.teams
  WITH CHECK ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()));
ALTER POLICY teams_update ON public.teams
  USING ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()))
  WITH CHECK ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()));
ALTER POLICY teams_delete ON public.teams
  USING ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()));

ALTER POLICY persons_select ON public.persons
  USING (public.is_active_user(auth.uid()));
ALTER POLICY persons_insert ON public.persons
  WITH CHECK ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()));
ALTER POLICY persons_update ON public.persons
  USING ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()))
  WITH CHECK ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()));
ALTER POLICY persons_delete ON public.persons
  USING ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()));

ALTER POLICY person_team_roles_select ON public.person_team_roles
  USING (public.is_active_user(auth.uid()));
ALTER POLICY person_team_roles_insert ON public.person_team_roles
  WITH CHECK ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()));
ALTER POLICY person_team_roles_update ON public.person_team_roles
  USING ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()))
  WITH CHECK ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()));
ALTER POLICY person_team_roles_delete ON public.person_team_roles
  USING ((auth.uid() IS NOT NULL) AND public.is_active_user(auth.uid()));

ALTER POLICY yearwheel_items_select ON public.yearwheel_items
  USING (public.is_active_user(auth.uid()));
ALTER POLICY yearwheel_items_insert ON public.yearwheel_items
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY yearwheel_items_update ON public.yearwheel_items
  USING (public.is_active_user(auth.uid()))
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY yearwheel_items_delete ON public.yearwheel_items
  USING (public.is_active_user(auth.uid()));

ALTER POLICY tasks_select ON public.tasks
  USING (public.is_active_user(auth.uid()));
ALTER POLICY tasks_insert ON public.tasks
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY tasks_update ON public.tasks
  USING (public.is_active_user(auth.uid()))
  WITH CHECK (public.is_active_user(auth.uid()));
ALTER POLICY tasks_delete ON public.tasks
  USING (public.is_active_user(auth.uid()));

ALTER POLICY profiles_select ON public.profiles
  USING (public.is_active_user(auth.uid()));
ALTER POLICY profiles_update_own ON public.profiles
  USING ((id = auth.uid()) AND public.is_active_user(auth.uid()))
  WITH CHECK ((id = auth.uid()) AND public.is_active_user(auth.uid()));
ALTER POLICY profiles_update_admin ON public.profiles
  USING (public.is_admin(auth.uid()) AND public.is_active_user(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) AND public.is_active_user(auth.uid()));