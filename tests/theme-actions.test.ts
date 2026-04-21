/**
 * CR9 F2: Tests for `updateThemePreference` in `src/lib/theme-actions.ts`.
 *
 * The action is session-scoped (writes only to `session.user.id`), so the
 * tests focus on:
 *  - unauth rejection (requireAuth throws → action returns an error object)
 *  - valid input passes Zod and writes the DB
 *  - invalid input is rejected before any DB write
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const authState: { shouldThrow: boolean; userId: string } = { shouldThrow: false, userId: 'user-abc' };
const dbUpdateCalls: Array<{ where: { id: string }; data: { themePreference: string } }> = [];

vi.mock('@/lib/auth-guards', () => ({
  requireAuth: vi.fn(async () => {
    if (authState.shouldThrow) throw new Error('Unauthorized');
    return { user: { id: authState.userId } };
  }),
}));

vi.mock('@/lib/db', () => ({
  default: {
    user: {
      update: vi.fn(async (args: { where: { id: string }; data: { themePreference: string } }) => {
        dbUpdateCalls.push(args);
        return { id: args.where.id, themePreference: args.data.themePreference };
      }),
    },
  },
}));

const { updateThemePreference } = await import('@/lib/theme-actions');

describe('updateThemePreference', () => {
  beforeEach(() => {
    authState.shouldThrow = false;
    authState.userId = 'user-abc';
    dbUpdateCalls.length = 0;
  });

  it('rejects unauthenticated callers without touching the DB', async () => {
    authState.shouldThrow = true;
    const result = await updateThemePreference('dark');
    expect(result.error).toBe('Not authenticated');
    expect(dbUpdateCalls).toHaveLength(0);
  });

  it('persists the preference to the DB and returns success for a valid input', async () => {
    const result = await updateThemePreference('light');
    expect(result.success).toBe(true);
    expect(dbUpdateCalls).toHaveLength(1);
    expect(dbUpdateCalls[0]).toEqual({
      where: { id: 'user-abc' },
      data: { themePreference: 'light' },
    });
  });

  it('accepts "dark" as valid input', async () => {
    const result = await updateThemePreference('dark');
    expect(result.success).toBe(true);
    expect(dbUpdateCalls[0].data.themePreference).toBe('dark');
  });

  it('rejects invalid input without touching the DB', async () => {
    // Zod schema only accepts 'dark' | 'light' — cast through unknown to test the guard.
    const result = await updateThemePreference('system' as unknown as 'dark' | 'light');
    expect(result.error).toBe('Invalid theme');
    expect(dbUpdateCalls).toHaveLength(0);
  });
});
