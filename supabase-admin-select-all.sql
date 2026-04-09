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

-- client_reviews
DROP POLICY IF EXISTS "Admins can select any client review" ON public.client_reviews;
CREATE POLICY "Admins can select any client review"
  ON public.client_reviews FOR SELECT
  USING (public.is_admin(auth.uid()));

-- specialist_problem_reports
DROP POLICY IF EXISTS "Admins can select any problem report" ON public.specialist_problem_reports;
CREATE POLICY "Admins can select any problem report"
  ON public.specialist_problem_reports FOR SELECT
  USING (public.is_admin(auth.uid()));

-- request_cancellation_feedback
DROP POLICY IF EXISTS "Admins can select any cancellation feedback" ON public.request_cancellation_feedback;
CREATE POLICY "Admins can select any cancellation feedback"
  ON public.request_cancellation_feedback FOR SELECT
  USING (public.is_admin(auth.uid()));

-- specialist_request_rejections
DROP POLICY IF EXISTS "Admins can select any specialist rejection" ON public.specialist_request_rejections;
CREATE POLICY "Admins can select any specialist rejection"
  ON public.specialist_request_rejections FOR SELECT
  USING (public.is_admin(auth.uid()));

-- specialist_categories
DROP POLICY IF EXISTS "Admins can select any specialist category" ON public.specialist_categories;
CREATE POLICY "Admins can select any specialist category"
  ON public.specialist_categories FOR SELECT
  USING (public.is_admin(auth.uid()));

-- locations (for service request locations)
DROP POLICY IF EXISTS "Admins can select any location" ON public.locations;
CREATE POLICY "Admins can select any location"
  ON public.locations FOR SELECT
  USING (public.is_admin(auth.uid()));

-- =============================================================================
-- DONE
-- =============================================================================
