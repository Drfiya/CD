-- CR14: Bug Reporter — new enums, tables, and indexes
-- Migration timestamp: 20260428000000 (strictly after 20260427000000_dm_attachments)

-- CreateEnum
CREATE TYPE "BugPriority" AS ENUM ('P1', 'P2', 'P3', 'P4');

-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "BugReproducibility" AS ENUM ('ALWAYS', 'SOMETIMES', 'ONCE');

-- CreateTable
CREATE TABLE "BugReport" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "BugPriority" NOT NULL,
    "status" "BugStatus" NOT NULL DEFAULT 'OPEN',
    "reproducibility" "BugReproducibility" NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "pageUrl" VARCHAR(2048) NOT NULL,
    "reporterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BugScreenshot" (
    "id" TEXT NOT NULL,
    "bugReportId" TEXT NOT NULL,
    "path" VARCHAR(512) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "mime" VARCHAR(64) NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BugScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BugReport_reporterId_idx" ON "BugReport"("reporterId");

-- CreateIndex
CREATE INDEX "BugReport_status_idx" ON "BugReport"("status");

-- CreateIndex
CREATE INDEX "BugReport_priority_idx" ON "BugReport"("priority");

-- CreateIndex
CREATE INDEX "BugReport_createdAt_idx" ON "BugReport"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "BugScreenshot_bugReportId_idx" ON "BugScreenshot"("bugReportId");

-- AddForeignKey
ALTER TABLE "BugReport" ADD CONSTRAINT "BugReport_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugScreenshot" ADD CONSTRAINT "BugScreenshot_bugReportId_fkey"
    FOREIGN KEY ("bugReportId") REFERENCES "BugReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
