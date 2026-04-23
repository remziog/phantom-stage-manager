CREATE OR REPLACE FUNCTION public.minute_bucket(ts TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT date_trunc('minute', ts);
$$;