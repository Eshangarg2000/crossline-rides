
DO $$ BEGIN
  CREATE TYPE public.driver_app_status AS ENUM ('draft','submitted','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.driver_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.driver_app_status NOT NULL DEFAULT 'draft',
  legal_name text,
  date_of_birth date,
  phone text,
  street_address text,
  city text,
  province text,
  postal_code text,
  licence_number text,
  licence_province text,
  licence_class text,
  licence_expiry date,
  vehicle_make text,
  vehicle_model text,
  vehicle_year int,
  vehicle_colour text,
  plate_number text,
  plate_province text,
  insurance_company text,
  insurance_policy_number text,
  insurance_expiry date,
  licence_front_path text,
  licence_back_path text,
  insurance_path text,
  registration_path text,
  abstract_path text,
  consent_background_check boolean NOT NULL DEFAULT false,
  consent_terms boolean NOT NULL DEFAULT false,
  consent_accurate boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.driver_applications TO authenticated;
GRANT ALL ON public.driver_applications TO service_role;

ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers read own application" ON public.driver_applications;
CREATE POLICY "Drivers read own application"
  ON public.driver_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Drivers create own application" ON public.driver_applications;
CREATE POLICY "Drivers create own application"
  ON public.driver_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status IN ('draft','submitted'));

DROP POLICY IF EXISTS "Drivers update own application before approval" ON public.driver_applications;
CREATE POLICY "Drivers update own application before approval"
  ON public.driver_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('draft','submitted','rejected'))
  WITH CHECK (auth.uid() = user_id AND status IN ('draft','submitted','rejected'));

DROP TRIGGER IF EXISTS driver_applications_updated_at ON public.driver_applications;
CREATE TRIGGER driver_applications_updated_at
  BEFORE UPDATE ON public.driver_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Drivers read own documents" ON storage.objects;
CREATE POLICY "Drivers read own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Drivers upload own documents" ON storage.objects;
CREATE POLICY "Drivers upload own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Drivers update own documents" ON storage.objects;
CREATE POLICY "Drivers update own documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Drivers delete own documents" ON storage.objects;
CREATE POLICY "Drivers delete own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'driver-docs' AND (storage.foldername(name))[1] = auth.uid()::text);
