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
  messages: Messages['dm'];
}

export function ConversationList({
  initialConversations,
  messages,
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
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Keep props in sync if the server re-renders with fresh data
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const refetch = () => {
      startTransition(async () => {
        const fresh = await getConversationList();
        setConversations(fresh);
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

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-base font-semibold text-foreground mb-1">{messages.emptyInboxTitle}</h2>
        <p className="text-sm text-muted-foreground">{messages.emptyInboxBody}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border" role="list">
      {conversations.map((c) => {
        const isActive = c.id === activeConversationId;
        const hasUnread = c.unreadCount > 0;
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              prefetch={false}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-3 transition-colors',
                'hover:bg-muted focus-visible:outline-none focus-visible:bg-muted',
                isActive && 'bg-muted',
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
                      {formatShortTime(new Date(c.lastMessageAt))}
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
                    {c.lastMessage?.body ?? ''}
                  </p>
                  {hasUnread && (
                    <span
                      aria-label={`${c.unreadCount} ${messages.unreadLabel}`}
                      className="shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold"
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
  );
}

function formatShortTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (diff < oneDay && date.getDate() === new Date().getDate()) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 7 * oneDay) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
