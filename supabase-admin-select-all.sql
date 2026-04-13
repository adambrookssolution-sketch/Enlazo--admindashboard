-- =============================================================================
-- Admin SELECT policies for all tables
-- Allows admin users to view all data across the platform
-- =============================================================================

-- service_requests
DROP POLICY IF EXISTS "Admins can select any service request" ON public.service_requests;
CREATE POLICY "Admins can select any service request"
  ON public.service_requests FOR SELECT
  USING (public.is_admin(auth.uid()));

-- quotes
DROP POLICY IF EXISTS "Admins can select any quote" ON public.quotes;
CREATE POLICY "Admins can select any quote"
  ON public.quotes FOR SELECT
  USING (public.is_admin(auth.uid()));

-- messages
DROP POLICY IF EXISTS "Admins can select any message" ON public.messages;
CREATE POLICY "Admins can select any message"
  ON public.messages FOR SELECT
  USING (public.is_admin(auth.uid()));

-- reviews
DROP POLICY IF EXISTS "Admins can select any review" ON public.reviews;
CREATE POLICY "Admins can select any review"
  ON public.reviews FOR SELECT
  USING (public.is_admin(auth.uid()));

-- specialist_categories
DROP POLICY IF EXISTS "Admins can select any specialist category" ON public.specialist_categories;
CREATE POLICY "Admins can select any specialist category"
  ON public.specialist_categories FOR SELECT
  USING (public.is_admin(auth.uid()));

-- =============================================================================
-- DONE
-- =============================================================================
