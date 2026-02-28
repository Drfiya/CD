'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { postSchema } from '@/lib/validations/post';
import { awardPoints } from '@/lib/gamification-actions';
import { extractPlainText } from '@/lib/tiptap-utils';
import { detectLanguage, hashContent } from '@/lib/translation';
import type { Prisma } from '@/generated/prisma/client';

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

  await db.post.create({
    data: {
      title,
      content: content as Prisma.InputJsonValue,
      embeds: embeds as Prisma.InputJsonValue,
      gifs: gifs as Prisma.InputJsonValue,
      plainText,
      languageCode,
      contentHash,
      authorId: session.user.id,
      categoryId: categoryId || null,
    },
  });

  // Award points for creating a post
  await awardPoints(session.user.id, 'POST_CREATED');

  revalidatePath('/feed');

  return { success: true };
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

  await db.post.update({
    where: { id: postId },
    data: {
      content: content as Prisma.InputJsonValue,
      embeds: embeds as Prisma.InputJsonValue,
      gifs: gifs as Prisma.InputJsonValue,
      plainText,
      languageCode,
      contentHash,
    },
  });

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
