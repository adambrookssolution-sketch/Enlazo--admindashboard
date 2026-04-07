-- =============================================================================
-- FIX: RLS infinite recursion on admin policies
-- Creates a dedicated is_admin() SECURITY DEFINER helper that bypasses RLS
-- on user_roles, avoiding the recursion caused by policies that query
-- user_roles from within user_roles/profiles policies.
-- =============================================================================

-- Helper function: returns true if the given user has the admin role.
-- SECURITY DEFINER means it runs as the function owner (postgres) and
-- bypasses RLS on user_roles, so it never recurses.
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

-- profiles: admins can update any
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- profiles: admins can select any (needed to list users regardless of owner)
DROP POLICY IF EXISTS "Admins can select any profile" ON public.profiles;
CREATE POLICY "Admins can select any profile"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- categories: admins can manage
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- specialist_profiles: admins can update any
DROP POLICY IF EXISTS "Admins can update any specialist profile" ON public.specialist_profiles;
CREATE POLICY "Admins can update any specialist profile"
  ON public.specialist_profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- specialist_profiles: admins can select any
DROP POLICY IF EXISTS "Admins can select any specialist profile" ON public.specialist_profiles;
CREATE POLICY "Admins can select any specialist profile"
  ON public.specialist_profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- user_roles: admins can manage (no recursion, uses is_admin helper)
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- user_roles: users can read their own roles (required for app auth)
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- storage.objects policies for category-icons: use is_admin
DROP POLICY IF EXISTS "Admins can upload category-icons" ON storage.objects;
CREATE POLICY "Admins can upload category-icons"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'category-icons' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update category-icons" ON storage.objects;
CREATE POLICY "Admins can update category-icons"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'category-icons' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete category-icons" ON storage.objects;
CREATE POLICY "Admins can delete category-icons"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'category-icons' AND public.is_admin(auth.uid()));

-- =============================================================================
-- DONE
-- =============================================================================
