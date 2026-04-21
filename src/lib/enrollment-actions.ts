'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { requireAuth, requireOwnerOrAdmin } from '@/lib/auth-guards';
import { checkAndAwardBadgesInternal } from '@/lib/badge-actions-internal';

export async function enrollInCourse(courseId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const userId = session.user.id;

  // Verify course exists and is published
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { status: true },
  });

  if (!course) {
    return { error: 'Course not found' };
  }

  if (course.status !== 'PUBLISHED') {
    return { error: 'Cannot enroll in unpublished course' };
  }

  // Check if already enrolled
  const existingEnrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });

  if (existingEnrollment) {
    return { error: 'Already enrolled in this course' };
  }

  // Create enrollment
  await db.enrollment.create({
    data: { userId, courseId },
  });

  // Fire-and-forget: new enrollment may complete the activation funnel (WELCOME badge)
  void checkAndAwardBadgesInternal(userId).catch(() => {});

  revalidatePath('/classroom');
  revalidatePath(`/classroom/courses/${courseId}`);

  return { success: true };
}

export async function unenrollFromCourse(courseId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const userId = session.user.id;

  // Find enrollment
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });

  if (!enrollment) {
    return { error: 'Not enrolled in this course' };
  }

  // Delete enrollment (LessonProgress records preserved per CONTEXT.md)
  await db.enrollment.delete({
    where: { id: enrollment.id },
  });

  revalidatePath('/classroom');
  revalidatePath(`/classroom/courses/${courseId}`);

  return { success: true };
}

export async function getEnrollment(userId: string, courseId: string) {
  await requireOwnerOrAdmin(userId);
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });

  return enrollment;
}

export async function getPublishedCourses() {
  await requireAuth();
  const courses = await db.course.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      modules: {
        select: {
          lessons: {
            where: { status: 'PUBLISHED' },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return courses.map((course) => {
    // Count total published lessons across all modules
    const lessonCount = course.modules.reduce(
      (total, module) => total + module.lessons.length,
      0
    );

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      coverImage: course.coverImage,
      lessonCount,
    };
  });
}

export async function getEnrolledCoursesWithProgress(userId: string) {
  await requireOwnerOrAdmin(userId);
  // Get all enrollments for user with course details
  const enrollments = await db.enrollment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          coverImage: true,
          status: true,
          modules: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              lessons: {
                where: { status: 'PUBLISHED' },
                orderBy: { position: 'asc' },
                select: { id: true },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  // Get all completed lesson IDs for this user
  const completedProgress = await db.lessonProgress.findMany({
    where: { userId },
    select: { lessonId: true },
  });
  const completedLessonIds = new Set(completedProgress.map((p) => p.lessonId));

  // Compute progress for each course
  return enrollments.map((enrollment) => {
    // Flatten all lesson IDs in order
    const allLessonIds: string[] = [];
    for (const courseModule of enrollment.course.modules) {
      for (const lesson of courseModule.lessons) {
        allLessonIds.push(lesson.id);
      }
    }

    const totalLessons = allLessonIds.length;
    const completedLessons = allLessonIds.filter((id) =>
      completedLessonIds.has(id)
    ).length;

    // Find next incomplete lesson
    const nextLessonId = allLessonIds.find((id) => !completedLessonIds.has(id));

    const progressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      courseId: enrollment.course.id,
      title: enrollment.course.title,
      description: enrollment.course.description,
      coverImage: enrollment.course.coverImage,
      status: enrollment.course.status,
      enrolledAt: enrollment.enrolledAt,
      progressPercent,
      completedLessons,
      totalLessons,
      nextLessonId: nextLessonId ?? null,
    };
  });
}
