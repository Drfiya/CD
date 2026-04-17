'use server';

import { revalidatePath } from 'next/cache';
import db from '@/lib/db';
import { courseSchema, courseImageSchema } from '@/lib/validations/course';
import { createAdminClient } from '@/lib/supabase/admin';
import { preTranslateAdminContent } from '@/lib/translation/pretranslate';
import { requireAuth, requireAdmin } from '@/lib/auth-guards';

export async function getCourses() {
  await requireAuth();
  const courses = await db.course.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { modules: true },
      },
    },
  });

  return courses;
}

export async function getCourse(id: string) {
  await requireAuth();
  const course = await db.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { position: 'asc' },
      },
    },
  });

  return course;
}

export async function getCourseWithLessons(id: string) {
  await requireAuth();
  const course = await db.course.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { position: 'asc' },
        include: {
          lessons: {
            orderBy: { position: 'asc' },
          },
        },
      },
    },
  });

  return course;
}

export async function createCourse(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const validatedFields = courseSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    status: formData.get('status') || 'DRAFT',
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { title, description, status } = validatedFields.data;

  const course = await db.course.create({
    data: {
      title,
      description,
      status,
    },
  });

  // Fire-and-forget: eagerly translate into all live languages
  preTranslateAdminContent('course', course.id, { title, description }).catch(() => {});

  revalidatePath('/admin/courses');

  return { success: true, courseId: course.id };
}

export async function updateCourse(courseId: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    return { error: 'Course not found' };
  }

  const validatedFields = courseSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || null,
    status: formData.get('status') || course.status,
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { title, description, status } = validatedFields.data;

  await db.course.update({
    where: { id: courseId },
    data: {
      title,
      description,
      status,
    },
  });

  // Fire-and-forget: eagerly re-translate if title or description changed
  if (title !== course.title || description !== course.description) {
    preTranslateAdminContent('course', courseId, { title, description }).catch(() => {});
  }

  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${courseId}`);

  return { success: true };
}

export async function deleteCourse(courseId: string) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    return { error: 'Course not found' };
  }

  // Cascade deletes modules automatically via schema relation
  await db.course.delete({
    where: { id: courseId },
  });

  revalidatePath('/admin/courses');

  return { success: true };
}

export async function uploadCourseImage(courseId: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    return { error: 'Course not found' };
  }

  const file = formData.get('image');

  if (!(file instanceof File)) {
    return { error: 'No file provided' };
  }

  const validatedFields = courseImageSchema.safeParse({ file });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const supabase = createAdminClient();

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `courses/${courseId}/cover-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('course-images')
    .upload(filename, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage
    .from('course-images')
    .getPublicUrl(filename);

  const publicUrl = urlData.publicUrl;

  await db.course.update({
    where: { id: courseId },
    data: { coverImage: publicUrl },
  });

  revalidatePath('/admin/courses');
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath('/classroom');

  return { success: true, url: publicUrl };
}
