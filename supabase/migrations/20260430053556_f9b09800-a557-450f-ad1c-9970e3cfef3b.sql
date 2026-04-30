DROP TRIGGER IF EXISTS validate_teams_birth_year ON public.teams;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_persons_updated_at
BEFORE UPDATE ON public.persons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_person_team_roles_updated_at
BEFORE UPDATE ON public.person_team_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS teams_insert ON public.teams;
DROP POLICY IF EXISTS teams_update ON public.teams;
DROP POLICY IF EXISTS teams_delete ON public.teams;
DROP POLICY IF EXISTS persons_insert ON public.persons;
DROP POLICY IF EXISTS persons_update ON public.persons;
DROP POLICY IF EXISTS persons_delete ON public.persons;
DROP POLICY IF EXISTS person_team_roles_insert ON public.person_team_roles;
DROP POLICY IF EXISTS person_team_roles_update ON public.person_team_roles;
DROP POLICY IF EXISTS person_team_roles_delete ON public.person_team_roles;

CREATE POLICY teams_insert ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY teams_update ON public.teams FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY teams_delete ON public.teams FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY persons_insert ON public.persons FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY persons_update ON public.persons FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY persons_delete ON public.persons FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY person_team_roles_insert ON public.person_team_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY person_team_roles_update ON public.person_team_roles FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY person_team_roles_delete ON public.person_team_roles FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);