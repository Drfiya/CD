import { BadgePublishedSvg } from './badge-published-svg';
import { BadgePeerReviewedSvg } from './badge-peer-reviewed-svg';
import { BadgeCourseworkSvg } from './badge-coursework-svg';

/**
 * CR11 — Pilot badge registry.
 *
 * Maps the seeded `BadgeDefinition.iconUrl` path to its inline React
 * component. We key off `iconUrl` (not `type`) because the admin Badge
 * Designer writes `iconUrl` as the source of truth; the seed migration
 * points the three pilot definitions at these public paths. Any other
 * `iconUrl` value (admin upload, legacy emoji fallback) falls through to
 * the `<img>` / emoji branches in `BadgeDisplay`.
 */
type InlineSvgComponent = (props: { size?: number }) => React.ReactElement;

const PILOT_SVG_BY_ICON_URL: Record<string, InlineSvgComponent> = {
  '/badges/badge-published.svg': BadgePublishedSvg,
  '/badges/badge-peer-reviewed.svg': BadgePeerReviewedSvg,
  '/badges/badge-coursework.svg': BadgeCourseworkSvg,
};

export function getPilotSvg(iconUrl: string | null | undefined): InlineSvgComponent | null {
  if (!iconUrl) return null;
  return PILOT_SVG_BY_ICON_URL[iconUrl] ?? null;
}

/**
 * Map `BadgeDefinition.colorHex` to the accent modifier class.
 * `#D32F2F` is the prestige accent; `#6B7280` is slate; everything else
 * (including the brand-red default `#D94A4A` kept for back-compat on
 * unmigrated rows) falls to charcoal so we never leak the brand-red
 * onto the prestige-reserved accent channel.
 */
export function getBadgeAccentClass(colorHex: string | null | undefined): string {
  switch (colorHex) {
    case '#D32F2F':
      return 'badge-accent-prestige';
    case '#6B7280':
      return 'badge-accent-slate';
    default:
      return 'badge-accent-charcoal';
  }
}

export { BadgePublishedSvg, BadgePeerReviewedSvg, BadgeCourseworkSvg };
