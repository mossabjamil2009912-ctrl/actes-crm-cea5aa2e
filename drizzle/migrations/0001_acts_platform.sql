CREATE TABLE public.acts_engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'engineer',
  status text NOT NULL DEFAULT 'pending',
  reject_reason text,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  photo_url text,
  specialty text NOT NULL,
  university text,
  grad_year integer,
  qualifications text,
  skills text[] NOT NULL DEFAULT '{}',
  tools text[] NOT NULL DEFAULT '{}',
  services text[] NOT NULL DEFAULT '{}',
  years_exp integer NOT NULL DEFAULT 0,
  projects jsonb NOT NULL DEFAULT '[]'::jsonb,
  governorate text,
  city text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.acts_engineers TO service_role;
ALTER TABLE public.acts_engineers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.acts_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id uuid REFERENCES public.acts_engineers(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  name text,
  phone text NOT NULL,
  service text NOT NULL,
  governorate text,
  city text,
  location text,
  description text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  review_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.acts_service_requests TO service_role;
ALTER TABLE public.acts_service_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.acts_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL UNIQUE REFERENCES public.acts_service_requests(id) ON DELETE CASCADE,
  engineer_id uuid NOT NULL REFERENCES public.acts_engineers(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  quality integer NOT NULL CHECK (quality BETWEEN 1 AND 5),
  punctuality integer NOT NULL CHECK (punctuality BETWEEN 1 AND 5),
  professionalism integer NOT NULL CHECK (professionalism BETWEEN 1 AND 5),
  responsiveness integer NOT NULL CHECK (responsiveness BETWEEN 1 AND 5),
  comment text,
  reviewer_name text,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.acts_reviews TO service_role;
ALTER TABLE public.acts_reviews ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.acts_review_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r public.acts_service_requests;
BEGIN
  SELECT * INTO r FROM public.acts_service_requests WHERE id = NEW.request_id;
  IF r.id IS NULL OR r.status <> 'done' THEN RAISE EXCEPTION 'لا يمكن التقييم قبل اكتمال الطلب'; END IF;
  IF r.engineer_id IS NULL OR r.engineer_id <> NEW.engineer_id THEN RAISE EXCEPTION 'الطلب غير مرتبط بهذا المهندس'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER acts_review_guard BEFORE INSERT ON public.acts_reviews FOR EACH ROW EXECUTE FUNCTION public.acts_review_guard();

CREATE TABLE public.acts_review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.acts_reviews(id) ON DELETE CASCADE,
  reason text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.acts_review_reports TO service_role;
ALTER TABLE public.acts_review_reports ENABLE ROW LEVEL SECURITY;