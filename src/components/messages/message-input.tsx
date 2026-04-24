'use client';

import {
  useRef,
  useState,
  type KeyboardEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

export interface MessageInputProps {
  onSend: (body: string) => void | Promise<void>;
  disabled?: boolean;
  disabledReason?: string | null;
  placeholder: string;
  sendLabel: string;
  sendingLabel: string;
  /** Max characters, mirrored from the server-side Zod schema. */
  maxLength: number;
  /**
   * Round 3 / Item 5 — slot for the paperclip button + preview chip. When
   * provided, the input can be submitted with an empty body (the attachment
   * carries the message).
   */
  attachmentSlot?: ReactNode;
  /** True when an attachment is queued for this send (relaxes empty-body rule). */
  hasAttachment?: boolean;
  /** True while an upload is in flight; disables the Send button. */
  isUploading?: boolean;
}

export function MessageInput({
  onSend,
  disabled,
  disabledReason,
  placeholder,
  sendLabel,
  sendingLabel,
  maxLength,
  attachmentSlot,
  hasAttachment,
  isUploading,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);

  async function submit() {
    const trimmed = value.trim();
    // Round 3 / Item 5 — allow empty body when an attachment is queued.
    if ((!trimmed && !hasAttachment) || pending || disabled || isUploading) return;
    setPending(true);
    try {
      await onSend(trimmed);
      setValue('');
      // Reset textarea height after send
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter = send, Shift+Enter = newline. No modifiers other than Shift should bypass send.
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      void submit();
    }
  }

  function handleInput(e: FormEvent<HTMLTextAreaElement>) {
    // Auto-grow up to ~6 lines
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    setValue(el.value);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="border-t border-border bg-card px-3 py-2"
      aria-label="Send message"
    >
      {disabled && disabledReason && (
        <p className="mb-2 text-xs text-muted-foreground" role="status">
          {disabledReason}
        </p>
      )}
      {/* Round 3 / Item 5 — attachment preview chip renders here, above the textarea. */}
      {attachmentSlot && !disabled && <div>{attachmentSlot}</div>}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          aria-label={placeholder}
        />
        <button
          type="submit"
          disabled={
            disabled ||
            pending ||
            isUploading ||
            (value.trim().length === 0 && !hasAttachment)
          }
          className={cn(
            'h-10 px-4 rounded-md text-sm font-medium',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          )}
        >
          {pending || isUploading ? sendingLabel : sendLabel}
        </button>
      </div>
    </form>
  );
}
