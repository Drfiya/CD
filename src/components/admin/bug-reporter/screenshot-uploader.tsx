'use client';

/**
 * CR14 — ScreenshotUploader
 *
 * Supports three input modes:
 *   1. Click-to-pick (file input)
 *   2. Drag & Drop (scoped to the dropzone element, counter-based to handle
 *      child pointer events — mirrors dm-drag-drop pattern)
 *   3. Clipboard Paste (Cmd/Ctrl+V anywhere in the document while the
 *      component is mounted)
 *
 * Constraints (enforced before upload):
 *   - Max 5 screenshots total (SCREENSHOT_MAX_COUNT)
 *   - Max 5 MB per file (SCREENSHOT_MAX_BYTES)
 *   - Only JPEG / PNG / WebP / GIF (SCREENSHOT_ALLOWED_MIMES)
 *
 * Upload flow:
 *   - `requestScreenshotUploadUrl` → signed upload URL
 *   - PUT to Supabase Storage directly from the browser
 *   - On success, call `onUploaded({ path, name, mime, size })`
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { requestScreenshotUploadUrl } from '@/lib/bug-reporter-actions';
import {
  SCREENSHOT_ALLOWED_MIMES,
  SCREENSHOT_MAX_BYTES,
  SCREENSHOT_MAX_COUNT,
  type ScreenshotMime,
  type ScreenshotRef,
} from '@/lib/validations/bug-reporter';
import { toast } from 'sonner';

interface Props {
  current: ScreenshotRef[];
  onUploaded: (ref: ScreenshotRef) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

const MAX_MB = SCREENSHOT_MAX_BYTES / (1024 * 1024); // 5

function isAllowedMime(mime: string): mime is ScreenshotMime {
  return (SCREENSHOT_ALLOWED_MIMES as readonly string[]).includes(mime);
}

export function ScreenshotUploader({ current, onUploaded, onRemove, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const remaining = SCREENSHOT_MAX_COUNT - current.length;
  const atLimit = remaining <= 0;

  const uploadFile = useCallback(
    async (file: File) => {
      if (atLimit) {
        toast.error(`Max ${SCREENSHOT_MAX_COUNT} screenshots allowed`);
        return;
      }
      if (!isAllowedMime(file.type)) {
        toast.error('Only JPEG, PNG, WebP, and GIF screenshots allowed');
        return;
      }
      if (file.size > SCREENSHOT_MAX_BYTES) {
        toast.error(`Screenshot too large — max ${MAX_MB} MB`);
        return;
      }

      setUploading(true);
      try {
        const result = await requestScreenshotUploadUrl({
          filename: file.name,
          mime: file.type,
          size: file.size,
        });

        if ('error' in result) {
          toast.error(result.error);
          return;
        }

        const putRes = await fetch(result.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!putRes.ok) {
          toast.error('Screenshot upload failed — please try again');
          return;
        }

        onUploaded({
          path: result.path,
          name: result.sanitisedName,
          mime: file.type as ScreenshotMime,
          size: file.size,
        });
      } catch {
        toast.error('Screenshot upload failed — please try again');
      } finally {
        setUploading(false);
      }
    },
    [atLimit, onUploaded],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const toUpload = Array.from(files).slice(0, remaining);
      for (const file of toUpload) {
        void uploadFile(file);
      }
    },
    [remaining, uploadFile],
  );

  // Clipboard paste
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (disabled || atLimit) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) void uploadFile(file);
        }
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [disabled, atLimit, uploadFile]);

  // Drag & Drop — counter prevents flickering when pointer crosses child elements
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setDragOver(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    if (disabled || atLimit) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      {/* Dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !atLimit && !disabled && inputRef.current?.click()}
        className={[
          'relative flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors',
          atLimit || disabled
            ? 'cursor-not-allowed opacity-50 border-gray-200 dark:border-neutral-700'
            : 'cursor-pointer border-gray-300 dark:border-neutral-600 hover:border-primary hover:bg-gray-50 dark:hover:bg-neutral-800/50',
          dragOver && !atLimit && !disabled
            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
            : '',
        ].join(' ')}
      >
        <span className="text-xl">📎</span>
        <p className="text-xs text-muted-foreground">
          {atLimit
            ? `Max ${SCREENSHOT_MAX_COUNT} screenshots reached`
            : uploading
              ? 'Uploading…'
              : 'Drop screenshots here, paste (Cmd+V), or click to pick'}
        </p>
        <p className="text-[11px] text-muted-foreground/60">
          JPEG · PNG · WebP · GIF · max {MAX_MB} MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={SCREENSHOT_ALLOWED_MIMES.join(',')}
          multiple
          className="sr-only"
          disabled={atLimit || disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Preview chips */}
      {current.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {current.map((s, i) => (
            <li
              key={s.path}
              className="flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 px-2.5 py-1 text-xs"
            >
              <span className="max-w-[120px] truncate">{s.name}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors"
                aria-label={`Remove ${s.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
