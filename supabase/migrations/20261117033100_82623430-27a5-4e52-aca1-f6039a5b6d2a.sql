CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  name text, city text, notes text, system text, last_message text,
  stage text NOT NULL DEFAULT 'new',
  unread integer NOT NULL DEFAULT 0,
  last_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  bot_paused boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'customer',
  kind text NOT NULL DEFAULT 'text',
  text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  file_name text, media_id text, media_url text, mime text
);
CREATE INDEX IF NOT EXISTS messages_customer_created_idx ON public.messages(customer_id, created_at);
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  phone text NOT NULL,
  name text, city text, amount text, details text, invoice_no text, method text,
  status text NOT NULL DEFAULT 'pending',
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START 1001;
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no text NOT NULL UNIQUE DEFAULT ('ACTES-SUP-' || nextval('public.support_ticket_seq')::text),
  customer_id uuid REFERENCES public.customers(id),
  phone text NOT NULL,
  name text, city text, device text, issue_type text, description text,
  media_id text, media_type text,
  status text NOT NULL DEFAULT 'open',
  assigned_to text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.support_tickets TO service_role;
GRANT USAGE ON SEQUENCE public.support_ticket_seq TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.catalog_items (
  key text PRIMARY KEY,
  kind text NOT NULL DEFAULT 'item',
  category text NOT NULL DEFAULT 'other',
  category_title text,
  name text NOT NULL,
  unit text,
  price numeric,
  label text,
  pdf_url text,
  specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  auto_rules jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT ALL ON public.catalog_items TO service_role;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no text NOT NULL DEFAULT ('ACTES-Q-' || to_char(now(),'YYMMDD-HH24MISS')),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  phone text,
  city text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.bot_button_locks (
  context_id text PRIMARY KEY,
  choice text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bot_button_locks TO service_role;
ALTER TABLE public.bot_button_locks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.report_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id),
  phone text NOT NULL,
  name text,
  system_label text,
  kind text NOT NULL DEFAULT 'pvsyst',
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  file_path text, file_name text,
  city text, lat double precision, lon double precision, tilt double precision, azimuth text,
  loads jsonb
);
GRANT ALL ON public.report_requests TO service_role;
ALTER TABLE public.report_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.preset_reports (
  preset_title text NOT NULL,
  kind text NOT NULL,
  path text NOT NULL,
  file_name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (preset_title, kind)
);
GRANT ALL ON public.preset_reports TO service_role;
ALTER TABLE public.preset_reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  text_value text
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.bot_texts (
  key text PRIMARY KEY,
  msg_key text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  section text NOT NULL DEFAULT 'رسائل أخرى',
  place text,
  sort integer NOT NULL DEFAULT 0,
  original text NOT NULL,
  value text,
  btn_id text,
  btn_desc text,
  desc_value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bot_texts TO service_role;
ALTER TABLE public.bot_texts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.bot_steps (
  id text PRIMARY KEY DEFAULT substr(md5(random()::text), 1, 8),
  trigger_key text,
  trigger_id text,
  trigger_title text,
  section text,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'buttons',
  list_button text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bot_steps TO service_role;
ALTER TABLE public.bot_steps ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.acts_engineers (
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

CREATE TABLE IF NOT EXISTS public.acts_service_requests (
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

CREATE TABLE IF NOT EXISTS public.acts_reviews (
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
DROP TRIGGER IF EXISTS acts_review_guard ON public.acts_reviews;
CREATE TRIGGER acts_review_guard BEFORE INSERT ON public.acts_reviews FOR EACH ROW EXECUTE FUNCTION public.acts_review_guard();

CREATE TABLE IF NOT EXISTS public.acts_review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.acts_reviews(id) ON DELETE CASCADE,
  reason text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.acts_review_reports TO service_role;
ALTER TABLE public.acts_review_reports ENABLE ROW LEVEL SECURITY;