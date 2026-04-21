/**
 * Unit tests for the weekly digest (B2).
 *
 * Covers:
 *  - Skip when emailNotifications=false (opted-out)
 *  - Skip when last digest was sent within the 6-day idempotency window
 *  - Send when never sent before (lastEmailDigestAt is null)
 *  - lastEmailDigestAt is bumped after a successful send
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  emailNotifications: boolean;
  lastEmailDigestAt: Date | null;
  currentStreak: number;
  freezeTokens: number;
  _count: { badges: number };
};

const state: {
  user: UserRow | null;
  posts: { id: string; title: string | null; _count: { likes: number; comments: number } }[];
  updateCalls: { where: { id: string }; data: { lastEmailDigestAt: Date } }[];
} = { user: null, posts: [], updateCalls: [] };

vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findUnique: vi.fn(async () => state.user),
      update: vi.fn(async (args: { where: { id: string }; data: { lastEmailDigestAt: Date } }) => {
        state.updateCalls.push(args);
        if (state.user) {
          state.user = { ...state.user, lastEmailDigestAt: args.data.lastEmailDigestAt };
        }
        return state.user;
      }),
    },
    post: {
      findMany: vi.fn(async () => state.posts),
    },
  },
}));

vi.mock('@/lib/api-tracking', () => ({
  trackResendEmail: vi.fn(),
}));

import { sendWeeklyDigestToUser, buildWeeklyDigest } from '@/lib/digest-actions-internal';

const dayMs = 86_400_000;

beforeEach(() => {
  state.user = null;
  state.posts = [];
  state.updateCalls.length = 0;
  // Force the dev-mode branch (no real Resend call) regardless of env
  delete process.env.RESEND_API_KEY;
});

describe('sendWeeklyDigestToUser', () => {
  it('skips users who have opted out of email notifications', async () => {
    state.user = {
      id: 'u1',
      email: 'a@example.com',
      name: 'Alice',
      emailNotifications: false,
      lastEmailDigestAt: null,
      currentStreak: 3,
      freezeTokens: 0,
      _count: { badges: 0 },
    };
    const result = await sendWeeklyDigestToUser('u1');
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('opted-out');
    expect(state.updateCalls.length).toBe(0);
  });

  it('skips users who already received a digest within the 6-day window', async () => {
    state.user = {
      id: 'u1',
      email: 'a@example.com',
      name: 'Alice',
      emailNotifications: true,
      lastEmailDigestAt: new Date(Date.now() - 2 * dayMs),
      currentStreak: 3,
      freezeTokens: 0,
      _count: { badges: 0 },
    };
    const result = await sendWeeklyDigestToUser('u1');
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('already-sent-this-week');
    expect(state.updateCalls.length).toBe(0);
  });

  it('sends and bumps lastEmailDigestAt on first-ever digest', async () => {
    state.user = {
      id: 'u1',
      email: 'a@example.com',
      name: 'Alice',
      emailNotifications: true,
      lastEmailDigestAt: null,
      currentStreak: 5,
      freezeTokens: 1,
      _count: { badges: 2 },
    };
    state.posts = [
      { id: 'p1', title: 'Hello', _count: { likes: 4, comments: 1 } },
    ];
    const result = await sendWeeklyDigestToUser('u1');
    expect(result.sent).toBe(true);
    expect(state.updateCalls.length).toBe(1);
    expect(state.updateCalls[0].where.id).toBe('u1');
    expect(state.updateCalls[0].data.lastEmailDigestAt).toBeInstanceOf(Date);
  });
});

describe('buildWeeklyDigest', () => {
  it('returns null for an unknown user', async () => {
    state.user = null;
    const payload = await buildWeeklyDigest('missing');
    expect(payload).toBeNull();
  });

  it('returns top posts + streak/freeze/badge counts', async () => {
    state.user = {
      id: 'u1',
      email: 'a@example.com',
      name: 'Alice',
      emailNotifications: true,
      lastEmailDigestAt: null,
      currentStreak: 7,
      freezeTokens: 2,
      _count: { badges: 4 },
    };
    state.posts = [
      { id: 'p1', title: 'Top', _count: { likes: 10, comments: 5 } },
      { id: 'p2', title: null, _count: { likes: 3, comments: 1 } },
    ];
    const payload = await buildWeeklyDigest('u1');
    expect(payload?.topPosts).toHaveLength(2);
    expect(payload?.topPosts[0].likeCount).toBe(10);
    expect(payload?.currentStreak).toBe(7);
    expect(payload?.freezeTokens).toBe(2);
    expect(payload?.newBadgeCount).toBe(4);
  });
});
