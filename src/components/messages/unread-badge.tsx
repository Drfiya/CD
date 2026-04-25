'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { dmInboxChannel, DM_INBOX_EVENT, DM_READ_EVENT } from '@/lib/dm-realtime';
import { getTotalUnreadCount } from '@/lib/conversation-actions';
import { createVisibilityAwarePoller } from './visibility-polling';

const POLL_INTERVAL_MS = 60_000;

/**
 * Small "Messages" icon with a live unread count. Sits in the header next to
 * the notification bell. Updates via:
 *  - initial server fetch on mount
 *  - Supabase broadcast on `dm:inbox:<userId>` (push from sender's action
 *    and from the reader's own `markConversationRead` via `DM_READ_EVENT`)
 *  - 60s polling fallback — paused while the tab is hidden (Round 2 / A3)
 *    so background tabs do not burn battery or server cycles.
 */
export function UnreadBadge({ ariaLabel }: { ariaLabel: string }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    async function refresh() {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const n = await getTotalUnreadCount();
        if (!active) return;
        setCount(n);
        // Round 6 / C2 — propagate unread count to the browser tab title so
        // users see "(3) ScienceExperts.ai" without switching to this tab.
        // SSR-safe: guarded by `typeof document` so Next.js server render
        // doesn't throw. The title is restored when the component unmounts.
        if (typeof document !== 'undefined') {
          const APP_NAME = 'ScienceExperts.ai';
          document.title = n > 0 ? `(${n > 99 ? '99+' : n}) ${APP_NAME}` : APP_NAME;
        }
      } catch {
        // Fail silently; next tick will retry
      }
    }

    void refresh();

    // Polling state machine — automatically pauses while the tab is hidden
    // and fires an immediate catch-up refresh on visibility regained.
    const poller = createVisibilityAwarePoller({
      refresh,
      intervalMs: POLL_INTERVAL_MS,
    });
    poller.start();

    const supabase = createClient();
    const channel = supabase
      .channel(dmInboxChannel(userId))
      .on('broadcast', { event: DM_INBOX_EVENT }, () => {
        void refresh();
      })
      .on('broadcast', { event: DM_READ_EVENT }, () => {
        // Surgical replacement for the old router.refresh() path.
        void refresh();
      })
      .subscribe();

    return () => {
      active = false;
      poller.stop();
      void supabase.removeChannel(channel);
      // Restore the tab title when the badge unmounts (e.g. user logs out).
      if (typeof document !== 'undefined') {
        document.title = 'ScienceExperts.ai';
      }
    };
  }, [userId]);

  if (!userId) return null;

  return (
    <Link
      href="/messages"
      aria-label={`${ariaLabel}${count > 0 ? ` (${count})` : ''}`}
      className={cn(
        'relative flex items-center justify-center h-9 w-9 rounded-lg',
        'text-gray-500 dark:text-neutral-400 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-dm-badge text-white text-[10px] font-bold flex items-center justify-center leading-none"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
