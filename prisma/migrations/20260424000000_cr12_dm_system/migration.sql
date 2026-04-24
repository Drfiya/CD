-- CR12: Direct Messages (1:1) — Conversation, Message, DmBlock

-- Conversation
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Conversation_userAId_userBId_key" ON "Conversation"("userAId", "userBId");
CREATE INDEX "Conversation_userAId_idx" ON "Conversation"("userAId");
CREATE INDEX "Conversation_userBId_idx" ON "Conversation"("userBId");
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt" DESC);

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userAId_fkey"
    FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userBId_fkey"
    FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "clientMessageId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt" DESC);
CREATE INDEX "Message_conversationId_readAt_idx" ON "Message"("conversationId", "readAt");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey"
    FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DmBlock
CREATE TABLE "DmBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DmBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DmBlock_blockerId_blockedId_key" ON "DmBlock"("blockerId", "blockedId");
CREATE INDEX "DmBlock_blockerId_idx" ON "DmBlock"("blockerId");
CREATE INDEX "DmBlock_blockedId_idx" ON "DmBlock"("blockedId");

ALTER TABLE "DmBlock" ADD CONSTRAINT "DmBlock_blockerId_fkey"
    FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DmBlock" ADD CONSTRAINT "DmBlock_blockedId_fkey"
    FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
