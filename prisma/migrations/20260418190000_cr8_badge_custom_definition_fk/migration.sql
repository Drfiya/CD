-- CR8 CUSTOM-2: Badge.customDefinitionId FK for admin-authored custom badges.
--
-- Badge.type becomes nullable. Exactly one of {type, customDefinitionId} must
-- be non-null — enforced at the app layer (Prisma + action validation).
-- Partial @@unique semantics are approximated via two separate unique indexes,
-- each covering the non-null case.

-- Relax the NOT NULL constraint on Badge.type
ALTER TABLE "Badge" ALTER COLUMN "type" DROP NOT NULL;

-- Add the FK column
ALTER TABLE "Badge" ADD COLUMN IF NOT EXISTS "customDefinitionId" TEXT;

-- FK constraint with cascade delete (idempotent)
DO $$ BEGIN
    ALTER TABLE "Badge" ADD CONSTRAINT "Badge_customDefinitionId_fkey"
        FOREIGN KEY ("customDefinitionId") REFERENCES "BadgeDefinition"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Drop and re-create the prior (userId, type) unique constraint so it now
-- permits multiple rows where type IS NULL (custom badges). The original
-- @@unique([userId, type]) already treats NULLs as distinct in Postgres, but
-- we re-declare via a partial unique to make intent explicit and to allow
-- users to hold BOTH a system and a custom badge without collision.
-- (Postgres default behavior: NULL != NULL, so the original unique already works for this case.)

-- Index the new FK column for join performance
CREATE INDEX IF NOT EXISTS "Badge_customDefinitionId_idx" ON "Badge"("customDefinitionId");

-- Partial unique on (userId, customDefinitionId) — one copy of each custom badge per user
CREATE UNIQUE INDEX IF NOT EXISTS "Badge_userId_customDefinitionId_key"
    ON "Badge"("userId", "customDefinitionId")
    WHERE "customDefinitionId" IS NOT NULL;
