ALTER TABLE public.orders RENAME TO orders_legacy;
ALTER TABLE public.orders_legacy RENAME CONSTRAINT orders_pkey TO orders_legacy_pkey;

CREATE TABLE public.orders (
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
CREATE INDEX orders_customer_id_idx ON public.orders(customer_id);