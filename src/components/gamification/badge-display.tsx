import { BadgeType } from '@/generated/prisma/client';
import { getBadgeDefinitions, resolveBadgeView } from '@/lib/badge-definitions-internal';
import { BadgeGlyph } from '@/components/gamification/badge-glyph';

export type DisplayBadge = {
  type: BadgeType | null;
  customDefinitionId?: string | null;
};

export interface BadgeDisplayProps {
  badges: DisplayBadge[];
  maxVisible?: number;
  /**
   * "compact" — inline row (for member cards / sidebars)
   * "detailed" — icon/emoji + label (for profile pages)
   */
  variant?: 'compact' | 'detailed';
  className?: string;
}

/**
 * Rendering is delegated to <BadgeGlyph>, which owns the three-way branch:
 *   pilot iconUrl → inline React SVG (currentColor light/dark)
 *   admin-uploaded iconUrl → <Image> (currentColor lost; acceptable)
 *   null iconUrl → emoji (pre-CR11 fallback)
 */
export async function BadgeDisplay({
  badges,
  maxVisible = 3,
  variant = 'compact',
  className = '',
}: BadgeDisplayProps) {
  if (badges.length === 0) return null;

  const defs = await getBadgeDefinitions();

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
            <BadgeGlyph
              iconUrl={view.iconUrl}
              emoji={view.emoji}
              label={view.label}
              colorHex={view.colorHex}
              size={16}
            />
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
        <span
          key={`${view.id}-${idx}`}
          title={view.label}
          className="inline-flex items-center"
        >
          <BadgeGlyph
            iconUrl={view.iconUrl}
            emoji={view.emoji}
            label={view.label}
            colorHex={view.colorHex}
            size={16}
          />
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-xs text-gray-500 dark:text-neutral-400">+{overflow}</span>
      )}
    </div>
  );
}
