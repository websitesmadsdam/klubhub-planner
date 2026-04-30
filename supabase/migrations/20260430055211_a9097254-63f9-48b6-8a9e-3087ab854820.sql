ALTER TABLE public.facilities
ADD COLUMN IF NOT EXISTS location text;

UPDATE public.facilities
SET location = name
WHERE location IS NULL OR btrim(location) = '';

ALTER TABLE public.facilities
ALTER COLUMN location SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_facilities_location ON public.facilities (location, name);