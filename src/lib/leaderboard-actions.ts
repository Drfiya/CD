'use server';

import db from '@/lib/db';
import { startOfDay, startOfMonth } from 'date-fns';
import { requireAuth } from '@/lib/auth-guards';

export type LeaderboardPeriod = 'all-time' | 'this-month' | 'this-day';

export type LeaderboardEntry = {
  id: string;
  name: string | null;
  image: string | null;
  points: number;
  level: number;
  rank: number;
};

// All-time leaderboard using cumulative User.points
export async function getLeaderboardAllTime(limit: number = 5): Promise<LeaderboardEntry[]> {
  await requireAuth();
  const result = await db.$queryRaw<(Omit<LeaderboardEntry, 'rank'> & { rank: bigint })[]>`
    SELECT id, name, image, points, level,
      RANK() OVER (ORDER BY points DESC) as rank
    FROM "User"
    ORDER BY points DESC
    LIMIT ${limit}
  `;

  return result.map((r) => ({ ...r, rank: Number(r.rank) }));
}

// Time-based leaderboard using PointsEvent table
export async function getLeaderboardByPeriod(
  period: 'this-month' | 'this-day',
  limit: number = 5
): Promise<LeaderboardEntry[]> {
  await requireAuth();
  const startDate = period === 'this-month' ? startOfMonth(new Date()) : startOfDay(new Date());

  const result = await db.$queryRaw<(Omit<LeaderboardEntry, 'rank'> & { rank: bigint })[]>`
    SELECT u.id, u.name, u.image, u.level,
      COALESCE(SUM(pe.amount), 0)::int as points,
      RANK() OVER (ORDER BY COALESCE(SUM(pe.amount), 0) DESC) as rank
    FROM "User" u
    LEFT JOIN "PointsEvent" pe ON pe."userId" = u.id AND pe."createdAt" >= ${startDate}
    GROUP BY u.id, u.name, u.image, u.level
    HAVING COALESCE(SUM(pe.amount), 0) > 0
    ORDER BY points DESC
    LIMIT ${limit}
  `;

  return result.map((r) => ({ ...r, rank: Number(r.rank) }));
}

// Get current user's rank for any period
export async function getUserRankAllTime(userId: string): Promise<LeaderboardEntry | null> {
  await requireAuth();
  const result = await db.$queryRaw<(Omit<LeaderboardEntry, 'rank'> & { rank: bigint })[]>`
    SELECT id, name, image, points, level, rank FROM (
      SELECT id, name, image, points, level,
        RANK() OVER (ORDER BY points DESC) as rank
      FROM "User"
    ) ranked
    WHERE id = ${userId}
  `;

  return result[0] ? { ...result[0], rank: Number(result[0].rank) } : null;
}

export async function getUserRankByPeriod(
  userId: string,
  period: 'this-month' | 'this-day'
): Promise<LeaderboardEntry | null> {
  await requireAuth();
  const startDate = period === 'this-month' ? startOfMonth(new Date()) : startOfDay(new Date());

  const result = await db.$queryRaw<(Omit<LeaderboardEntry, 'rank'> & { rank: bigint })[]>`
    SELECT id, name, image, level, points, rank FROM (
      SELECT u.id, u.name, u.image, u.level,
        COALESCE(SUM(pe.amount), 0)::int as points,
        RANK() OVER (ORDER BY COALESCE(SUM(pe.amount), 0) DESC) as rank
      FROM "User" u
      LEFT JOIN "PointsEvent" pe ON pe."userId" = u.id AND pe."createdAt" >= ${startDate}
      GROUP BY u.id, u.name, u.image, u.level
    ) ranked
    WHERE id = ${userId}
  `;

  return result[0] ? { ...result[0], rank: Number(result[0].rank) } : null;
}

// Unified getter
export async function getLeaderboard(
  period: LeaderboardPeriod,
  limit: number = 5
): Promise<LeaderboardEntry[]> {
  await requireAuth();
  if (period === 'all-time') {
    return getLeaderboardAllTime(limit);
  }
  return getLeaderboardByPeriod(period, limit);
}

export async function getUserRank(
  userId: string,
  period: LeaderboardPeriod
): Promise<LeaderboardEntry | null> {
  await requireAuth();
  if (period === 'all-time') {
    return getUserRankAllTime(userId);
  }
  return getUserRankByPeriod(userId, period);
}
