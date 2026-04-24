-- CR12 Round 3 / Item 5 — File attachments on DM messages.
--
-- Motivation: The original DM scope in brief §2.3 listed all media uploads as
-- out-of-scope. The User has now authorised a narrow slice for Round 3:
-- images (JPG/PNG/WebP) and PDFs only. A single attachment per message is
-- expressed additively via four nullable columns on `Message` (Lena-owned
-- model per project_brief §8.2). No `MessageAttachment` join-table — the
-- 1:1 constraint matches the product requirement, and the footprint stays
-- minimal.
--
-- All four columns are nullable. Existing text-only rows (including all rows
-- from `20260424000000_cr12_dm_system` and `20260425000000_dm_client_message_id_unique`)
-- are unaffected: no defaults backfill is needed, no rewrite occurs. Server
-- code (`sendMessage`) continues to treat the attachment as optional.
--
-- Defence-in-depth: the whitelist of allowed MIME types is enforced at three
-- layers (client picker, Zod schema in src/lib/validations/dm.ts, Supabase
-- bucket policy in supabase/storage/dm-attachments.sql). This migration does
-- NOT add a CHECK constraint on `attachmentMime` — keeping the DB permissive
-- so a future scope expansion (e.g. adding `image/gif`) does not require a
-- schema migration, only a policy + Zod update.

ALTER TABLE "Message" ADD COLUMN "attachmentPath" VARCHAR(512);
ALTER TABLE "Message" ADD COLUMN "attachmentMime" VARCHAR(64);
ALTER TABLE "Message" ADD COLUMN "attachmentSize" INTEGER;
ALTER TABLE "Message" ADD COLUMN "attachmentName" VARCHAR(255);
