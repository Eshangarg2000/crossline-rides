-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'reviewer', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE POLICY "Admins read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Decision metadata on applications
ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS decision_source text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS decision_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

-- Admin/reviewer access to applications
CREATE POLICY "Reviewers read all applications"
ON public.driver_applications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reviewer'));

CREATE POLICY "Reviewers decide applications"
ON public.driver_applications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reviewer'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reviewer'));

-- Reviewers can open uploaded documents
CREATE POLICY "Reviewers read driver docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'driver-docs'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reviewer'))
);