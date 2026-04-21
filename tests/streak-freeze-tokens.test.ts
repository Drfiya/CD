/**
 * Unit tests for the Streak Freeze (B1) logic in `streak-actions-internal.ts`.
 *
 * Mocks `@/lib/db` so we can pin every state-transition the routine handles:
 *  - first activity of a brand-new user
 *  - same-UTC-day re-entry
 *  - consecutive-day continuation
 *  - 2-day gap WITH a freeze token (consume + preserve streak)
 *  - 2-day gap WITHOUT a freeze token (reset to 1)
 *  - 7-day boundary auto-awards a token
 *  - cap at 3 freeze tokens
 *  - milestone fires only on the call that crosses it
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

type UserState = {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  freezeTokens: number;
};

const userState: { current: UserState | null } = { current: null };
const updateCalls: { data: Partial<UserState> }[] = [];

vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(async () => userState.current),
      update: vi.fn(async ({ data }: { data: Partial<UserState> }) => {
        updateCalls.push({ data });
        if (userState.current) {
          userState.current = { ...userState.current, ...data };
        }
        return userState.current;
      }),
    },
  },
}));

import { touchStreak } from '@/lib/streak-actions-internal';

const dayMs = 86_400_000;

beforeEach(() => {
  userState.current = null;
  updateCalls.length = 0;
  vi.useRealTimers();
});

describe('touchStreak — first activity', () => {
  it('initializes a brand-new user to streak 1, no milestone, no save', async () => {
    userState.current = {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      freezeTokens: 0,
    };
    const result = await touchStreak('u1');
    expect(result.currentStreak).toBe(1);
    expect(result.milestone).toBeNull();
    expect(result.streakSaved).toBeNull();
    expect(updateCalls.at(-1)?.data.currentStreak).toBe(1);
    expect(updateCalls.at(-1)?.data.freezeTokens).toBe(0);
  });
});

describe('touchStreak — freeze tokens', () => {
  it('awards 1 token when the streak crosses 7 (and 2 are not silently awarded)', async () => {
    const yesterday = new Date(Date.now() - dayMs);
    userState.current = {
      currentStreak: 6,
      longestStreak: 6,
      lastActivityDate: yesterday,
      freezeTokens: 0,
    };
    const result = await touchStreak('u1');
    expect(result.currentStreak).toBe(7);
    expect(result.milestone).toBe(7);
    expect(updateCalls.at(-1)?.data.freezeTokens).toBe(1);
  });

  it('caps tokens at 3 even when crossing further 7-day boundaries', async () => {
    const yesterday = new Date(Date.now() - dayMs);
    userState.current = {
      currentStreak: 27,
      longestStreak: 27,
      lastActivityDate: yesterday,
      freezeTokens: 3,
    };
    await touchStreak('u1'); // crosses 28 — would award a 4th
    expect(updateCalls.at(-1)?.data.freezeTokens).toBe(3);
    expect(updateCalls.at(-1)?.data.currentStreak).toBe(28);
  });

  it('consumes a freeze token on a 2-day gap and preserves the streak', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * dayMs);
    userState.current = {
      currentStreak: 10,
      longestStreak: 10,
      lastActivityDate: twoDaysAgo,
      freezeTokens: 1,
    };
    const result = await touchStreak('u1');
    expect(result.currentStreak).toBe(11);
    expect(result.streakSaved).toBe(10);
    expect(result.milestone).toBeNull();
    expect(updateCalls.at(-1)?.data.freezeTokens).toBe(0);
  });

  it('resets the streak to 1 on a 2-day gap when no freeze token is available', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * dayMs);
    userState.current = {
      currentStreak: 10,
      longestStreak: 10,
      lastActivityDate: twoDaysAgo,
      freezeTokens: 0,
    };
    const result = await touchStreak('u1');
    expect(result.currentStreak).toBe(1);
    expect(result.streakSaved).toBeNull();
  });

  it('treats same-UTC-day re-entry as a no-op (no token consumed, no update)', async () => {
    const today = new Date();
    userState.current = {
      currentStreak: 5,
      longestStreak: 5,
      lastActivityDate: today,
      freezeTokens: 2,
    };
    const result = await touchStreak('u1');
    expect(result.currentStreak).toBe(5);
    expect(result.streakSaved).toBeNull();
    expect(result.milestone).toBeNull();
    // No db.user.update should have fired
    expect(updateCalls.length).toBe(0);
  });
});
