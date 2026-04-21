-- Round 4 / B1: Achievement Badge System

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "BadgeType" AS ENUM ('FIRST_POST', 'CONVERSATIONALIST', 'POPULAR', 'SCHOLAR', 'LEVEL_5', 'TOP_10');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Badge" (
  "id"       TEXT NOT NULL,
  "userId"   TEXT NOT NULL,
  "type"     "BadgeType" NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique constraint prevents duplicate award)
CREATE UNIQUE INDEX IF NOT EXISTS "Badge_userId_type_key" ON "Badge"("userId", "type");
CREATE INDEX IF NOT EXISTS "Badge_userId_idx" ON "Badge"("userId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Badge"
    ADD CONSTRAINT "Badge_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
