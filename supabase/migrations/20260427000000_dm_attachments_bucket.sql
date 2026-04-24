-- CR12 Round 3 / Item 5 — `dm-attachments` Supabase Storage bucket.
--
-- Run this in Supabase SQL Editor or via `supabase db push`.
--
-- Purpose: private bucket for DM file attachments (images + PDFs only).
-- All reads go through short-lived signed URLs issued by
-- `src/lib/dm-attachment-actions.ts`; no direct client access — neither anon
-- nor authenticated roles can SELECT / INSERT / UPDATE / DELETE directly.
-- The service-role key (used only from server actions) is the single
-- authorised writer.
--
-- Defence-in-depth: MIME whitelist + size cap are enforced at three layers —
--   (1) client picker `accept="…"`
--   (2) Zod schema `attachmentMetadataSchema`
--   (3) this bucket policy
-- plus a magic-byte re-verification inside `finaliseAttachment`.

-- ---------------------------------------------------------------------------
-- Bucket
-- ---------------------------------------------------------------------------
--
-- We insert the bucket row idempotently so this migration is re-runnable on
-- fresh projects without conflicting with an earlier manual setup. The key
-- fields are `public = false` (forces signed-URL access) and the server-side
-- enforcement of MIME + size.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'dm-attachments',
    'dm-attachments',
    false,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- ---------------------------------------------------------------------------
-- RLS: deny direct client access.
-- ---------------------------------------------------------------------------
--
-- The four SELECT / INSERT / UPDATE / DELETE policies below explicitly deny
-- anon + authenticated roles. The service-role key bypasses RLS, so server
-- actions can still read/write. Any attempt by a logged-in user to reach the
-- bucket directly (e.g. via the JS SDK from the browser) is refused.

DROP POLICY IF EXISTS "dm-attachments: deny client select" ON storage.objects;
CREATE POLICY "dm-attachments: deny client select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id <> 'dm-attachments');

DROP POLICY IF EXISTS "dm-attachments: deny client insert" ON storage.objects;
CREATE POLICY "dm-attachments: deny client insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id <> 'dm-attachments');

DROP POLICY IF EXISTS "dm-attachments: deny client update" ON storage.objects;
CREATE POLICY "dm-attachments: deny client update"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id <> 'dm-attachments');

DROP POLICY IF EXISTS "dm-attachments: deny client delete" ON storage.objects;
CREATE POLICY "dm-attachments: deny client delete"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id <> 'dm-attachments');

-- ---------------------------------------------------------------------------
-- Notes on signed-upload URLs
-- ---------------------------------------------------------------------------
-- Clients upload via a *signed upload token* (Supabase Storage feature),
-- generated server-side by `requestAttachmentUploadUrl`. That token carries
-- its own authorisation — it is the reason RLS can safely be "deny all" for
-- client roles. If the signed-upload feature is disabled in a given
-- environment, the fallback is server-side direct upload through the service
-- role client (also covered by `requestAttachmentUploadUrl`).
