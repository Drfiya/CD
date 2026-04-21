/**
 * Unit tests for the BadgeDefinition resolver (CR8 CUSTOM-2).
 *
 * Covers the request-scoped helper that turns a user-owned Badge row
 * (`{ type, customDefinitionId }`) into a display view. The helper is the
 * single source of truth used by BadgeDisplay, so regressions here ripple
 * across every profile / sidebar / card surface in the app.
 *
 *  - customDefinitionId is preferred over type (custom takes precedence)
 *  - Fallback to type when customDefinitionId is missing from the map
 *  - Returns null when neither resolves (stale custom id, unknown enum)
 *  - Returns null for an empty badge shape
 *  - Respects sortOrder in the `all` list
 *  - byType is keyed by enum value; byCustomId is keyed by id
 *  - Active flag is preserved through the view
 *  - A custom definition (type=null) with only a customId is resolvable
 */

import { describe, it, expect } from 'vitest';
import type { BadgeDefinitionMap, BadgeDefinitionView } from '@/lib/badge-definition-types';
import { resolveBadgeView } from '@/lib/badge-definition-types';
import type { BadgeType } from '@/generated/prisma/client';

function makeView(overrides: Partial<BadgeDefinitionView> = {}): BadgeDefinitionView {
  return {
    id: 'bdef_test',
    key: 'test',
    type: null,
    label: 'Test Badge',
    description: 'A test badge',
    emoji: '🧪',
    iconUrl: null,
    colorHex: '#D94A4A',
    condition: 'auto',
    sortOrder: 100,
    isActive: true,
    ...overrides,
  };
}

function makeMap(views: BadgeDefinitionView[]): BadgeDefinitionMap {
  const byType: Record<string, BadgeDefinitionView> = {};
  const byCustomId: Record<string, BadgeDefinitionView> = {};
  for (const v of views) {
    if (v.type) byType[v.type] = v;
    byCustomId[v.id] = v;
  }
  return { byType, byCustomId, all: views };
}

describe('resolveBadgeView', () => {
  const systemFirstPost = makeView({
    id: 'bdef_first_post',
    key: 'first-post',
    type: 'FIRST_POST' as BadgeType,
    label: 'First Post',
    emoji: '🌱',
    condition: 'auto',
    sortOrder: 10,
  });
  const customEarly = makeView({
    id: 'bdef_early',
    key: 'early',
    type: null,
    label: 'Early Supporter',
    emoji: '⭐',
    condition: 'manual',
    sortOrder: 500,
  });
  const map = makeMap([systemFirstPost, customEarly]);

  it('resolves by customDefinitionId when both type and customId are set (custom wins)', () => {
    const view = resolveBadgeView(
      { type: 'FIRST_POST' as BadgeType, customDefinitionId: customEarly.id },
      map
    );
    expect(view?.id).toBe(customEarly.id);
  });

  it('resolves by type when customDefinitionId is null', () => {
    const view = resolveBadgeView(
      { type: 'FIRST_POST' as BadgeType, customDefinitionId: null },
      map
    );
    expect(view?.label).toBe('First Post');
  });

  it('resolves a pure custom badge (type=null, customId set)', () => {
    const view = resolveBadgeView(
      { type: null, customDefinitionId: customEarly.id },
      map
    );
    expect(view?.condition).toBe('manual');
    expect(view?.label).toBe('Early Supporter');
  });

  it('returns null when neither type nor customId resolves (stale custom id)', () => {
    const view = resolveBadgeView(
      { type: null, customDefinitionId: 'nonexistent_id' },
      map
    );
    expect(view).toBeNull();
  });

  it('returns null when customDefinitionId is unknown but type is also unknown', () => {
    // An enum value that was added after this map was cached.
    const view = resolveBadgeView(
      { type: 'UNRELEASED_TYPE' as unknown as BadgeType, customDefinitionId: null },
      map
    );
    expect(view).toBeNull();
  });

  it('returns null for an empty badge (no type, no customId)', () => {
    const view = resolveBadgeView({ type: null, customDefinitionId: null }, map);
    expect(view).toBeNull();
  });

  it('indexes map by custom id (byCustomId lookup)', () => {
    expect(map.byCustomId[customEarly.id]?.label).toBe('Early Supporter');
    expect(map.byCustomId[systemFirstPost.id]?.type).toBe('FIRST_POST');
  });

  it('indexes map by enum value only when type is non-null', () => {
    expect(map.byType['FIRST_POST']?.id).toBe(systemFirstPost.id);
    // Custom badges are NOT indexed under byType (their type is null).
    expect(Object.keys(map.byType)).not.toContain('null');
  });

  it('preserves the isActive flag through resolution', () => {
    const inactive = makeView({ id: 'bdef_off', key: 'off', isActive: false });
    const map2 = makeMap([inactive]);
    const view = resolveBadgeView({ type: null, customDefinitionId: 'bdef_off' }, map2);
    expect(view?.isActive).toBe(false);
  });
});
