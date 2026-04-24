-- CR12 Round 2 / B1 — Partial unique index on Message (clientMessageId, senderId).
--
-- Motivation (Dealbreaker §5.7): `clientMessageId` is the client-generated
-- UUID the optimistic-update UI uses to reconcile its pending bubble with the
-- persisted row. Without a DB-level uniqueness guarantee a network or bug
-- retry could persist two rows with the same `clientMessageId` — "ghost
-- dupes", the #1 trust-killer in a messenger. Prisma 7's declarative
-- `@@unique` does not support `WHERE` clauses, so the enforcement lives here
-- in raw SQL. A placeholder `@@index([clientMessageId, senderId])` in
-- `schema.prisma` keeps the column pair discoverable from the model; this
-- migration drops that non-unique index and replaces it with a partial
-- UNIQUE index on the same columns. Messages inserted without a
-- `clientMessageId` (server-side seeds, legacy rows) remain exempt via
-- `WHERE "clientMessageId" IS NOT NULL`.

-- Drop the non-unique `@@index` declaration created by Prisma in
-- `20260424000000_cr12_dm_system` was NOT this shape, so this DROP only
-- applies if a previous `prisma migrate dev` already emitted the placeholder
-- index from schema.prisma. IF EXISTS keeps it idempotent in both paths.
DROP INDEX IF EXISTS "Message_clientMessageId_senderId_idx";

-- Partial UNIQUE index: enforces uniqueness of (clientMessageId, senderId)
-- *only* for rows where clientMessageId is present. This is the authoritative
-- guard against duplicate-persistence on optimistic-update retry.
CREATE UNIQUE INDEX "Message_clientMessageId_senderId_unique"
  ON "Message" ("clientMessageId", "senderId")
  WHERE "clientMessageId" IS NOT NULL;
