-- ============ 1. Extensibility + lifecycle columns ============
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS ride_kind text NOT NULL DEFAULT 'cost_share',
  ADD COLUMN IF NOT EXISTS pickup_flexibility text NOT NULL DEFAULT 'on_route',
  ADD COLUMN IF NOT EXISTS max_detour_min integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recurrence jsonb,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS seats_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS refund_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_request text,
  ADD COLUMN IF NOT EXISTS dropoff_request text,
  ADD COLUMN IF NOT EXISTS pickup_point jsonb,
  ADD COLUMN IF NOT EXISTS estimated_detour_min integer;

UPDATE public.bookings SET status = 'pending_payment' WHERE status = 'pending';
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'pending_payment';
ALTER TABLE public.bookings ALTER COLUMN payment_status SET DEFAULT 'pending';

-- ============ 2. Supporting tables ============
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  environment text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.stripe_events TO service_role;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.log_audit(
  _actor uuid, _action text, _entity_type text, _entity_id uuid, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (_actor, _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.log_audit(uuid, text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_user(
  _user uuid, _type text, _title text, _body text, _entity_type text, _entity_id uuid
) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id)
  VALUES (_user, _type, _title, _body, _entity_type, _entity_id);
$$;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

-- ============ 3. Driver authorization ============
CREATE OR REPLACE FUNCTION public.is_approved_driver(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.driver_applications
    WHERE user_id = _user_id
      AND status = 'approved'
      AND (licence_expiry IS NULL OR licence_expiry >= CURRENT_DATE)
      AND (insurance_expiry IS NULL OR insurance_expiry >= CURRENT_DATE)
  );
$$;
REVOKE ALL ON FUNCTION public.is_approved_driver(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_driver(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Drivers can create rides" ON public.rides;
CREATE POLICY "Approved drivers can create rides" ON public.rides
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = driver_id AND public.is_approved_driver(auth.uid()));

DROP POLICY IF EXISTS "Drivers can update their rides" ON public.rides;
CREATE POLICY "Approved drivers can update their rides" ON public.rides
  FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id AND public.is_approved_driver(auth.uid()))
  WITH CHECK (auth.uid() = driver_id AND public.is_approved_driver(auth.uid()));

-- ============ 4. Ride deletion protection ============
CREATE OR REPLACE FUNCTION public.prevent_ride_delete_with_bookings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.bookings WHERE ride_id = OLD.id) THEN
    RAISE EXCEPTION 'This ride has bookings and cannot be deleted. Cancel it instead.';
  END IF;
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS rides_block_delete ON public.rides;
CREATE TRIGGER rides_block_delete BEFORE DELETE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.prevent_ride_delete_with_bookings();

-- ============ 5. Bookings: no direct client writes ============
DROP TRIGGER IF EXISTS bookings_reserve_seats ON public.bookings;
DROP FUNCTION IF EXISTS public.handle_booking_seats();
DROP POLICY IF EXISTS "Riders create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Riders and drivers update bookings" ON public.bookings;
REVOKE INSERT, UPDATE, DELETE ON public.bookings FROM authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_open_per_rider_ride
  ON public.bookings (rider_id, ride_id)
  WHERE status = 'pending_payment';

-- ============ 6. Atomic seat + booking operations ============
CREATE OR REPLACE FUNCTION public.expire_stale_holds(_ride_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b RECORD; n integer := 0;
BEGIN
  FOR b IN
    SELECT id, ride_id, seats FROM public.bookings
    WHERE status = 'pending_payment'
      AND hold_expires_at IS NOT NULL
      AND hold_expires_at < now()
      AND seats_released_at IS NULL
      AND (_ride_id IS NULL OR ride_id = _ride_id)
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.rides
      SET seats_available = LEAST(seats_total, seats_available + b.seats)
      WHERE id = b.ride_id;
    UPDATE public.bookings
      SET status = 'expired', payment_status = 'expired',
          seats_released_at = now(), updated_at = now()
      WHERE id = b.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.expire_stale_holds(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_stale_holds(uuid) TO authenticated, service_role;

-- Server-authoritative booking creation: price, fee and payout are computed here.
CREATE OR REPLACE FUNCTION public.create_booking_hold(
  _ride_id uuid, _seats integer, _environment text, _hold_minutes integer DEFAULT 30
) RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  r RECORD;
  existing public.bookings;
  fee_rate numeric := 0.12;
  fee_min numeric := 1;
  subtotal numeric; fee numeric; total numeric;
  result public.bookings;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _seats IS NULL OR _seats < 1 OR _seats > 8 THEN RAISE EXCEPTION 'Invalid seat count'; END IF;
  IF _environment NOT IN ('sandbox','live') THEN RAISE EXCEPTION 'Invalid payment environment'; END IF;

  PERFORM public.expire_stale_holds(_ride_id);

  SELECT * INTO r FROM public.rides WHERE id = _ride_id FOR UPDATE;
  IF r IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;
  IF r.status <> 'published' THEN RAISE EXCEPTION 'This ride is no longer open for booking'; END IF;
  IF r.depart_at <= now() THEN RAISE EXCEPTION 'This ride has already departed'; END IF;
  IF r.driver_id = uid THEN RAISE EXCEPTION 'You cannot book your own ride'; END IF;

  -- Idempotency: reuse an open hold for the same rider + ride + seat count.
  SELECT * INTO existing FROM public.bookings
    WHERE rider_id = uid AND ride_id = _ride_id AND status = 'pending_payment'
    FOR UPDATE;
  IF existing.id IS NOT NULL THEN
    IF existing.seats = _seats THEN
      UPDATE public.bookings
        SET hold_expires_at = now() + make_interval(mins => _hold_minutes), updated_at = now()
        WHERE id = existing.id RETURNING * INTO result;
      RETURN result;
    END IF;
    -- Different seat count: release the old hold before creating a new one.
    UPDATE public.rides SET seats_available = LEAST(seats_total, seats_available + existing.seats)
      WHERE id = _ride_id;
    UPDATE public.bookings
      SET status = 'cancelled', payment_status = 'expired', seats_released_at = now(),
          cancelled_at = now(), cancellation_reason = 'Replaced by a new checkout', updated_at = now()
      WHERE id = existing.id;
    SELECT * INTO r FROM public.rides WHERE id = _ride_id FOR UPDATE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE rider_id = uid AND ride_id = _ride_id AND status IN ('confirmed','completed')
  ) THEN
    RAISE EXCEPTION 'You already have a confirmed booking on this ride';
  END IF;

  IF r.seats_available < _seats THEN RAISE EXCEPTION 'Not enough seats left on this ride'; END IF;

  subtotal := round(r.price_per_seat * _seats, 2);
  fee := round(GREATEST(fee_min, subtotal * fee_rate), 2);
  total := round(subtotal + fee, 2);

  UPDATE public.rides SET seats_available = seats_available - _seats WHERE id = _ride_id;

  INSERT INTO public.bookings (
    ride_id, rider_id, seats, total_amount, service_fee, driver_payout,
    payment_status, status, payment_environment, hold_expires_at
  ) VALUES (
    _ride_id, uid, _seats, total, fee, subtotal,
    'pending', 'pending_payment', _environment, now() + make_interval(mins => _hold_minutes)
  ) RETURNING * INTO result;

  PERFORM public.notify_user(uid, 'booking_created', 'Booking started',
    'Complete payment to confirm your seat.', 'booking', result.id);
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.create_booking_hold(uuid, integer, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_hold(uuid, integer, text, integer) TO authenticated, service_role;

-- Confirm a paid booking exactly once (called by the verified webhook only).
CREATE OR REPLACE FUNCTION public.confirm_booking_paid(
  _booking_id uuid, _environment text, _tax numeric, _total numeric, _payment_intent text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings
    WHERE id = _booking_id AND payment_environment = _environment FOR UPDATE;
  IF b.id IS NULL THEN RETURN false; END IF;
  IF b.payment_status = 'paid' THEN RETURN false; END IF;
  IF b.status IN ('cancelled','expired') THEN RETURN false; END IF;

  UPDATE public.bookings SET
    payment_status = 'paid',
    status = 'confirmed',
    tax_amount = COALESCE(_tax, tax_amount),
    total_amount = COALESCE(_total, total_amount),
    stripe_payment_intent_id = COALESCE(_payment_intent, stripe_payment_intent_id),
    hold_expires_at = NULL,
    updated_at = now()
  WHERE id = _booking_id;

  PERFORM public.notify_user(b.rider_id, 'booking_confirmed', 'Booking confirmed',
    'Your payment succeeded and your seat is confirmed.', 'booking', b.id);
  PERFORM public.notify_user((SELECT driver_id FROM public.rides WHERE id = b.ride_id),
    'seat_booked', 'A seat was booked', 'A rider confirmed a seat on your ride.', 'booking', b.id);
  PERFORM public.log_audit(NULL, 'booking_paid', 'booking', b.id,
    jsonb_build_object('environment', _environment, 'total', _total));
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.confirm_booking_paid(uuid, text, numeric, numeric, text) FROM PUBLIC, anon, authenticated;

-- Fail/expire a booking exactly once, releasing seats once.
CREATE OR REPLACE FUNCTION public.fail_booking(
  _booking_id uuid, _environment text, _payment_status text, _reason text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings
    WHERE id = _booking_id AND payment_environment = _environment FOR UPDATE;
  IF b.id IS NULL OR b.status <> 'pending_payment' THEN RETURN false; END IF;

  IF b.seats_released_at IS NULL THEN
    UPDATE public.rides SET seats_available = LEAST(seats_total, seats_available + b.seats)
      WHERE id = b.ride_id;
  END IF;
  UPDATE public.bookings SET
    payment_status = _payment_status,
    status = CASE WHEN _payment_status = 'expired' THEN 'expired' ELSE 'cancelled' END,
    seats_released_at = COALESCE(seats_released_at, now()),
    cancellation_reason = _reason,
    cancelled_at = now(),
    updated_at = now()
  WHERE id = b.id;

  PERFORM public.notify_user(b.rider_id, 'payment_failed', 'Payment not completed',
    COALESCE(_reason, 'Your seat hold was released.'), 'booking', b.id);
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.fail_booking(uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- Cancellation (rider or driver), seats released exactly once.
CREATE OR REPLACE FUNCTION public.cancel_booking_atomic(
  _booking_id uuid, _actor uuid, _reason text, _refund numeric, _by_driver boolean DEFAULT false
) RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.bookings; r RECORD; result public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Booking not found'; END IF;
  SELECT * INTO r FROM public.rides WHERE id = b.ride_id;
  IF NOT (_actor = b.rider_id OR _actor = r.driver_id OR public.has_role(_actor, 'admin')) THEN
    RAISE EXCEPTION 'Not allowed to cancel this booking';
  END IF;
  IF b.status IN ('cancelled','expired','completed') THEN
    RAISE EXCEPTION 'This booking is already closed';
  END IF;

  IF b.seats_released_at IS NULL THEN
    UPDATE public.rides SET seats_available = LEAST(seats_total, seats_available + b.seats)
      WHERE id = b.ride_id;
  END IF;

  UPDATE public.bookings SET
    status = 'cancelled',
    payment_status = CASE WHEN b.payment_status = 'paid' AND COALESCE(_refund,0) > 0
                          THEN 'refunded' ELSE b.payment_status END,
    refund_amount = COALESCE(_refund, 0),
    driver_payout = CASE WHEN COALESCE(_refund,0) >= b.total_amount THEN 0 ELSE b.driver_payout END,
    seats_released_at = COALESCE(seats_released_at, now()),
    cancelled_at = now(), cancelled_by = _actor, cancellation_reason = _reason,
    updated_at = now()
  WHERE id = b.id RETURNING * INTO result;

  PERFORM public.notify_user(b.rider_id, 'booking_cancelled',
    CASE WHEN _by_driver THEN 'Your ride was cancelled' ELSE 'Booking cancelled' END,
    _reason, 'booking', b.id);
  PERFORM public.notify_user(r.driver_id, 'booking_cancelled', 'A booking was cancelled',
    _reason, 'booking', b.id);
  PERFORM public.log_audit(_actor, 'booking_cancelled', 'booking', b.id,
    jsonb_build_object('refund', _refund, 'by_driver', _by_driver));
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.cancel_booking_atomic(uuid, uuid, text, numeric, boolean) FROM PUBLIC, anon, authenticated;

-- Soft-cancel a ride (driver or admin). Paid bookings are refunded by the server first.
CREATE OR REPLACE FUNCTION public.cancel_ride_atomic(_ride_id uuid, _actor uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM public.rides WHERE id = _ride_id FOR UPDATE;
  IF r IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;
  IF NOT (_actor = r.driver_id OR public.has_role(_actor, 'admin')) THEN
    RAISE EXCEPTION 'Not allowed to cancel this ride';
  END IF;
  UPDATE public.rides
    SET status = 'cancelled', cancelled_at = now(), cancellation_reason = _reason, updated_at = now()
    WHERE id = _ride_id;
  PERFORM public.log_audit(_actor, 'ride_cancelled', 'ride', _ride_id,
    jsonb_build_object('reason', _reason));
END; $$;
REVOKE ALL ON FUNCTION public.cancel_ride_atomic(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- Ride lifecycle completion.
CREATE OR REPLACE FUNCTION public.complete_due_rides()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n integer := 0;
BEGIN
  PERFORM public.expire_stale_holds(NULL);
  FOR r IN
    SELECT id, driver_id FROM public.rides
    WHERE status = 'published'
      AND COALESCE(arrive_at, depart_at + interval '6 hours') < now() - interval '1 hour'
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.rides SET status = 'completed', completed_at = now() WHERE id = r.id;
    UPDATE public.bookings SET status = 'completed', completed_at = now(), updated_at = now()
      WHERE ride_id = r.id AND status = 'confirmed' AND payment_status = 'paid';
    UPDATE public.profiles p SET trips_count = p.trips_count + 1 WHERE p.id = r.driver_id;
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.complete_due_rides() FROM PUBLIC, anon, authenticated;
