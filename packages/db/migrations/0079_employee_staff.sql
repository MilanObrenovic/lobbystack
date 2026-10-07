-- Booking assigns appointments to staff, so each employee is backed by a staff member.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employees_staff_unique ON public.employees(staff_id) WHERE staff_id IS NOT NULL;

DO $$
DECLARE
  employee record;
  member_id uuid;
BEGIN
  FOR employee IN
    SELECT e.id, e.business_id, e.name, b.timezone
    FROM public.employees AS e
    JOIN public.businesses AS b ON b.id = e.business_id
    WHERE e.staff_id IS NULL
  LOOP
    INSERT INTO public.staff (business_id, name, timezone) VALUES (employee.business_id, employee.name, employee.timezone) RETURNING id INTO member_id;
    UPDATE public.employees SET staff_id = member_id WHERE id = employee.id;
  END LOOP;
END $$;
