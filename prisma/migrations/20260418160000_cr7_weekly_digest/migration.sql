-- Track when each user last received the weekly digest so we can skip them
-- next time the cron fires within the same week (idempotency window).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastEmailDigestAt" TIMESTAMP(3);
