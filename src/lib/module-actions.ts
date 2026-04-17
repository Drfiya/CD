'use server';

import { revalidatePath } from 'next/cache';
import db from '@/lib/db';
import { moduleSchema } from '@/lib/validations/course';
import { requireAdmin } from '@/lib/auth-guards';

export async function createModule(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const validatedFields = moduleSchema.safeParse({
    title: formData.get('title'),
    courseId: formData.get('courseId'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { title, courseId } = validatedFields.data;

  // Verify course exists
  const course = await db.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    return { error: 'Course not found' };
  }

  // Get next position (max position + 1, or 0 if no modules)
  const lastModule = await db.module.findFirst({
    where: { courseId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const nextPosition = lastModule ? lastModule.position + 1 : 0;

  await db.module.create({
    data: {
      title,
      courseId,
      position: nextPosition,
    },
  });

  revalidatePath(`/admin/courses/${courseId}`);

  return { success: true };
}

export async function updateModule(moduleId: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const courseModule = await db.module.findUnique({
    where: { id: moduleId },
    select: { courseId: true },
  });

  if (!courseModule) {
    return { error: 'Module not found' };
  }

  const title = formData.get('title');

  if (typeof title !== 'string' || title.trim().length < 3) {
    return { error: 'Title must be at least 3 characters' };
  }

  if (title.trim().length > 100) {
    return { error: 'Title must be under 100 characters' };
  }

  await db.module.update({
    where: { id: moduleId },
    data: {
      title: title.trim(),
    },
  });

  revalidatePath(`/admin/courses/${courseModule.courseId}`);

  return { success: true };
}

export async function deleteModule(moduleId: string) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const courseModule = await db.module.findUnique({
    where: { id: moduleId },
    select: { courseId: true },
  });

  if (!courseModule) {
    return { error: 'Module not found' };
  }

  // Delete module - do NOT recompact positions (sparse positions OK)
  await db.module.delete({
    where: { id: moduleId },
  });

  revalidatePath(`/admin/courses/${courseModule.courseId}`);

  return { success: true };
}

export async function reorderModules(courseId: string, orderedIds: string[]) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  // Use transaction to prevent race conditions
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.module.update({
        where: { id },
        data: { position: index },
      })
    )
  );

  revalidatePath(`/admin/courses/${courseId}`);

  return { success: true };
}
