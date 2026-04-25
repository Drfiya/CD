import type { Messages } from '@/lib/i18n/messages/en';

/**
 * Round 2 / A1 — Unobtrusive 1-line connection banner.
 *
 * Lives *in* the chat surface (not above it as a toast/modal). Renders only
 * when the Supabase Realtime channel is not yet in `'subscribed'` status, so
 * the user sees the truth of their connection without being interrupted.
 *
 * Supabase `.subscribe()` callback status mapping:
 *   - `'SUBSCRIBED'`                           → `'subscribed'`
 *   - `'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'` → `'degraded'`
 *   - Initial mount (before any callback)       → `'connecting'`
 */
export type RealtimeStatus = 'connecting' | 'subscribed' | 'degraded';

/**
 * Pure mapper from Supabase channel status strings to our tri-state UI state.
 * Exposed for unit tests and future reuse (e.g., a page-level status chip).
 * Returns `null` when the callback status does not warrant a state update
 * (the caller should keep the previous value).
 */
export function mapRealtimeStatus(
  channelStatus: string,
): RealtimeStatus | null {
  if (channelStatus === 'SUBSCRIBED') return 'subscribed';
  if (
    channelStatus === 'CHANNEL_ERROR' ||
    channelStatus === 'TIMED_OUT' ||
    channelStatus === 'CLOSED'
  ) {
    return 'degraded';
  }
  return null;
}

interface ConnectionBannerProps {
  status: RealtimeStatus;
  messages: Pick<Messages['dm'], 'connecting' | 'reconnecting'>;
}

export function ConnectionBanner({ status, messages }: ConnectionBannerProps) {
  if (status === 'subscribed') return null;

  const label = status === 'connecting' ? messages.connecting : messages.reconnecting;

  return (
    <div
      role="status"
      aria-live="polite"
      className="px-4 py-1.5 border-b border-border bg-muted/50 text-xs text-muted-foreground flex items-center gap-2"
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full bg-dm-connecting animate-pulse"
      />
      {label}
    </div>
  );
}
