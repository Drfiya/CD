import Image from 'next/image';
import { BadgeType } from '@/generated/prisma/client';
import { getBadgeDefinitions, resolveBadgeView } from '@/lib/badge-definitions-internal';

export type DisplayBadge = {
  type: BadgeType | null;
  customDefinitionId?: string | null;
};

export interface BadgeDisplayProps {
  badges: DisplayBadge[];
  maxVisible?: number;
  /**
   * "compact" — inline emoji row (for member cards / sidebars)
   * "detailed" — emoji + label (for profile pages)
   */
  variant?: 'compact' | 'detailed';
  className?: string;
}

/**
 * Server component — awaits the request-scoped BadgeDefinition map so that
 * admin edits (new label, new icon, new color) propagate instantly without
 * redeploy. Custom (non-BadgeType) badges are resolved via customDefinitionId.
 */
export async function BadgeDisplay({
  badges,
  maxVisible = 3,
  variant = 'compact',
  className = '',
}: BadgeDisplayProps) {
  if (badges.length === 0) return null;

  const defs = await getBadgeDefinitions();

  // Resolve each badge to its definition; drop badges with neither a known type
  // nor a known customDefinitionId (e.g. deleted custom definition).
  const resolved = badges
    .map((b) => ({ badge: b, view: resolveBadgeView(b, defs) }))
    .filter((r): r is { badge: DisplayBadge; view: NonNullable<typeof r.view> } => r.view !== null);

  if (resolved.length === 0) return null;

  if (variant === 'detailed') {
    return (
      <ul
        className={`flex flex-wrap gap-2 ${className}`}
        aria-label="Earned badges"
      >
        {resolved.map(({ view }, idx) => (
          <li
            key={`${view.id}-${idx}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-neutral-800 text-xs text-gray-700 dark:text-neutral-200"
            title={view.description}
          >
            {view.iconUrl ? (
              <Image
                src={view.iconUrl}
                alt=""
                aria-hidden="true"
                width={16}
                height={16}
                className="w-4 h-4 object-contain"
                unoptimized
              />
            ) : (
              <span aria-hidden="true" className="text-sm leading-none">{view.emoji}</span>
            )}
            <span>{view.label}</span>
          </li>
        ))}
      </ul>
    );
  }

  const visible = resolved.slice(0, maxVisible);
  const overflow = resolved.length - maxVisible;

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      aria-label={`${resolved.length} earned badge${resolved.length === 1 ? '' : 's'}`}
    >
      {visible.map(({ view }, idx) => (
        view.iconUrl ? (
          <Image
            key={`${view.id}-${idx}`}
            src={view.iconUrl}
            alt=""
            title={view.label}
            aria-label={view.label}
            width={16}
            height={16}
            className="w-4 h-4 object-contain"
            unoptimized
          />
        ) : (
          <span
            key={`${view.id}-${idx}`}
            title={view.label}
            aria-label={view.label}
            className="text-base leading-none"
          >
            {view.emoji}
          </span>
        )
      ))}
      {overflow > 0 && (
        <span className="text-xs text-gray-500 dark:text-neutral-400">+{overflow}</span>
      )}
    </div>
  );
}
