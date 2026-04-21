/**
 * CR11 — Coursework (SCHOLAR) badge.
 * 32×32 viewBox + native 24×24 Lucide glyph inset by 4px (see Published).
 */
export function BadgeCourseworkSvg({ size = 24 }: { size?: number }) {
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
        <path d="M12 7v14" />
        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
      </g>
    </svg>
  );
}
