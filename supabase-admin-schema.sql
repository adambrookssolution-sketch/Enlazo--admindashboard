-- =============================================================================
-- Admin Dashboard Schema Extensions
-- Run this in Supabase SQL Editor before using the admin panel
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CATEGORIES: add icon_url (already has is_active from migration)
-- -----------------------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon_url text;

-- -----------------------------------------------------------------------------
-- 2. PROFILES: add block/ban fields
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS blocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 3. SPECIALIST_PROFILES: add rejection_reason + suspended state support
-- -----------------------------------------------------------------------------
ALTER TABLE public.specialist_profiles
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Note: The 'status' column already exists. Valid values will be:
-- 'pending', 'approved', 'rejected', 'suspended'

-- -----------------------------------------------------------------------------
-- 4. STORAGE BUCKET: category-icons (public read)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-icons',
  'category-icons',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, admin-only write
DROP POLICY IF EXISTS "Public read category-icons" ON storage.objects;
CREATE POLICY "Public read category-icons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'category-icons');

DROP POLICY IF EXISTS "Admins can upload category-icons" ON storage.objects;
CREATE POLICY "Admins can upload category-icons"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'category-icons'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update category-icons" ON storage.objects;
CREATE POLICY "Admins can update category-icons"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'category-icons'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete category-icons" ON storage.objects;
CREATE POLICY "Admins can delete category-icons"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'category-icons'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 5. RLS POLICIES: allow admins to update profiles + categories + specialists
-- -----------------------------------------------------------------------------

-- Admins can update any profile (for blocking users)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Admins can insert/update/delete categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Admins can update any specialist_profile (for approve/reject/suspend)
DROP POLICY IF EXISTS "Admins can update any specialist profile" ON public.specialist_profiles;
CREATE POLICY "Admins can update any specialist profile"
  ON public.specialist_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Admins can insert/delete user_roles (to grant/revoke roles)
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- 6. TRIGGER: block blocked users from logging in (optional - enforced client side too)
-- -----------------------------------------------------------------------------
-- Blocked users will see a message in the app when is_blocked = true
-- This is enforced client-side by checking profile.is_blocked

-- =============================================================================
-- DONE
-- =============================================================================
