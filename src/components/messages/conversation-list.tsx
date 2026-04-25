'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { dmInboxChannel, DM_INBOX_EVENT, DM_READ_EVENT } from '@/lib/dm-realtime';
import { getConversationList, type ConversationListItem } from '@/lib/conversation-actions';
import type { Messages } from '@/lib/i18n/messages/en';

interface ConversationListProps {
  initialConversations: ConversationListItem[];
  /** A8 — cursor for the second page, or null when all conversations fit in one page. */
  initialNextCursor: string | null;
  messages: Messages['dm'];
  /** Round 6 / A1 — App-locale string (e.g. 'en', 'de') threaded from the server
   *  so conversation timestamps match the UI language, not the browser/OS locale. */
  locale: string;
}

export function ConversationList({
  initialConversations,
  initialNextCursor,
  messages,
  locale,
}: ConversationListProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const pathname = usePathname();
  // Derive the active conversation id from the current URL (/messages/<id>)
  const activeConversationId =
    pathname?.startsWith('/messages/') && pathname !== '/messages/'
      ? pathname.split('/')[2]
      : undefined;
  const [conversations, setConversations] = useState<ConversationListItem[]>(initialConversations);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Round 5 / Item 5 — track which conversation id is navigating so we can
  // apply an optimistic active state before the page transition completes.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setConversations(initialConversations);
    setNextCursor(initialNextCursor);
  }, [initialConversations, initialNextCursor]);

  // Clear pending state when navigation lands (pathname changes).
  useEffect(() => {
    setPendingId(null);
  }, [pathname]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    // Realtime refetch always resets to page 1 so the inbox reflects the
    // latest ordering after a new message or read event.
    const refetch = () => {
      startTransition(async () => {
        const { items: fresh, nextCursor: freshCursor } = await getConversationList();
        setConversations(fresh);
        setNextCursor(freshCursor);
      });
    };
    const channel = supabase
      .channel(dmInboxChannel(userId))
      .on('broadcast', { event: DM_INBOX_EVENT }, refetch)
      // Round 2 / A2 — replaces the old router.refresh() path triggered from
      // the ChatWindow mount-effect. Fires when `markConversationRead`
      // actually flipped rows on the server.
      .on('broadcast', { event: DM_READ_EVENT }, refetch)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleLoadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const { items: more, nextCursor: moreCursor } = await getConversationList({ cursor: nextCursor });
      // Deduplicate by id in case a Realtime refetch already prepended some rows.
      setConversations((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...more.filter((c) => !seen.has(c.id))];
      });
      setNextCursor(moreCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-base font-semibold text-foreground mb-1">{messages.emptyInboxTitle}</h2>
        <p className="text-sm text-muted-foreground">{messages.emptyInboxBody}</p>
      </div>
    );
  }

  return (
    <div>
    <ul className="divide-y divide-border" role="list">
      {conversations.map((c) => {
        const isActive = c.id === activeConversationId;
        const hasUnread = c.unreadCount > 0;
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              prefetch={true}
              aria-current={isActive ? 'page' : undefined}
              aria-busy={pendingId === c.id ? true : undefined}
              onClick={() => setPendingId(c.id)}
              className={cn(
                'flex items-center gap-3 px-3 py-3 transition-colors',
                'hover:bg-muted focus-visible:outline-none focus-visible:bg-muted',
                (isActive || pendingId === c.id) && 'bg-muted',
              )}
            >
              <Avatar src={c.otherUser.image} name={c.otherUser.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      'truncate text-sm',
                      hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground',
                    )}
                  >
                    {c.otherUser.name ?? 'Unknown'}
                  </span>
                  {c.lastMessageAt && (
                    <time
                      dateTime={c.lastMessageAt.toISOString?.() ?? String(c.lastMessageAt)}
                      className="shrink-0 text-[11px] text-muted-foreground"
                    >
                      {formatShortTime(new Date(c.lastMessageAt), locale)}
                    </time>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      'truncate text-xs',
                      hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground',
                    )}
                  >
                    {/* Round 6 / A2 — show attachment hint when body is empty */}
                    {c.lastMessage?.body ||
                      (c.lastMessage?.attachmentMime?.startsWith('image/')
                        ? messages.inboxAttachmentPhoto
                        : c.lastMessage?.attachmentMime === 'application/pdf'
                          ? messages.inboxAttachmentDocument
                          : '')}
                  </p>
                  {hasUnread && (
                    <span
                      aria-label={`${c.unreadCount} ${messages.unreadLabel}`}
                      className="shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-dm-badge text-white text-[10px] font-semibold"
                    >
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
    {nextCursor && (
      <div className="px-4 py-3 flex justify-center">
        <button
          type="button"
          onClick={() => void handleLoadMore()}
          disabled={isLoadingMore}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          {isLoadingMore ? messages.loadingMoreConversations : messages.loadMoreConversations}
        </button>
      </div>
    )}
    </div>
  );
}

// Round 6 / A1 — `locale` replaces `undefined` so timestamps match the UI
// language, not the browser/OS locale (e.g. German device + English UI → 'Mon'
// not 'Mo.').
function formatShortTime(date: Date, locale: string): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (diff < oneDay && date.getDate() === new Date().getDate()) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 7 * oneDay) {
    return date.toLocaleDateString(locale, { weekday: 'short' });
  }
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}
