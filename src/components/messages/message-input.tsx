'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

export interface MessageInputHandle {
  insertAtCursor: (text: string) => void;
}

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
  /** Round 4 / Item 2 — slot for the emoji picker button, rendered between the textarea and Send. */
  emojiSlot?: ReactNode;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
function MessageInput({
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
  emojiSlot,
}: MessageInputProps, ref) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState('');
  const [pending, setPending] = useState(false);

  useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      const el = textareaRef.current;
      const selStart = el?.selectionStart ?? value.length;
      const selEnd = el?.selectionEnd ?? value.length;
      const newVal = value.slice(0, selStart) + text + value.slice(selEnd);
      setValue(newVal);
      // Restore cursor position after React flushes the state update.
      requestAnimationFrame(() => {
        if (!el) return;
        const pos = selStart + text.length;
        el.setSelectionRange(pos, pos);
        el.focus();
      });
    },
  }), [value]);

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
        {/* Round 4 / Item 2 — emoji picker button, between textarea and Send */}
        {emojiSlot}
        <button
          type="submit"
          disabled={
            disabled ||
            pending ||
            isUploading ||
            (value.trim().length === 0 && !hasAttachment)
          }
          className={cn(
            'px-5 py-2 rounded-full text-sm font-semibold tracking-wide text-white transition-colors shadow-sm',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          )}
          style={{ backgroundColor: '#D94A4A' }}
          onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#C43E3E'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#D94A4A'; }}
        >
          {pending || isUploading ? sendingLabel : sendLabel}
        </button>
      </div>
    </form>
  );
});

