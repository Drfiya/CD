-- CR9 F1: Landing page social-proof toggles.
--
-- Three booleans on the CommunitySettings singleton, all default false,
-- so a fresh community doesn't display empty sections.
-- Idempotent (ADD COLUMN IF NOT EXISTS).

ALTER TABLE "CommunitySettings" ADD COLUMN IF NOT EXISTS "landingShowAvatarMosaic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommunitySettings" ADD COLUMN IF NOT EXISTS "landingShowMemberCount"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CommunitySettings" ADD COLUMN IF NOT EXISTS "landingShowRecentPosts"  BOOLEAN NOT NULL DEFAULT false;
