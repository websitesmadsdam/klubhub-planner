
-- Fix search_path on validation functions
ALTER FUNCTION public.validate_weekday() SET search_path = public;
ALTER FUNCTION public.validate_time_range() SET search_path = public;
ALTER FUNCTION public.validate_single_active_plan() SET search_path = public;
