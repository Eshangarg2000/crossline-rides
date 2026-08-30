ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS driver_payout numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS payment_environment text NOT NULL DEFAULT 'sandbox';

ALTER TABLE public.bookings ALTER COLUMN payment_status SET DEFAULT 'pending';
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_session_id_key
  ON public.bookings (stripe_session_id) WHERE stripe_session_id IS NOT NULL;