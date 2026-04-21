-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('COMMENT', 'LIKE', 'MENTION');

-- CreateTable
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "recipientId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "postId" TEXT,
  "commentId" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_recipientId_isRead_createdAt_idx" ON "Notification"("recipientId", "isRead", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
