'use server';

import { revalidatePath } from 'next/cache';
import db from '@/lib/db';
import { lessonSchema, updateLessonSchema } from '@/lib/validations/lesson';
import { createClient } from '@/lib/supabase/server';
import type { Prisma } from '@/generated/prisma/client';
import { requireAuth, requireAdmin } from '@/lib/auth-guards';

export async function getLesson(id: string) {
  await requireAuth();
  const lesson = await db.lesson.findUnique({
    where: { id },
    include: {
      attachments: {
        orderBy: { createdAt: 'asc' },
      },
      module: {
        include: {
          course: true,
        },
      },
    },
  });

  return lesson;
}

export async function getLessonsForModule(moduleId: string) {
  await requireAuth();
  const lessons = await db.lesson.findMany({
    where: { moduleId },
    orderBy: { position: 'asc' },
  });

  return lessons;
}

export async function createLesson(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const validatedFields = lessonSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    videoUrl: formData.get('videoUrl') || '',
    status: formData.get('status') || 'DRAFT',
    moduleId: formData.get('moduleId'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { title, content, videoUrl, status, moduleId } = validatedFields.data;

  // Verify module exists
  const courseModule = await db.module.findUnique({
    where: { id: moduleId },
    select: { courseId: true },
  });

  if (!courseModule) {
    return { error: 'Module not found' };
  }

  // Get next position (max position + 1, or 0 if no lessons)
  const lastLesson = await db.lesson.findFirst({
    where: { moduleId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const nextPosition = lastLesson ? lastLesson.position + 1 : 0;

  const lesson = await db.lesson.create({
    data: {
      title,
      content: content as unknown as Prisma.InputJsonValue,
      videoUrl: videoUrl || null,
      status,
      moduleId,
      position: nextPosition,
    },
  });

  revalidatePath(`/admin/courses/${courseModule.courseId}`);

  return { success: true, lessonId: lesson.id };
}

export async function updateLesson(lessonId: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  });

  if (!lesson) {
    return { error: 'Lesson not found' };
  }

  const validatedFields = updateLessonSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    videoUrl: formData.get('videoUrl') || '',
    status: formData.get('status') || lesson.status,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { title, content, videoUrl, status } = validatedFields.data;

  await db.lesson.update({
    where: { id: lessonId },
    data: {
      title,
      content: content as unknown as Prisma.InputJsonValue,
      videoUrl: videoUrl || null,
      status,
    },
  });

  revalidatePath(`/admin/courses/${lesson.module.courseId}`);
  revalidatePath(`/admin/courses/${lesson.module.courseId}/lessons/${lessonId}`);

  return { success: true };
}

export async function deleteLesson(lessonId: string) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: true,
      attachments: true,
    },
  });

  if (!lesson) {
    return { error: 'Lesson not found' };
  }

  // Delete attachments from Supabase Storage
  if (lesson.attachments.length > 0) {
    const supabase = await createClient();

    // Extract storage paths from URLs
    const paths = lesson.attachments
      .map((att) => {
        // URL format: https://<project>.supabase.co/storage/v1/object/public/attachments/lessons/<lessonId>/<filename>
        const match = att.url.match(/\/attachments\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter((p): p is string => p !== null);

    if (paths.length > 0) {
      await supabase.storage.from('attachments').remove(paths);
    }
  }

  // Delete lesson - cascade will remove attachment records
  await db.lesson.delete({
    where: { id: lessonId },
  });

  revalidatePath(`/admin/courses/${lesson.module.courseId}`);

  return { success: true };
}

/**
 * Reorder lessons within a module.
 * Updates positions based on the order of IDs provided.
 */
export async function reorderLessons(moduleId: string, orderedIds: string[]) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  // Note: Lesson model added in 06-02. If not present yet, this will fail at runtime.
  // This is expected - there are no lessons to reorder until 06-02 runs.
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.lesson.update({
        where: { id },
        data: { position: index },
      })
    )
  );

  // Get courseId for revalidation
  const mod = await db.module.findUnique({
    where: { id: moduleId },
    select: { courseId: true },
  });

  if (mod) {
    revalidatePath(`/admin/courses/${mod.courseId}`);
  }

  return { success: true };
}

/**
 * Move a lesson from one module to another.
 * Updates the lesson's moduleId and position, and shifts other lessons.
 */
export async function moveLessonToModule(
  lessonId: string,
  targetModuleId: string,
  newPosition: number
) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  // Note: Lesson model added in 06-02. If not present yet, this will fail at runtime.
  // Get lesson's current module for revalidation
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { moduleId: true, module: { select: { courseId: true } } },
  });

  if (!lesson) {
    return { error: 'Lesson not found' };
  }

  await db.$transaction([
    // Update lesson's module and position
    db.lesson.update({
      where: { id: lessonId },
      data: {
        moduleId: targetModuleId,
        position: newPosition,
      },
    }),
    // Shift positions in target module to make room
    db.lesson.updateMany({
      where: {
        moduleId: targetModuleId,
        position: { gte: newPosition },
        id: { not: lessonId },
      },
      data: { position: { increment: 1 } },
    }),
  ]);

  revalidatePath(`/admin/courses/${lesson.module.courseId}`);

  return { success: true };
}
