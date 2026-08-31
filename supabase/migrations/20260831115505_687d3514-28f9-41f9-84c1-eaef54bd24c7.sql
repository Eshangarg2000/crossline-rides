-- 1. Enable scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Idempotent sweep routine: releases expired holds and completes due rides
CREATE OR REPLACE FUNCTION public.run_lifecycle_sweep()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE expired integer; completed integer;
BEGIN
  expired := public.expire_stale_holds(NULL);
  completed := public.complete_due_rides();
  IF expired > 0 OR completed > 0 THEN
    PERFORM public.log_audit(NULL, 'lifecycle_sweep', 'system', NULL,
      jsonb_build_object('expired_holds', expired, 'completed_rides', completed));
  END IF;
  RETURN jsonb_build_object('expired_holds', expired, 'completed_rides', completed);
END; $$;

REVOKE ALL ON FUNCTION public.run_lifecycle_sweep() FROM PUBLIC, anon, authenticated;

-- 3. Schedule it every 5 minutes (re-schedulable / idempotent)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'crossline-lifecycle-sweep';
SELECT cron.schedule('crossline-lifecycle-sweep', '*/5 * * * *', $$SELECT public.run_lifecycle_sweep();$$);

-- 4. Explicit driver payout tracking (manual, off-platform for now)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'not_due',
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS payout_at timestamptz;

-- Keep payout_status in step with the booking state machine
CREATE OR REPLACE FUNCTION public.sync_payout_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payout_status IN ('paid_out') THEN RETURN NEW; END IF;
  IF NEW.status = 'completed' AND NEW.payment_status = 'paid' AND NEW.driver_payout > 0 THEN
    NEW.payout_status := 'owed';
  ELSIF NEW.status IN ('cancelled','expired') OR NEW.driver_payout = 0 THEN
    NEW.payout_status := 'not_due';
  ELSE
    NEW.payout_status := 'pending_trip';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS bookings_payout_status ON public.bookings;
CREATE TRIGGER bookings_payout_status
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.sync_payout_status();