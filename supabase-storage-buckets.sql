-- =============================================================================
-- Create Storage Buckets for Enlazo Mobile App
-- These buckets are required for file uploads (photos, documents)
-- =============================================================================

-- 1. service-photos: profile avatars, service request evidence photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-photos',
  'service-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. specialist-docs: INE, CSF, address proof documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'specialist-docs',
  'specialist-docs',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 3. category-icons: already created in admin schema, ensure exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-icons',
  'category-icons',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Storage RLS Policies
-- =============================================================================

-- service-photos: public read, authenticated upload
DROP POLICY IF EXISTS "Public read service-photos" ON storage.objects;
CREATE POLICY "Public read service-photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-photos');

DROP POLICY IF EXISTS "Authenticated users can upload service-photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload service-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'service-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own service-photos" ON storage.objects;
CREATE POLICY "Users can update own service-photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'service-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own service-photos" ON storage.objects;
CREATE POLICY "Users can delete own service-photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'service-photos' AND auth.role() = 'authenticated');

-- specialist-docs: public read, authenticated upload
DROP POLICY IF EXISTS "Public read specialist-docs" ON storage.objects;
CREATE POLICY "Public read specialist-docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'specialist-docs');

DROP POLICY IF EXISTS "Authenticated users can upload specialist-docs" ON storage.objects;
CREATE POLICY "Authenticated users can upload specialist-docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'specialist-docs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own specialist-docs" ON storage.objects;
CREATE POLICY "Users can update own specialist-docs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'specialist-docs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own specialist-docs" ON storage.objects;
CREATE POLICY "Users can delete own specialist-docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'specialist-docs' AND auth.role() = 'authenticated');

-- =============================================================================
-- DONE: 3 buckets created with appropriate RLS policies
-- =============================================================================
