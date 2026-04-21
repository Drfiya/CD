-- CR8 CUSTOM-1: Admin Category Management — add description field
-- Short marketing blurb shown next to the category name in admin + sidebar.
-- 280 char limit enforced at the Zod layer; column itself left as TEXT for forgiving storage.
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "description" TEXT;
