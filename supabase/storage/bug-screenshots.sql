-- CR14: Bug Reporter — Supabase Storage bucket for bug report screenshots.
--
-- Security model (mirrors dm-attachments pattern):
--   - Bucket is PRIVATE (public: false)
--   - RLS policies deny all anon and authenticated reads/writes
--   - Only the Service Role can read/write (via server actions using createAdminClient)
--   - All UI access goes through Server Actions that issue short-lived (1 h) signed URLs
--
-- Constraints enforced by the bucket itself (defence-in-depth):
--   - file_size_limit: 5 MB (5242880 bytes)
--   - allowed_mime_types: JPEG, PNG, WebP, GIF only
--
-- Run this in the Supabase SQL editor or apply via CLI:
--   supabase db push / supabase storage apply

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bug-screenshots',
  'bug-screenshots',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Deny all direct access — only service-role (via Server Actions) may read/write.
CREATE POLICY "deny_anon_read_bug_screenshots"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'bug-screenshots' AND false);

CREATE POLICY "deny_authenticated_read_bug_screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'bug-screenshots' AND false);

CREATE POLICY "deny_anon_insert_bug_screenshots"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'bug-screenshots' AND false);

CREATE POLICY "deny_authenticated_insert_bug_screenshots"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bug-screenshots' AND false);
