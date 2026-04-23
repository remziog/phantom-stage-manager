-- Helper: an IMMUTABLE wrapper around date_trunc so it can be used in an index expression.
CREATE OR REPLACE FUNCTION public.minute_bucket(ts TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT date_trunc('minute', ts);
$$;

-- Bucket inserts by the minute and enforce uniqueness on the logical change tuple.
-- Blocks accidental duplicate writes from rapid retries / double-saves
-- while still allowing legitimate re-transitions later in time.
CREATE UNIQUE INDEX module_change_log_dedupe_idx
  ON public.module_change_log (
    company_id,
    user_id,
    module,
    action,
    source,
    public.minute_bucket(created_at)
  )
  WHERE user_id IS NOT NULL;