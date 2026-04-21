-- Add streak columns to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "longestStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActivityDate" TIMESTAMP(3);

-- Add STREAK_7 to BadgeType enum (safe re-apply via duplicate_object catch)
DO $$ BEGIN
  ALTER TYPE "BadgeType" ADD VALUE IF NOT EXISTS 'STREAK_7';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
