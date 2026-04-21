import type { BadgeType } from '@/generated/prisma/client';

/**
 * Static fallback map for client-side toasts and other code paths that fire
 * in response to a *just-earned* BadgeType enum value (i.e. no DB round-trip
 * needed). Admin-editable runtime metadata lives in `BadgeDefinition` — the
 * server-rendered `BadgeDisplay` reads from there via `getBadgeDefinitions()`.
 *
 * Keep this table in sync with the seed values in migration #13. Divergence
 * only affects client toast previews for system (auto-awarded) badges;
 * persistent surfaces (profiles, cards, sidebars) always use the DB map.
 *
 * Lives in its own module so client components can import it without pulling
 * in the async server-component `BadgeDisplay`.
 */
export const BADGE_CONFIG: Record<BadgeType, { emoji: string; label: string; description: string }> = {
  // CR11 pilots — label renamed to match BadgeDefinition seed; emoji kept for
  // the zero-latency AuthorBadgeRow hot path. Persistent surfaces (profiles,
  // leaderboard) go through `BadgeDisplay` → DB iconUrl → inline Lucide SVG.
  FIRST_POST:        { emoji: '🌱', label: 'Published',         description: 'Published your first post' },
  CONVERSATIONALIST: { emoji: '💬', label: 'Conversationalist', description: 'Wrote 10 comments' },
  POPULAR:           { emoji: '❤️', label: 'Peer Reviewed',     description: 'Received 25 likes' },
  SCHOLAR:           { emoji: '🎓', label: 'Coursework',         description: 'Completed 5 lessons' },
  LEVEL_5:           { emoji: '⚡', label: 'Level 5',           description: 'Reached level 5' },
  TOP_10:            { emoji: '🏆', label: 'Top 10',            description: 'Ranked in the all-time top 10' },
  STREAK_7:          { emoji: '🔥', label: '7-Day Streak',      description: 'Active 7 days in a row' },
  WELCOME:           { emoji: '🎉', label: 'Welcome',            description: 'Completed profile, enrolled, and posted — activation funnel complete' },
};
