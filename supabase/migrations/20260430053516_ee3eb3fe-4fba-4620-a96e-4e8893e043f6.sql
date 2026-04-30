CREATE TYPE public.team_gender AS ENUM ('M', 'K');
CREATE TYPE public.team_person_role AS ENUM ('cheftraener', 'traener', 'assistent', 'holdleder', 'ungtraener');

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abbreviation text NOT NULL,
  name text NOT NULL,
  gender public.team_gender NOT NULL,
  birth_year_from integer NOT NULL,
  birth_year_to integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT teams_abbreviation_unique UNIQUE (abbreviation),
  CONSTRAINT teams_birth_year_order CHECK (birth_year_to >= birth_year_from)
);

CREATE TABLE public.persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT persons_name_unique UNIQUE (name)
);

CREATE TABLE public.person_team_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  role public.team_person_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT person_team_roles_unique UNIQUE (person_id, team_id, role)
);

ALTER TABLE public.training_slots
ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
ADD COLUMN person_id uuid REFERENCES public.persons(id) ON DELETE SET NULL;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_team_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY teams_insert ON public.teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY teams_update ON public.teams FOR UPDATE TO authenticated USING (true);
CREATE POLICY teams_delete ON public.teams FOR DELETE TO authenticated USING (true);

CREATE POLICY persons_select ON public.persons FOR SELECT TO authenticated USING (true);
CREATE POLICY persons_insert ON public.persons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY persons_update ON public.persons FOR UPDATE TO authenticated USING (true);
CREATE POLICY persons_delete ON public.persons FOR DELETE TO authenticated USING (true);

CREATE POLICY person_team_roles_select ON public.person_team_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY person_team_roles_insert ON public.person_team_roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY person_team_roles_update ON public.person_team_roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY person_team_roles_delete ON public.person_team_roles FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_person_team_roles_person_id ON public.person_team_roles(person_id);
CREATE INDEX idx_person_team_roles_team_id ON public.person_team_roles(team_id);
CREATE INDEX idx_training_slots_team_id ON public.training_slots(team_id);
CREATE INDEX idx_training_slots_person_id ON public.training_slots(person_id);

CREATE TRIGGER validate_teams_birth_year
BEFORE INSERT OR UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.validate_time_range();