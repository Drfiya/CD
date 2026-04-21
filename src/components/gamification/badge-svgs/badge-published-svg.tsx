/**
 * CR11 — Published (FIRST_POST) badge.
 *
 * 32×32 viewBox with Lucide's native 24×24 glyph inset by 4px on all sides
 * gives crisp stroke weight at 16/24/32/48 display sizes without sub-pixel
 * fade. Stroke inherits `currentColor` from `.badge-frame`; the accent
 * chip circle uses `--badge-accent` at 12% fill.
 */
export function BadgePublishedSvg({ size = 24 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill="var(--badge-accent, #1F2937)" fillOpacity="0.12" />
      <g
        transform="translate(4 4)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </g>
    </svg>
  );
}
