-- The team page lists every member's name and email. users_self_access lets the
-- app role read only its own users row, so it reads them through this function.
-- It answers only an operator who belongs to the business in their RLS context.
CREATE OR REPLACE FUNCTION app.list_business_members(p_business_id uuid)
RETURNS TABLE (membership_id uuid, user_id uuid, name text, email text, role varchar, status varchar, joined_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT membership.id, person.id, person.name, person.email, membership.role, membership.status, membership.created_at
  FROM public.business_memberships membership
  JOIN public.users person ON person.id = membership.user_id
  WHERE membership.business_id = p_business_id
    -- Removed members keep their row for history but are no longer on the team.
    AND membership.status = 'active'
    -- Inside SECURITY DEFINER current_user is the owner, so app.current_actor_type()
    -- would read 'none'; only lobbystack_app can execute this, so read the setting.
    AND current_setting('app.actor_type', true) = 'operator'
    AND app.current_business_id() = p_business_id
    AND app.has_business_membership(p_business_id)
  ORDER BY membership.created_at, membership.id
$$;

REVOKE ALL ON FUNCTION app.list_business_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.list_business_members(uuid) TO lobbystack_app;
