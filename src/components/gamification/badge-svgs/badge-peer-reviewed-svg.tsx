/**
 * CR11 — Peer Reviewed (POPULAR) badge. One of two prestige-red badges.
 * 32×32 viewBox + native 24×24 Lucide glyph inset by 4px (see Published).
 */
export function BadgePeerReviewedSvg({ size = 24 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="16" fill="var(--badge-accent, #D32F2F)" fillOpacity="0.12" />
      <g
        transform="translate(4 4)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M7 10v12" />
        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
      </g>
    </svg>
  );
}
