'use client';

/**
 * CR14 — BugReporterButton
 *
 * Floating action button rendered in the main layout (admin-only).
 * Fixed bottom-right (bottom-5 right-5, z-40).
 * Opens BugReportModal on click.
 *
 * Visibility is already controlled by the parent layout
 * (`showAdminLink` → only rendered for admin/owner roles).
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';

const BugReportModal = dynamic(
  () => import('./bug-report-modal').then((m) => m.BugReportModal),
  { ssr: false },
);

export function BugReporterButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 border border-neutral-700 shadow-md hover:bg-neutral-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-900 opacity-60 hover:opacity-100"
        aria-label="Report a bug"
        title="Report a bug"
      >
        {/* Monochrome ladybug SVG */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-400"
          aria-hidden="true"
        >
          {/* Head */}
          <circle cx="12" cy="6" r="2.5" />
          {/* Antennae */}
          <path d="M10.5 4.5L8 2" />
          <path d="M13.5 4.5L16 2" />
          {/* Body */}
          <ellipse cx="12" cy="14.5" rx="6" ry="6.5" />
          {/* Center line (wings split) */}
          <line x1="12" y1="8" x2="12" y2="21" />
          {/* Spots left */}
          <circle cx="9.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
          {/* Spots right */}
          <circle cx="14.5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
          {/* Legs */}
          <path d="M6.5 12L4 10.5" />
          <path d="M6 15L3.5 16" />
          <path d="M7 18L5 20" />
          <path d="M17.5 12L20 10.5" />
          <path d="M18 15L20.5 16" />
          <path d="M17 18L19 20" />
        </svg>
      </button>

      {open && <BugReportModal onClose={() => setOpen(false)} />}
    </>
  );
}
