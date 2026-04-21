import type { BadgeType } from '@/generated/prisma/client';

/**
 * Pure types and resolver for BadgeDefinition lookups.
 *
 * Kept separate from `badge-definitions-internal.ts` so unit tests can import
 * the resolver without dragging the Prisma client into the test environment.
 */

export type BadgeDefinitionView = {
  id: string;
  key: string;
  type: BadgeType | null;
  label: string;
  description: string;
  emoji: string;
  iconUrl: string | null;
  colorHex: string;
  condition: string;
  sortOrder: number;
  isActive: boolean;
};

export type BadgeDefinitionMap = {
  byType: Record<string, BadgeDefinitionView>;
  byCustomId: Record<string, BadgeDefinitionView>;
  all: BadgeDefinitionView[];
};

/**
 * Resolve a single user-owned badge row to its display view. Returns null
 * when neither `type` nor `customDefinitionId` maps to a known definition —
 * e.g. when a custom definition was deleted mid-flight.
 *
 * `customDefinitionId` always takes precedence over `type`: a badge row
 * with both set represents a custom grant that happened to land on a user
 * who also had the system badge; the caller asked for the custom display.
 */
export function resolveBadgeView(
  badge: { type: BadgeType | null; customDefinitionId?: string | null },
  map: BadgeDefinitionMap
): BadgeDefinitionView | null {
  if (badge.customDefinitionId && map.byCustomId[badge.customDefinitionId]) {
    return map.byCustomId[badge.customDefinitionId];
  }
  if (badge.type && map.byType[badge.type]) {
    return map.byType[badge.type];
  }
  return null;
}
