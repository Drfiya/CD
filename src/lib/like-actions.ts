'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { awardPoints } from '@/lib/gamification-actions';
import { requireAuth } from '@/lib/auth-guards';

export async function togglePostLike(postId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const userId = session.user.id;

  // Check if like already exists using compound unique constraint
  const existingLike = await db.postLike.findUnique({
    where: {
      userId_postId: { userId, postId },
    },
  });

  if (existingLike) {
    // Unlike: remove the like (no point deduction per CONTEXT.md)
    await db.postLike.delete({
      where: { id: existingLike.id },
    });
  } else {
    // Like: create new like and award points to post author
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    await db.postLike.create({
      data: { userId, postId },
    });

    // Award points to post author (not the liker)
    if (post) {
      await awardPoints(post.authorId, 'LIKE_RECEIVED');
    }
  }

  revalidatePath('/feed');
  revalidatePath(`/feed/${postId}`);

  return { success: true, liked: !existingLike };
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

  if (existingLike) {
    // Unlike: remove the like (no point deduction per CONTEXT.md)
    await db.commentLike.delete({
      where: { id: existingLike.id },
    });
  } else {
    // Like: create new like and award points to comment author
    await db.commentLike.create({
      data: { userId, commentId },
    });

    // Award points to comment author (not the liker)
    await awardPoints(comment.authorId, 'LIKE_RECEIVED');
  }

  revalidatePath(`/feed/${comment.postId}`);

  return { success: true, liked: !existingLike };
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
