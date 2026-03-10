
-- Enums
CREATE TYPE public.training_plan_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.yearwheel_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.task_status AS ENUM ('not_started', 'in_progress', 'waiting', 'completed', 'cancelled');
CREATE TYPE public.priority AS ENUM ('low', 'normal', 'high');

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  role text NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Facilities
CREATE TABLE public.facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  simultaneous_capacity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Facility availability
CREATE TABLE public.facility_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  weekday integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  valid_from date NOT NULL,
  valid_to date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Training plans
CREATE TABLE public.training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status training_plan_status NOT NULL DEFAULT 'draft',
  valid_from date NOT NULL,
  valid_to date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Training slots
CREATE TABLE public.training_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  facility_id uuid NOT NULL REFERENCES public.facilities(id),
  weekday integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  team_group_name text NOT NULL,
  subgroup_name text,
  responsible_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Yearwheel items
CREATE TABLE public.yearwheel_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  description text,
  start_date date NOT NULL,
  end_date date,
  responsible_user_id uuid REFERENCES public.profiles(id),
  status yearwheel_status NOT NULL DEFAULT 'planned',
  priority priority NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  responsible_user_id uuid REFERENCES public.profiles(id),
  deadline date,
  status task_status NOT NULL DEFAULT 'not_started',
  priority priority NOT NULL DEFAULT 'normal',
  yearwheel_item_id uuid REFERENCES public.yearwheel_items(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Weekday validation triggers (1-7)
CREATE OR REPLACE FUNCTION public.validate_weekday()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.weekday < 1 OR NEW.weekday > 7 THEN
    RAISE EXCEPTION 'weekday must be between 1 and 7';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_weekday_facility_availability
  BEFORE INSERT OR UPDATE ON public.facility_availability
  FOR EACH ROW EXECUTE FUNCTION public.validate_weekday();

CREATE TRIGGER validate_weekday_training_slots
  BEFORE INSERT OR UPDATE ON public.training_slots
  FOR EACH ROW EXECUTE FUNCTION public.validate_weekday();

-- end_time > start_time validation
CREATE OR REPLACE FUNCTION public.validate_time_range()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'end_time must be after start_time';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_time_range_facility_availability
  BEFORE INSERT OR UPDATE ON public.facility_availability
  FOR EACH ROW EXECUTE FUNCTION public.validate_time_range();

CREATE TRIGGER validate_time_range_training_slots
  BEFORE INSERT OR UPDATE ON public.training_slots
  FOR EACH ROW EXECUTE FUNCTION public.validate_time_range();

-- Only one active training plan at a time
CREATE OR REPLACE FUNCTION public.validate_single_active_plan()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF EXISTS (
      SELECT 1 FROM public.training_plans
      WHERE status = 'active' AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Only one training plan can be active at a time';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_single_active_plan
  BEFORE INSERT OR UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.validate_single_active_plan();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS policies (authenticated users can read all, modify own)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearwheel_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read everything
CREATE POLICY "Authenticated users can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Authenticated users can read facilities" ON public.facilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage facilities" ON public.facilities FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read facility_availability" ON public.facility_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage facility_availability" ON public.facility_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read training_plans" ON public.training_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage training_plans" ON public.training_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read training_slots" ON public.training_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage training_slots" ON public.training_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read yearwheel_items" ON public.yearwheel_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage yearwheel_items" ON public.yearwheel_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
