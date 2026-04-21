'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { commentSchema } from '@/lib/validations/comment';
import { awardPoints } from '@/lib/gamification-actions';
import { checkAndAwardBadges } from '@/lib/badge-actions';
import { detectLanguage, hashContent } from '@/lib/translation';
import { createActivityNotification } from '@/lib/notification-actions-internal';
import { extractMentions } from '@/lib/mentions';
import { touchStreak } from '@/lib/streak-actions-internal';

export async function createComment(
  postId: string,
  content: string,
  parentId?: string | null
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const validatedFields = commentSchema.safeParse({ content });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  // Verify post exists and get authorId for notification
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    return { error: 'Post not found' };
  }

  // If replying, verify parent comment belongs to this post and is a top-level comment
  if (parentId) {
    const parent = await db.comment.findUnique({
      where: { id: parentId },
      select: { postId: true, parentId: true, authorId: true },
    });
    if (!parent || parent.postId !== postId || parent.parentId !== null) {
      return { error: 'Invalid parent comment' };
    }
  }

  // Detect language and hash content for translation support
  const commentContent = validatedFields.data.content;
  const languageCode = await detectLanguage(commentContent);
  const contentHash = hashContent(commentContent);

  const comment = await db.comment.create({
    data: {
      content: commentContent,
      languageCode,
      contentHash,
      authorId: session.user.id,
      postId,
      ...(parentId ? { parentId } : {}),
    },
  });

  // Award points for creating a comment
  const { leveledUp } = await awardPoints(session.user.id, 'COMMENT_CREATED');

  // Update activity streak BEFORE badge check so STREAK_7 can be awarded in the
  // same pass. Awaited so the client gets a milestone toast payload.
  const streak = await touchStreak(session.user.id);

  // Check for newly-earned badges (errors silently swallowed — non-blocking UX)
  const newBadges = await checkAndAwardBadges(session.user.id).catch(() => []);

  // Notify the relevant author — no self-notify
  if (parentId) {
    // Reply: notify parent comment author
    const parent = await db.comment.findUnique({
      where: { id: parentId },
      select: { authorId: true, author: { select: { name: true } } },
    });
    const actorName = session.user.name ?? null;
    if (parent && parent.authorId !== session.user.id) {
      await createActivityNotification({
        type: 'COMMENT',
        recipientId: parent.authorId,
        actorId: session.user.id,
        actorName,
        postId,
        commentId: comment.id,
      });
    }
  } else if (post.authorId !== session.user.id) {
    // Top-level: notify post author
    const actorName = session.user.name ?? null;
    await createActivityNotification({
      type: 'COMMENT',
      recipientId: post.authorId,
      actorId: session.user.id,
      actorName,
      postId,
      commentId: comment.id,
    });
  }

  // MENTION notifications — fire-and-forget, hard-capped at 20 handles per message
  const mentionNames = extractMentions(commentContent, 20);
  if (mentionNames.length > 0) {
    const actorName = session.user.name ?? null;
    // Don't double-notify the recipient of the comment notification (post author
    // or parent comment author, already emailed above), and don't self-notify.
    const alreadyNotified = new Set<string>([session.user.id]);
    if (parentId) {
      const parent = await db.comment.findUnique({
        where: { id: parentId },
        select: { authorId: true },
      });
      if (parent) alreadyNotified.add(parent.authorId);
    } else {
      alreadyNotified.add(post.authorId);
    }

    const mentionedUsers = await db.user.findMany({
      where: { name: { in: mentionNames } },
      select: { id: true },
    });

    for (const u of mentionedUsers) {
      if (alreadyNotified.has(u.id)) continue;
      alreadyNotified.add(u.id);
      void createActivityNotification({
        type: 'MENTION',
        recipientId: u.id,
        actorId: session.user.id,
        actorName,
        postId,
        commentId: comment.id,
      });
    }
  }

  revalidatePath(`/feed/${postId}`);

  return {
    success: true,
    leveledUp: leveledUp ?? null,
    newBadges,
    streakMilestone: streak.milestone,
    streakSaved: streak.streakSaved,
  };
}

export async function updateComment(commentId: string, content: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  // Fetch comment and verify ownership
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, postId: true },
  });

  if (!comment) {
    return { error: 'Comment not found' };
  }

  if (comment.authorId !== session.user.id) {
    return { error: 'Not authorized' };
  }

  const validatedFields = commentSchema.safeParse({ content });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  await db.comment.update({
    where: { id: commentId },
    data: {
      content: validatedFields.data.content,
    },
  });

  revalidatePath(`/feed/${comment.postId}`);

  return { success: true };
}

export async function deleteComment(commentId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  // Fetch comment and verify ownership
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, postId: true },
  });

  if (!comment) {
    return { error: 'Comment not found' };
  }

  if (comment.authorId !== session.user.id) {
    return { error: 'Not authorized' };
  }

  await db.comment.delete({
    where: { id: commentId },
  });

  revalidatePath(`/feed/${comment.postId}`);

  return { success: true };
}
