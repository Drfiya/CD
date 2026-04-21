'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import type { NotificationActor, NotificationItem, NotificationType } from '@/types/notifications';

const GROUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function getNotifications(): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { notifications: [], unreadCount: 0 };

  try {
    const [rows, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { recipientId: session.user.id },
        orderBy: { createdAt: 'desc' },
        // Widened from 20 → 50 so grouping has enough raw data to collapse.
        take: 50,
        include: {
          actor: { select: { id: true, name: true, image: true } },
        },
      }),
      // Unread badge shows INDIVIDUAL unread count, not collapsed-group count.
      db.notification.count({
        where: { recipientId: session.user.id, isRead: false },
      }),
    ]);

    type GroupAcc = {
      representativeId: string;
      ids: string[];
      type: NotificationType;
      postId: string | null;
      commentId: string | null;
      primaryActor: NotificationActor;
      additionalActors: NotificationActor[];
      seenActorIds: Set<string>;
      latestCreatedAt: Date;
      allRead: boolean;
    };

    const groups = new Map<string, GroupAcc>();

    for (const n of rows) {
      const type = n.type as NotificationType;
      const actor: NotificationActor = {
        id: n.actor.id,
        name: n.actor.name,
        image: n.actor.image,
      };

      // MENTION never collapses — one group per notification.
      // LIKE/COMMENT collapse by (type, postId, 10-min bucket).
      const bucket =
        type === 'MENTION'
          ? n.id
          : `${type}:${n.postId ?? 'null'}:${Math.floor(
              n.createdAt.getTime() / GROUP_WINDOW_MS
            )}`;

      const existing = groups.get(bucket);
      if (!existing) {
        groups.set(bucket, {
          representativeId: n.id,
          ids: [n.id],
          type,
          postId: n.postId,
          commentId: n.commentId,
          primaryActor: actor,
          additionalActors: [],
          seenActorIds: new Set([actor.id]),
          latestCreatedAt: n.createdAt,
          allRead: n.isRead,
        });
        continue;
      }

      existing.ids.push(n.id);
      existing.allRead = existing.allRead && n.isRead;
      if (n.createdAt > existing.latestCreatedAt) {
        existing.latestCreatedAt = n.createdAt;
      }
      // Dedup actors: only add if we haven't seen this actorId yet.
      if (!existing.seenActorIds.has(actor.id)) {
        existing.seenActorIds.add(actor.id);
        existing.additionalActors.push(actor);
      }
    }

    const notifications: NotificationItem[] = Array.from(groups.values())
      .sort((a, b) => b.latestCreatedAt.getTime() - a.latestCreatedAt.getTime())
      .map((g) => ({
        id: g.representativeId,
        type: g.type,
        actorId: g.primaryActor.id,
        actorName: g.primaryActor.name,
        actorImage: g.primaryActor.image,
        postId: g.postId,
        commentId: g.commentId,
        isRead: g.allRead,
        createdAt: g.latestCreatedAt,
        ids: g.ids,
        groupSize: g.ids.length,
        additionalActors: g.additionalActors,
      }));

    return { notifications, unreadCount };
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationRead(notificationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  try {
    await db.notification.updateMany({
      where: { id: notificationId, recipientId: session.user.id },
      data: { isRead: true },
    });
  } catch {
    // Fail silently — UI already updated optimistically
  }
}

export async function markGroupRead(notificationIds: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) return;

  try {
    await db.notification.updateMany({
      where: { id: { in: notificationIds }, recipientId: session.user.id },
      data: { isRead: true },
    });
  } catch {
    // Fail silently — UI already updated optimistically
  }
}

export async function markAllNotificationsRead() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  try {
    await db.notification.updateMany({
      where: { recipientId: session.user.id, isRead: false },
      data: { isRead: true },
    });
  } catch {
    // Fail silently — UI already updated optimistically
  }
}
