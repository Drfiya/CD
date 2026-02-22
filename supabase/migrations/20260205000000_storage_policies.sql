-- Storage RLS policies for course-images bucket
-- Run this in Supabase SQL Editor or via `supabase db push`

-- Allow public read access to course-images bucket
DROP POLICY IF EXISTS "Public read access for course-images" ON storage.objects;
CREATE POLICY "Public read access for course-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-images');

-- Allow authenticated users to upload to course-images
DROP POLICY IF EXISTS "Authenticated users can upload course images" ON storage.objects;
CREATE POLICY "Authenticated users can upload course images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update course images
DROP POLICY IF EXISTS "Authenticated users can update course images" ON storage.objects;
CREATE POLICY "Authenticated users can update course images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'course-images' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete course images
DROP POLICY IF EXISTS "Authenticated users can delete course images" ON storage.objects;
CREATE POLICY "Authenticated users can delete course images"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-images' AND auth.role() = 'authenticated');

-- ============================================================
-- Storage RLS policies for avatars bucket
-- ============================================================

-- Allow public read access to avatars bucket
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow authenticated users to update avatars
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete avatars
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
