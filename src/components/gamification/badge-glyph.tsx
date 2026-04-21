import Image from 'next/image';
import { getPilotSvg, getBadgeAccentClass } from './badge-svgs';

interface BadgeGlyphProps {
  iconUrl: string | null;
  emoji: string;
  label: string;
  colorHex: string;
  size?: number;
  className?: string;
}

/**
 * CR11 — Single render authority for a badge glyph.
 *
 * Branches, in order:
 *   1. iconUrl matches a pilot SVG path → inline React SVG. Strokes use
 *      `currentColor` and inherit from the wrapper's `color` CSS, which is
 *      flipped light/dark by both the `.badge-frame` custom class AND the
 *      Tailwind `text-[#1F2937] dark:text-[#F3F4F6]` utility pair. The
 *      redundancy protects against CSS-layer / purge / cache edge cases.
 *   2. iconUrl set but not in the pilot registry (admin upload) → <Image>.
 *      currentColor cannot reach an <img> sandbox — admin uploads are
 *      assumed pre-coloured (documented trade-off in the CR11 brief).
 *   3. iconUrl null → emoji fallback (pre-CR11 behaviour for the 5
 *      legacy badges until Round 12 converts them).
 *
 * Used by both the server-side BadgeDisplay and the client-side Badge
 * Designer so all surfaces agree on how a badge looks.
 */
export function BadgeGlyph({
  iconUrl,
  emoji,
  label,
  colorHex,
  size = 24,
  className = '',
}: BadgeGlyphProps) {
  const pilotSvg = getPilotSvg(iconUrl);
  if (pilotSvg) {
    const accentClass = getBadgeAccentClass(colorHex);
    return (
      <span
        role="img"
        aria-label={label}
        className={`badge-frame ${accentClass} inline-flex items-center justify-center text-[#1F2937] dark:text-[#F3F4F6] ${className}`}
        style={{ width: size, height: size }}
      >
        {pilotSvg({ size })}
      </span>
    );
  }
  if (iconUrl) {
    return (
      <Image
        src={iconUrl}
        alt={label}
        width={size}
        height={size}
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={label}
      className={`leading-none inline-flex items-center justify-center ${className}`}
      style={{ fontSize: size, width: size, height: size }}
    >
      {emoji}
    </span>
  );
}
