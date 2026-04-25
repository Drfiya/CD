'use client';

/**
 * Round 3 / Item 5 — Renders a single persisted attachment inside a message
 * bubble.
 *
 * Handles two shapes:
 *   - Image (`image/jpeg`, `image/png`, `image/webp`): inline thumbnail with
 *     click-to-open lightbox.
 *   - PDF (`application/pdf`): compact file card with Download link.
 *
 * Signed URLs are fetched lazily on mount via `getAttachmentSignedUrl`. They
 * are cached in local state for the component lifetime — no aggressive
 * pre-signing of the whole conversation.
 */
import { useCallback, useEffect, useState } from 'react';
import { getAttachmentSignedUrl } from '@/lib/dm-attachment-actions';
import { ImageLightbox } from './image-lightbox';

interface MessageAttachmentProps {
  messageId: string;
  mime: string;
  size: number;
  name: string;
  /** i18n labels passed from the caller so this component stays locale-pure. */
  labels: {
    download: string;
    openImage: string;
    imageAlt: (name: string) => string;
    uploadFailed: string;
    closeLightbox: string;
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Global in-memory cache to prevent refetching signed URLs on every re-mount.
const urlCache = new Map<string, string>();
type FetchResult = Awaited<ReturnType<typeof getAttachmentSignedUrl>>;
const urlFetchPromises = new Map<string, Promise<FetchResult>>();

function getCachedUrl(id: string): string | null {
  if (urlCache.has(id)) return urlCache.get(id)!;
  if (typeof window !== 'undefined') {
    const fromSession = sessionStorage.getItem(`dm-url-${id}`);
    if (fromSession) {
      urlCache.set(id, fromSession);
      return fromSession;
    }
  }
  return null;
}

export function MessageAttachment({
  messageId,
  mime,
  size,
  name,
  labels,
}: MessageAttachmentProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(() => getCachedUrl(messageId));
  const [error, setError] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    // Because Next.js Server-Side Rendering (SSR) evaluates `window` to undefined, 
    // the initial state of `signedUrl` is null. We MUST re-check `getCachedUrl` 
    // inside this client-side hook to actually use the sessionStorage cache.
    const clientCached = getCachedUrl(messageId);
    if (clientCached) {
      // Defer to microtask to avoid calling setState synchronously inside an effect
      // (react-hooks/set-state-in-effect). The URL is available in the same tick.
      queueMicrotask(() => setSignedUrl(clientCached));
      return;
    }

    if (signedUrl) return;

    let cancelled = false;

    (async () => {
      try {
        // Deduplicate simultaneous requests for the same messageId
        let fetchPromise = urlFetchPromises.get(messageId);
        if (!fetchPromise) {
          fetchPromise = getAttachmentSignedUrl({ messageId });
          urlFetchPromises.set(messageId, fetchPromise);
        }

        const result = await fetchPromise;

        if (cancelled) return;

        if ('error' in result) {
          setError(typeof result.error === 'string' ? result.error : 'unknown');
          urlFetchPromises.delete(messageId); // Free up so we can retry later
          return;
        }

        if (typeof result.signedUrl === 'string') {
          urlCache.set(messageId, result.signedUrl);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(`dm-url-${messageId}`, result.signedUrl);
          }
          setSignedUrl(result.signedUrl);
        } else {
          setError('missing_url');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Server Action crashed');
          urlFetchPromises.delete(messageId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messageId, signedUrl]);

  const openLightbox = useCallback(() => setIsLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setIsLightboxOpen(false), []);

  const isImage = mime.startsWith('image/');

  if (error) {
    return (
      <div className="mb-1 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
        {labels.uploadFailed}
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div
        className="mb-1 flex h-20 w-full items-center justify-center rounded-md bg-muted/30 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <span className="h-3 w-3 rounded-full bg-dm-connecting animate-pulse" aria-hidden />
      </div>
    );
  }

  if (isImage) {
    return (
      <>
        <button
          type="button"
          onClick={openLightbox}
          aria-label={labels.openImage}
          className="mb-1 block max-w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={signedUrl}
            alt={labels.imageAlt(name)}
            loading="lazy"
            className="max-h-64 w-full rounded-lg object-cover"
          />
        </button>
        <ImageLightbox
          isOpen={isLightboxOpen}
          onClose={closeLightbox}
          src={signedUrl}
          alt={labels.imageAlt(name)}
          closeLabel={labels.closeLightbox}
        />
      </>
    );
  }

  // PDF (the only non-image MIME in the whitelist).
  return (
    <div className="mb-1 flex items-center gap-2 rounded-md border border-border bg-background/50 p-2">
      <span
        aria-hidden
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
      >
        📄
      </span>
      <div className="min-w-0 flex-1 text-xs">
        <p className="truncate font-medium text-foreground">{name}</p>
        <p className="text-muted-foreground">{formatSize(size)}</p>
      </div>
      <a
        href={signedUrl}
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {labels.download}
      </a>
    </div>
  );
}
