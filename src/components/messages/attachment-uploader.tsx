'use client';

/**
 * Round 3 / Item 5 — DM attachment uploader.
 *
 * Owns: the hidden file input, the paperclip button that triggers it, the
 * client-side pre-validation (MIME + size), and the preview chip shown above
 * the textarea. Does NOT own the upload itself — that lives in ChatWindow,
 * which coordinates `requestAttachmentUploadUrl` → PUT to signed URL →
 * `sendMessage(attachment)` in one send flow.
 *
 * Controlled by the parent via `value` + `onChange`. Disabled when
 * `disabled === true` or `isUploading === true`.
 */
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  DM_ATTACHMENT_ALLOWED_MIMES,
  DM_ATTACHMENT_MAX_BYTES,
} from '@/lib/validations/dm';

export interface AttachmentUploaderProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  isUploading?: boolean;
  buttonLabel: string;
  removeLabel: string;
  uploadingLabel: string;
  tooLargeMessage: (mb: number) => string;
  invalidTypeMessage: string;
  onValidationError?: (message: string) => void;
}

const ACCEPT_ATTR = DM_ATTACHMENT_ALLOWED_MIMES.join(',');

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentUploader({
  value,
  onChange,
  disabled,
  isUploading,
  buttonLabel,
  removeLabel,
  uploadingLabel,
  tooLargeMessage,
  invalidTypeMessage,
  onValidationError,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Derive the preview URL during render via useMemo (React 19's
  // `react-hooks/set-state-in-effect` rule disallows syncing props→state
  // via useEffect). The companion useEffect handles the revoke-on-unmount
  // side-effect only.
  const previewUrl = useMemo(() => {
    if (value && value.type.startsWith('image/')) {
      return URL.createObjectURL(value);
    }
    return null;
  }, [value]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handlePick() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the native input so the same filename can be re-selected.
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;

    // Client-side defence layer 1 (of 3). MIME whitelist is enforced here,
    // in the Zod schema, and in the Supabase bucket policy.
    if (
      !(DM_ATTACHMENT_ALLOWED_MIMES as readonly string[]).includes(file.type)
    ) {
      onValidationError?.(invalidTypeMessage);
      return;
    }
    if (file.size > DM_ATTACHMENT_MAX_BYTES) {
      const maxMb = Math.floor(DM_ATTACHMENT_MAX_BYTES / (1024 * 1024));
      onValidationError?.(tooLargeMessage(maxMb));
      return;
    }
    onChange(file);
  }

  function handleRemove() {
    onChange(null);
  }

  const hasFile = value !== null;

  return (
    <div className="w-full">
      {hasFile && (
        <div
          className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs"
          role="status"
          aria-live="polite"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-8 w-8 rounded object-cover"
              aria-hidden
            />
          ) : (
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded bg-background text-foreground"
            >
              📄
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-foreground">{value!.name}</p>
            <p className="text-muted-foreground">
              {isUploading ? uploadingLabel : formatFileSize(value!.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            aria-label={removeLabel}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            ×
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        onChange={handleFileChange}
        disabled={disabled}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={handlePick}
        disabled={disabled || isUploading || hasFile}
        aria-label={buttonLabel}
        title={buttonLabel}
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
          'text-muted-foreground hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      >
        <span aria-hidden className="text-xl">📎</span>
      </button>
    </div>
  );
}
