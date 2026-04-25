'use client';

/**
 * Round 3 / Item 5 — Minimal a11y-compliant fullscreen image viewer.
 *
 * Contract:
 *   - Opens on the caller passing `isOpen=true`; caller is responsible for
 *     state. No uncontrolled mode — the parent message bubble owns the toggle.
 *   - Dismisses on Escape, click-outside the image, and explicit close button.
 *   - `role="dialog"`, `aria-modal="true"`, with focus trapped inside the
 *     overlay. Returns focus to the element that opened it via `returnFocusTo`.
 *   - No animation library; a CSS opacity transition is enough.
 *
 * Not a general-purpose lightbox — purpose-built for a single image with a
 * label. Intentionally opinionated to stay <80 lines.
 */
import { useCallback, useEffect, useRef } from 'react';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt: string;
  closeLabel: string;
}

export function ImageLightbox({
  isOpen,
  onClose,
  src,
  alt,
  closeLabel,
}: ImageLightboxProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Move focus into the overlay on open, restore on close.
  // Focus is captured from `document.activeElement` at open time — that is
  // reliably the element that triggered the open (the image button), so we
  // don't need a ref forwarded from the parent.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  // Escape key + body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      // Simple focus trap: cycle Tab between close-button and the image only.
      if (e.key === 'Tab' && overlayRef.current) {
        e.preventDefault();
        closeButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Click outside the image closes. Click on the image itself does not.
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-dm-overlay/90 p-4 transition-opacity"
      onClick={handleBackdropClick}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="absolute top-4 right-4 h-11 w-11 rounded-full bg-white/10 text-white text-xl hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-w-[95vw] max-h-[95vh] object-contain rounded"
      />
    </div>
  );
}
