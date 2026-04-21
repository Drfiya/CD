import db from '@/lib/db';

/**
 * CR11 — Idempotent upsert for the three pilot BadgeDefinitions.
 *
 * The canonical seed path is the SQL migration
 * `20260421010000_cr11_badge_label_rename/migration.sql`, which runs on
 * `prisma migrate deploy`. This TypeScript helper mirrors that SQL so dev-DB
 * recovery, integration-test setup, and one-off re-seeds can re-apply the
 * same values from application code without touching the migrations folder.
 *
 * Run on demand:
 *   `npx tsx -e "import('./src/lib/badge-seed').then(m => m.upsertPilotBadgeDefinitions())"`
 *
 * Contract: re-runs MUST be no-ops against a DB where the migration has
 * already applied the same values. Uses `upsert` keyed on the stable `key`
 * slug; never touches the 5 non-pilot BadgeDefinitions.
 */

type PilotSeed = {
  key: string;
  label: string;
  iconUrl: string;
  colorHex: string;
};

export const CR11_PILOT_BADGES: readonly PilotSeed[] = [
  { key: 'first-post', label: 'Published',     iconUrl: '/badges/badge-published.svg',     colorHex: '#D94A4A' },
  { key: 'popular',    label: 'Peer Reviewed', iconUrl: '/badges/badge-peer-reviewed.svg', colorHex: '#D32F2F' },
  { key: 'scholar',    label: 'Coursework',    iconUrl: '/badges/badge-coursework.svg',    colorHex: '#D94A4A' },
] as const;

export async function upsertPilotBadgeDefinitions(): Promise<number> {
  let touched = 0;
  for (const pilot of CR11_PILOT_BADGES) {
    const existing = await db.badgeDefinition.findUnique({ where: { key: pilot.key } });
    if (!existing) {
      // The CR8 seed migration creates these rows. If they're missing we skip
      // rather than invent them — the migration is the sole source of the
      // `type`, `emoji`, `description`, and `condition` fields.
      continue;
    }
    await db.badgeDefinition.update({
      where: { key: pilot.key },
      data: {
        label: pilot.label,
        iconUrl: pilot.iconUrl,
        colorHex: pilot.colorHex,
      },
    });
    touched += 1;
  }
  return touched;
}
