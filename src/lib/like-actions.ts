'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { awardPoints } from '@/lib/gamification-actions';
import { checkAndAwardBadgesInternal } from '@/lib/badge-actions-internal';
import { touchStreak } from '@/lib/streak-actions-internal';
import { requireAuth } from '@/lib/auth-guards';
import { createActivityNotification } from '@/lib/notification-actions-internal';

export async function togglePostLike(postId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const userId = session.user.id;

  // Check if like already exists using compound unique constraint
  const existingLike = await db.postLike.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  let leveledUp: number | null = null;

  if (existingLike) {
    // Unlike: remove the like (no point deduction per CONTEXT.md)
    await db.postLike.delete({ where: { id: existingLike.id } });
  } else {
    // Like: create new like and award points to post author
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    await db.postLike.create({ data: { userId, postId } });

    // Update the liker's own streak — fire-and-forget (no toast surface here)
    void touchStreak(userId).catch(() => {});

    if (post) {
      const gamResult = await awardPoints(post.authorId, 'LIKE_RECEIVED');
      leveledUp = gamResult.leveledUp;

      // Badge check for post author (may unlock POPULAR, LEVEL_5, TOP_10)
      // Fire-and-forget: author isn't present to see a toast, so no need to await
      void checkAndAwardBadgesInternal(post.authorId).catch(() => {});

      // Notify post author — no self-notify, deduplicate per actor+post
      if (post.authorId !== userId) {
        const existing = await db.notification.findFirst({
          where: { type: 'LIKE', recipientId: post.authorId, actorId: userId, postId },
        });
        if (!existing) {
          const actor = await db.user.findUnique({
            where: { id: userId },
            select: { name: true },
          });
          await createActivityNotification({
            type: 'LIKE',
            recipientId: post.authorId,
            actorId: userId,
            actorName: actor?.name ?? null,
            postId,
          });
        }
      }
    }
  }

  revalidatePath('/feed');
  revalidatePath(`/feed/${postId}`);

  return { success: true, liked: !existingLike, leveledUp };
}

export async function toggleCommentLike(commentId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const userId = session.user.id;

  // Get comment to find postId for revalidation and authorId for points
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { postId: true, authorId: true },
  });

  if (!comment) {
    return { error: 'Comment not found' };
  }

  // Check if like already exists using compound unique constraint
  const existingLike = await db.commentLike.findUnique({
    where: {
      userId_commentId: { userId, commentId },
    },
  });

  let leveledUp: number | null = null;

  if (existingLike) {
    // Unlike: remove the like (no point deduction per CONTEXT.md)
    await db.commentLike.delete({ where: { id: existingLike.id } });
  } else {
    // Like: create new like and award points to comment author
    await db.commentLike.create({ data: { userId, commentId } });

    // Update the liker's own streak — fire-and-forget (no toast surface here)
    void touchStreak(userId).catch(() => {});

    const gamResult = await awardPoints(comment.authorId, 'LIKE_RECEIVED');
    leveledUp = gamResult.leveledUp;

    // Badge check for comment author (fire-and-forget — author not present)
    void checkAndAwardBadgesInternal(comment.authorId).catch(() => {});
  }

  revalidatePath(`/feed/${comment.postId}`);

  return { success: true, liked: !existingLike, leveledUp };
}

export async function getPostLikers(postId: string) {
  await requireAuth();
  const likes = await db.postLike.findMany({
    where: { postId },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return likes.map((like) => like.user);
}

export async function getCommentLikers(commentId: string) {
  await requireAuth();
  const likes = await db.commentLike.findMany({
    where: { commentId },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return likes.map((like) => like.user);
}
