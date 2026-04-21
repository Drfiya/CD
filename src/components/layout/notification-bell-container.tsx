'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { NotificationBell } from './notification-bell';
import { getNotifications, markGroupRead, markAllNotificationsRead } from '@/lib/notification-actions';
import { createClient } from '@/lib/supabase/client';
import type { NotificationItem } from '@/types/notifications';

const POLL_INTERVAL_MS = 60_000;

export function NotificationBellContainer() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!userId) return;

    let active = true;

    async function load() {
      const result = await getNotifications();
      if (active) {
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      }
    }

    void load();

    // Primary: Supabase Realtime — instant delivery on new notifications
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `recipientId=eq.${userId}`,
        },
        () => { void load(); }
      )
      .subscribe();

    // Heartbeat fallback: 60s poll catches any Realtime gaps
    const interval = setInterval(() => { void load(); }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  function handleMarkRead(item: NotificationItem) {
    const ids = item.ids?.length ? item.ids : [item.id];
    const wasUnread = !item.isRead;
    setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    // Group shows as unread if ANY member was unread; optimistic decrement by groupSize
    // may slightly over-count if some members were already read. The next 60s poll
    // (or Realtime reload) reconciles from server-side COUNT.
    setUnreadCount((prev) => Math.max(0, prev - (wasUnread ? (item.groupSize || 1) : 0)));

    startTransition(async () => {
      await markGroupRead(ids);
    });
  }

  function handleMarkAllRead() {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  return (
    <NotificationBell
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkRead={handleMarkRead}
      onMarkAllRead={handleMarkAllRead}
    />
  );
}
