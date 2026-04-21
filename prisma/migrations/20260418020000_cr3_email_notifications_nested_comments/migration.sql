-- CR3: Add emailNotifications flag to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotifications" BOOLEAN NOT NULL DEFAULT true;

-- CR3: Add parentId self-relation to Comment (nested comments, max depth 2)
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

ALTER TABLE "Comment"
  ADD CONSTRAINT "Comment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for reply lookups
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "Comment"("parentId");
