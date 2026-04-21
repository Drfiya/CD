import Link from 'next/link';
import { BadgeType } from '@/generated/prisma/client';
import { BADGE_CONFIG } from '@/components/gamification/badge-config';

interface AuthorBadgeRowProps {
  authorId: string;
  badges: { type: BadgeType | null; customDefinitionId?: string | null }[];
  totalBadges: number;
  maxVisible?: number;
  className?: string;
}

/**
 * Compact inline badge row for PostCard / CommentCard author headers.
 *
 * Renders up to `maxVisible` badge emojis as a single Link to /members/[id].
 * If the author has more badges than `maxVisible`, an aggregated `+N` chip
 * is shown instead of additional individual badges.
 *
 * Fast path: uses the static BADGE_CONFIG map for system (auto-awarded)
 * BadgeType values. Custom admin-authored badges (type === null) fall back
 * to a generic sparkle emoji — for per-badge custom icon rendering on the
 * feed, the profile page's BadgeDisplay (server component) is the canonical
 * surface. This keeps the author row zero-latency for the hot feed path.
 */
export function AuthorBadgeRow({
  authorId,
  badges,
  totalBadges,
  maxVisible = 3,
  className = '',
}: AuthorBadgeRowProps) {
  if (totalBadges === 0) return null;

  const visible = badges.slice(0, maxVisible);
  const overflow = totalBadges - visible.length;

  return (
    <Link
      href={`/members/${authorId}`}
      aria-label={`${totalBadges} earned badge${totalBadges === 1 ? '' : 's'} — view profile`}
      className={`inline-flex items-center gap-0.5 align-middle hover:opacity-80 transition-opacity ${className}`}
    >
      {visible.map((badge, idx) => {
        if (badge.type) {
          const cfg = BADGE_CONFIG[badge.type];
          return (
            <span
              key={`${badge.type}-${idx}`}
              title={cfg.label}
              aria-label={cfg.label}
              className="text-sm leading-none"
            >
              {cfg.emoji}
            </span>
          );
        }
        return (
          <span
            key={`custom-${badge.customDefinitionId ?? idx}`}
            title="Custom badge"
            aria-label="Custom badge"
            className="text-sm leading-none"
          >
            ✨
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="text-[10px] font-medium text-gray-500 dark:text-neutral-400 ml-0.5">
          +{overflow}
        </span>
      )}
    </Link>
  );
}
