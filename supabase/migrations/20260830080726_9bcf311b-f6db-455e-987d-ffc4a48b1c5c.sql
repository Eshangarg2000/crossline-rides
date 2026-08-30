CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  city TEXT,
  avatar_url TEXT,
  rating NUMERIC(2,1) NOT NULL DEFAULT 5.0,
  trips_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  stops TEXT[] NOT NULL DEFAULT '{}',
  depart_at TIMESTAMPTZ NOT NULL,
  arrive_at TIMESTAMPTZ,
  seats_total INTEGER NOT NULL DEFAULT 3,
  seats_available INTEGER NOT NULL DEFAULT 3,
  price_per_seat NUMERIC(8,2) NOT NULL,
  car TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rides TO authenticated;
GRANT SELECT ON public.rides TO anon;
GRANT ALL ON public.rides TO service_role;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rides are viewable by everyone" ON public.rides FOR SELECT USING (true);
CREATE POLICY "Drivers can create rides" ON public.rides FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers can update their rides" ON public.rides FOR UPDATE TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Drivers can delete their rides" ON public.rides FOR DELETE TO authenticated USING (auth.uid() = driver_id);
CREATE INDEX rides_depart_at_idx ON public.rides (depart_at);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.rides ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  seats INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(8,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Riders view own bookings" ON public.bookings FOR SELECT TO authenticated USING (
  auth.uid() = rider_id OR auth.uid() = (SELECT driver_id FROM public.rides r WHERE r.id = ride_id)
);
CREATE POLICY "Riders create own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Riders and drivers update bookings" ON public.bookings FOR UPDATE TO authenticated USING (
  auth.uid() = rider_id OR auth.uid() = (SELECT driver_id FROM public.rides r WHERE r.id = ride_id)
);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER rides_updated_at BEFORE UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_booking_seats() RETURNS TRIGGER AS $$
DECLARE avail INTEGER;
BEGIN
  SELECT seats_available INTO avail FROM public.rides WHERE id = NEW.ride_id FOR UPDATE;
  IF avail IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;
  IF NEW.seats < 1 THEN RAISE EXCEPTION 'At least one seat is required'; END IF;
  IF avail < NEW.seats THEN RAISE EXCEPTION 'Not enough seats available'; END IF;
  UPDATE public.rides SET seats_available = seats_available - NEW.seats WHERE id = NEW.ride_id;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER bookings_reserve_seats BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.handle_booking_seats();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, city)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.raw_user_meta_data->>'city')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();