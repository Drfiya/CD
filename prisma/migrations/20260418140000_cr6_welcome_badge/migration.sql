-- CR6 B1: Activation wizard + WELCOME badge

-- Add activation checklist dismissal timestamp to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activationChecklistDismissedAt" TIMESTAMP(3);

-- Add WELCOME to BadgeType enum (safe re-apply via duplicate_object catch)
DO $$ BEGIN
  ALTER TYPE "BadgeType" ADD VALUE IF NOT EXISTS 'WELCOME';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
