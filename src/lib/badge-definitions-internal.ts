import { cache } from 'react';
import db from '@/lib/db';
import type {
  BadgeDefinitionMap,
  BadgeDefinitionView,
} from '@/lib/badge-definition-types';

/**
 * Internal badge-definition loader.
 *
 * No `'use server'` — this file is Node-only. Consumers are server components
 * and other server-side modules that need to render badge metadata.
 *
 * React.cache() is request-scoped — the first caller within a request hits
 * the DB; every subsequent caller in the same request reuses the Promise.
 * That is the single source of truth for emoji / label / icon / color while
 * still allowing admins to edit definitions at runtime.
 */

export type { BadgeDefinitionMap, BadgeDefinitionView };
export { resolveBadgeView } from '@/lib/badge-definition-types';

/**
 * Load all badge definitions and index them for O(1) lookup by `type` or by
 * `customDefinitionId`. Cached for the duration of the current request.
 */
export const getBadgeDefinitions = cache(async (): Promise<BadgeDefinitionMap> => {
  const rows = await db.badgeDefinition.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  const byType: Record<string, BadgeDefinitionView> = {};
  const byCustomId: Record<string, BadgeDefinitionView> = {};
  const all: BadgeDefinitionView[] = [];

  for (const row of rows) {
    const view: BadgeDefinitionView = {
      id: row.id,
      key: row.key,
      type: row.type,
      label: row.label,
      description: row.description,
      emoji: row.emoji,
      iconUrl: row.iconUrl,
      colorHex: row.colorHex,
      condition: row.condition,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    };
    all.push(view);
    if (row.type) {
      byType[row.type] = view;
    }
    byCustomId[row.id] = view;
  }

  return { byType, byCustomId, all };
});
