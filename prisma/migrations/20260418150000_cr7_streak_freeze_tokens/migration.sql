-- Add freeze-token column to User for B1 (Streak Freeze)
-- Auto-awarded at streak 7/14/21/28 (capped at 3), auto-consumed on a 2-day gap.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "freezeTokens" INTEGER NOT NULL DEFAULT 0;
