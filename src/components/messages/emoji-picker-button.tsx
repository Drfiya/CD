'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Lazy-loaded to keep it out of the initial bundle (~200 KB).
// Mirrors the pattern in `comment-form-controller.tsx:13`.
const Picker = dynamic(
  () => import('@emoji-mart/react').then((mod) => mod.default),
  { ssr: false },
);

interface EmojiData {
  native: string;
}

export interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  closeLabel: string;
  theme?: 'light' | 'dark' | 'auto';
}

export function EmojiPickerButton({
  onEmojiSelect,
  disabled,
  ariaLabel,
  closeLabel,
  theme = 'auto',
}: EmojiPickerButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();

  // If theme is auto, sync precisely with the Next.js dark mode state.
  const activeTheme = theme === 'auto' ? (resolvedTheme === 'dark' ? 'dark' : 'light') : theme;

  useEffect(() => {
    if (!showPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  function handleEmojiSelect(data: EmojiData) {
    onEmojiSelect(data.native);
    setShowPicker(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setShowPicker((v) => !v)}
        disabled={disabled}
        aria-label={showPicker ? closeLabel : ariaLabel}
        aria-expanded={showPicker}
        aria-haspopup="dialog"
        title={ariaLabel}
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          'text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed text-sm border border-transparent',
          showPicker && 'bg-gray-100 dark:bg-neutral-600 border-gray-400'
        )}
      >
        😊
      </button>

      {showPicker && (
        <div
          role="dialog"
          aria-label={ariaLabel}
          className={cn(
            'z-50',
            // Mobile: fixed full-width sheet at the bottom of the viewport
            'fixed bottom-0 left-0 right-0',
            // Desktop: absolute above the button, right-aligned
            'md:absolute md:bottom-full md:right-0 md:left-auto md:w-auto',
          )}
          style={{ '--rgb-accent': '217, 74, 74' } as React.CSSProperties}
        >
          <Picker
            data={async () => (await import('@emoji-mart/data')).default}
            onEmojiSelect={handleEmojiSelect}
            theme={activeTheme}
            previewPosition="none"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Inserts `insertion` at the cursor's [selStart, selEnd] range in `value`.
 * Exported for unit-testing without instantiating the full component.
 */
export function insertAtCursorPosition(
  value: string,
  insertion: string,
  selStart: number,
  selEnd: number,
): string {
  return value.slice(0, selStart) + insertion + value.slice(selEnd);
}
