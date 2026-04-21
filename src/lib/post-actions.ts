'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { postSchema } from '@/lib/validations/post';
import { awardPoints } from '@/lib/gamification-actions';
import { checkAndAwardBadges } from '@/lib/badge-actions';
import { extractPlainText } from '@/lib/tiptap-utils';
import { detectLanguage, hashContent } from '@/lib/translation';
import { generateAllGifThumbnails, enrichEmbedsWithThumbnails } from '@/lib/thumbnail-actions';
import type { Prisma } from '@/generated/prisma/client';
import type { VideoEmbed } from '@/types/post';
import { preTranslatePost } from '@/lib/translation/pretranslate';
import { extractMentions } from '@/lib/mentions';
import { createActivityNotification } from '@/lib/notification-actions-internal';
import { touchStreak } from '@/lib/streak-actions-internal';

export async function createPost(formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const validatedFields = postSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    embeds: formData.get('embeds'),
    gifs: formData.get('gifs'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { title, content, embeds, gifs } = validatedFields.data;
  const categoryId = formData.get('categoryId') as string | null;

  // Extract plain text for full-text search indexing
  const plainText = extractPlainText(content);

  // Detect language and hash content for translation support
  const languageCode = await detectLanguage(plainText || '');
  const contentHash = hashContent(plainText || '');

  // Generate thumbnails for GIFs and video embeds (server-side)
  const gifUrls = (gifs as string[]) || [];
  const videoEmbeds = (embeds as unknown as VideoEmbed[]) || [];
  const [gifThumbnails, enrichedEmbeds] = await Promise.all([
    generateAllGifThumbnails(gifUrls),
    enrichEmbedsWithThumbnails(videoEmbeds),
  ]);

  const newPost = await db.post.create({
    data: {
      title,
      content: content as Prisma.InputJsonValue,
      embeds: enrichedEmbeds as unknown as Prisma.InputJsonValue,
      gifs: gifs as Prisma.InputJsonValue,
      gifThumbnails: gifThumbnails as unknown as Prisma.InputJsonValue,
      plainText,
      languageCode,
      contentHash,
      authorId: session.user.id,
      categoryId: categoryId || null,
    },
  });

  // Award points for creating a post
  await awardPoints(session.user.id, 'POST_CREATED');

  // Update activity streak BEFORE badge check so STREAK_7 can be awarded in the
  // same pass. Awaited (not fire-and-forget) because we want the milestone
  // value for the success response toast.
  const streak = await touchStreak(session.user.id);

  // Check for newly-earned badges (errors silently swallowed — non-blocking UX)
  const newBadges = await checkAndAwardBadges(session.user.id).catch(() => []);

  // Fire-and-forget: eagerly pre-translate into the other 2 live languages
  preTranslatePost(newPost.id, title, plainText, languageCode).catch(() => {});

  // MENTION notifications from title + plain body — fire-and-forget, hard-capped at 20
  const mentionNames = extractMentions(`${title ?? ''} ${plainText ?? ''}`, 20);
  if (mentionNames.length > 0) {
    const actorName = session.user.name ?? null;
    const mentionedUsers = await db.user.findMany({
      where: { name: { in: mentionNames } },
      select: { id: true },
    });
    for (const u of mentionedUsers) {
      if (u.id === session.user.id) continue; // no self-notify
      void createActivityNotification({
        type: 'MENTION',
        recipientId: u.id,
        actorId: session.user.id,
        actorName,
        postId: newPost.id,
        commentId: null,
      });
    }
  }

  revalidatePath('/feed');

  return {
    success: true,
    newBadges,
    streakMilestone: streak.milestone,
    streakSaved: streak.streakSaved,
  };
}

export async function updatePost(postId: string, formData: FormData) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  // Fetch post and verify ownership
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) {
    return { error: 'Post not found' };
  }

  if (post.authorId !== session.user.id) {
    return { error: 'Not authorized' };
  }

  const validatedFields = postSchema.safeParse({
    content: formData.get('content'),
    embeds: formData.get('embeds'),
    gifs: formData.get('gifs'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { content, embeds, gifs } = validatedFields.data;

  // Extract plain text for full-text search indexing
  const plainText = extractPlainText(content);

  // Detect language and hash content for translation support
  const languageCode = await detectLanguage(plainText || '');
  const contentHash = hashContent(plainText || '');

  // Generate thumbnails for GIFs and video embeds (server-side)
  const gifUrls = (gifs as string[]) || [];
  const videoEmbeds = (embeds as unknown as VideoEmbed[]) || [];
  const [gifThumbnails, enrichedEmbeds] = await Promise.all([
    generateAllGifThumbnails(gifUrls),
    enrichEmbedsWithThumbnails(videoEmbeds),
  ]);

  await db.post.update({
    where: { id: postId },
    data: {
      content: content as Prisma.InputJsonValue,
      embeds: enrichedEmbeds as unknown as Prisma.InputJsonValue,
      gifs: gifs as Prisma.InputJsonValue,
      gifThumbnails: gifThumbnails as unknown as Prisma.InputJsonValue,
      plainText,
      languageCode,
      contentHash,
    },
  });

  // Fire-and-forget: eagerly pre-translate changed content
  preTranslatePost(postId, null, plainText, languageCode).catch(() => {});

  revalidatePath('/feed');
  revalidatePath(`/feed/${postId}`);

  return { success: true };
}

export async function deletePost(postId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  // Fetch post and verify ownership
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) {
    return { error: 'Post not found' };
  }

  if (post.authorId !== session.user.id) {
    return { error: 'Not authorized' };
  }

  await db.post.delete({
    where: { id: postId },
  });

  revalidatePath('/feed');

  return { success: true };
}
