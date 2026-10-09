CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS employees_business_phone_unique ON public.employees(business_id, phone);
CREATE INDEX IF NOT EXISTS employees_business_created_idx ON public.employees(business_id, created_at);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS employees_tenant_isolation ON public.employees;
CREATE POLICY employees_tenant_isolation ON public.employees
  USING (
    business_id = app.current_business_id()
    AND (app.current_actor_type() IN ('system', 'worker') OR app.has_business_membership(business_id))
  )
  WITH CHECK (
    business_id = app.current_business_id()
    AND (app.current_actor_type() IN ('system', 'worker') OR app.has_business_membership(business_id))
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO lobbystack_app, lobbystack_worker;
GRANT SELECT ON public.employees TO lobbystack_readonly;
