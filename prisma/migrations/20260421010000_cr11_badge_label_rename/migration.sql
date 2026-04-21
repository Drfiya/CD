-- CR11 Phase-1 badge visual redesign — rename 3 pilot BadgeDefinition rows
-- (FIRST_POST, POPULAR, SCHOLAR) with new labels, Lucide-SVG iconUrls, and
-- (for POPULAR) the reserved prestige-red accent.
--
-- Idempotent via CASE … ELSE "col" END: re-runs re-apply the same values and
-- leave admin-customised rows untouched because only the 3 pilot types match.

UPDATE "BadgeDefinition"
SET "label" = CASE "type"
      WHEN 'FIRST_POST'::"BadgeType" THEN 'Published'
      WHEN 'POPULAR'::"BadgeType"    THEN 'Peer Reviewed'
      WHEN 'SCHOLAR'::"BadgeType"    THEN 'Coursework'
      ELSE "label"
    END,
    "iconUrl" = CASE "type"
      WHEN 'FIRST_POST'::"BadgeType" THEN '/badges/badge-published.svg'
      WHEN 'POPULAR'::"BadgeType"    THEN '/badges/badge-peer-reviewed.svg'
      WHEN 'SCHOLAR'::"BadgeType"    THEN '/badges/badge-coursework.svg'
      ELSE "iconUrl"
    END,
    "colorHex" = CASE "type"
      WHEN 'POPULAR'::"BadgeType"    THEN '#D32F2F'
      ELSE "colorHex"
    END,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "type" IN (
  'FIRST_POST'::"BadgeType",
  'POPULAR'::"BadgeType",
  'SCHOLAR'::"BadgeType"
);
