-- CR9 F2: User.themePreference — cross-device dark/light persistence.
-- Nullable VARCHAR so a future "system" option can NULL without another migration.
-- Default "dark" per brand decision (see CR9 F2 brief).
-- Idempotent (ADD COLUMN IF NOT EXISTS).

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "themePreference" VARCHAR(10) DEFAULT 'dark';
