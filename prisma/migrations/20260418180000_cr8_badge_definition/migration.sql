-- CR8 CUSTOM-2: BadgeDefinition table
-- Presentation + grant-condition metadata for badges. Admins can edit icons,
-- colors, labels, descriptions, and create custom manual-grant badges without
-- touching the BadgeType enum (auto-award logic stays compile-time safe).

CREATE TABLE IF NOT EXISTS "BadgeDefinition" (
    "id" TEXT NOT NULL,
    "type" "BadgeType",
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "iconUrl" TEXT,
    "condition" TEXT NOT NULL DEFAULT 'auto',
    "colorHex" TEXT NOT NULL DEFAULT '#D94A4A',
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeDefinition_pkey" PRIMARY KEY ("id")
);

-- The `key` is the admin-chosen slug; must be unique globally.
CREATE UNIQUE INDEX IF NOT EXISTS "BadgeDefinition_key_key" ON "BadgeDefinition"("key");

-- Partial unique on `type` so multiple rows can have NULL (custom badges)
-- but any given BadgeType enum value appears at most once.
CREATE UNIQUE INDEX IF NOT EXISTS "BadgeDefinition_type_unique"
    ON "BadgeDefinition"("type")
    WHERE "type" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "BadgeDefinition_type_idx" ON "BadgeDefinition"("type");
CREATE INDEX IF NOT EXISTS "BadgeDefinition_condition_idx" ON "BadgeDefinition"("condition");
CREATE INDEX IF NOT EXISTS "BadgeDefinition_sortOrder_idx" ON "BadgeDefinition"("sortOrder");

-- Seed the 8 system badges so admins can edit them immediately.
-- Safe to re-run: ON CONFLICT DO NOTHING.
INSERT INTO "BadgeDefinition" ("id", "type", "key", "label", "description", "emoji", "condition", "sortOrder", "colorHex", "updatedAt") VALUES
    ('bdef_first_post',        'FIRST_POST',        'first-post',        'First Post',        'Published your first post',                                      '🌱', 'auto',  10, '#D94A4A', CURRENT_TIMESTAMP),
    ('bdef_conversationalist', 'CONVERSATIONALIST', 'conversationalist', 'Conversationalist', 'Wrote 10 comments',                                             '💬', 'auto',  20, '#D94A4A', CURRENT_TIMESTAMP),
    ('bdef_popular',           'POPULAR',           'popular',           'Popular',            'Received 25 likes',                                              '❤️', 'auto',  30, '#D94A4A', CURRENT_TIMESTAMP),
    ('bdef_scholar',           'SCHOLAR',           'scholar',           'Scholar',            'Completed 5 lessons',                                            '🎓', 'auto',  40, '#D94A4A', CURRENT_TIMESTAMP),
    ('bdef_level_5',           'LEVEL_5',           'level-5',           'Level 5',            'Reached level 5',                                                '⚡', 'auto',  50, '#D94A4A', CURRENT_TIMESTAMP),
    ('bdef_top_10',            'TOP_10',            'top-10',            'Top 10',             'Ranked in the all-time top 10',                                   '🏆', 'auto',  60, '#D94A4A', CURRENT_TIMESTAMP),
    ('bdef_streak_7',          'STREAK_7',          'streak-7',          '7-Day Streak',        'Active 7 days in a row',                                         '🔥', 'auto',  70, '#D94A4A', CURRENT_TIMESTAMP),
    ('bdef_welcome',           'WELCOME',           'welcome',           'Welcome',             'Completed profile, enrolled, and posted — activation funnel complete', '🎉', 'auto',  80, '#D94A4A', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
