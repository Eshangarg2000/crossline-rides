ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS origin_place_id text,
  ADD COLUMN IF NOT EXISTS destination_place_id text,
  ADD COLUMN IF NOT EXISTS origin_lat double precision,
  ADD COLUMN IF NOT EXISTS origin_lng double precision,
  ADD COLUMN IF NOT EXISTS destination_lat double precision,
  ADD COLUMN IF NOT EXISTS destination_lng double precision,
  ADD COLUMN IF NOT EXISTS distance_km numeric(8,2),
  ADD COLUMN IF NOT EXISTS duration_min integer,
  ADD COLUMN IF NOT EXISTS route_polyline text;