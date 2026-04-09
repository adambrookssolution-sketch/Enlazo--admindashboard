-- =============================================================================
-- RPC function to ban/unban users at the Auth level
-- Uses SECURITY DEFINER to access auth.users (not accessible via RLS)
-- Only callable by admins (checked inside the function)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_ban_user(
  target_user_id uuid,
  should_ban boolean,
  ban_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  -- Check caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role::text = 'admin'
  ) INTO caller_is_admin;

  IF NOT caller_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Update auth.users banned_until
  IF should_ban THEN
    UPDATE auth.users
    SET banned_until = '2099-12-31T23:59:59Z'::timestamptz
    WHERE id = target_user_id;
  ELSE
    UPDATE auth.users
    SET banned_until = NULL
    WHERE id = target_user_id;
  END IF;

  -- Also update profiles.is_blocked for UI consistency
  UPDATE public.profiles
  SET
    is_blocked = should_ban,
    blocked_reason = CASE WHEN should_ban THEN ban_reason ELSE NULL END,
    blocked_at = CASE WHEN should_ban THEN now() ELSE NULL END,
    blocked_by = CASE WHEN should_ban THEN auth.uid() ELSE NULL END
  WHERE id = target_user_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ban_user(uuid, boolean, text) TO authenticated;
