'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { awardPoints } from '@/lib/gamification-actions';
import { checkAndAwardBadges } from '@/lib/badge-actions';
import { touchStreak } from '@/lib/streak-actions-internal';
import { requireOwnerOrAdmin } from '@/lib/auth-guards';

export async function toggleLessonComplete(lessonId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const userId = session.user.id;

  // Get lesson with module.courseId for revalidation and security checks
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        select: { courseId: true },
      },
    },
  });

  if (!lesson) {
    return { error: 'Lesson not found' };
  }

  if (lesson.status !== 'PUBLISHED') {
    return { error: 'Cannot mark unpublished lesson as complete' };
  }

  const courseId = lesson.module.courseId;

  // Verify user is enrolled in the course (security check)
  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });

  if (!enrollment) {
    return { error: 'Not enrolled in this course' };
  }

  // Check if LessonProgress exists
  const existingProgress = await db.lessonProgress.findUnique({
    where: {
      userId_lessonId: { userId, lessonId },
    },
  });

  let newBadges: Awaited<ReturnType<typeof checkAndAwardBadges>> = [];
  let streakMilestone: number | null = null;
  let streakSaved: number | null = null;

  if (existingProgress) {
    // Uncomplete: delete progress (no point deduction per CONTEXT.md)
    await db.lessonProgress.delete({
      where: { id: existingProgress.id },
    });
  } else {
    // Complete: create progress and award points
    await db.lessonProgress.create({
      data: { userId, lessonId },
    });

    // Award points for completing a lesson
    await awardPoints(userId, 'LESSON_COMPLETED');

    // Update activity streak BEFORE badge check so STREAK_7 can be awarded now
    const streak = await touchStreak(userId);
    streakMilestone = streak.milestone;
    streakSaved = streak.streakSaved;

    // Check for newly-earned badges (errors silently swallowed — non-blocking UX)
    newBadges = await checkAndAwardBadges(userId).catch(() => []);
  }

  revalidatePath(`/classroom/courses/${courseId}`);

  return { success: true, completed: !existingProgress, newBadges, streakMilestone, streakSaved };
}

export async function getCompletedLessonIds(userId: string, courseId: string) {
  await requireOwnerOrAdmin(userId);
  // Get all lessons in course through modules
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        include: {
          lessons: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) {
    return [];
  }

  // Collect all lesson IDs in this course
  const lessonIds: string[] = [];
  for (const courseModule of course.modules) {
    for (const lesson of courseModule.lessons) {
      lessonIds.push(lesson.id);
    }
  }

  // Get LessonProgress records for user where lessonId in those IDs
  const progress = await db.lessonProgress.findMany({
    where: {
      userId,
      lessonId: { in: lessonIds },
    },
    select: { lessonId: true },
  });

  return progress.map((p) => p.lessonId);
}

export async function getNextIncompleteLesson(userId: string, courseId: string) {
  await requireOwnerOrAdmin(userId);
  // Get course with modules and lessons ordered by position
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { position: 'asc' },
        include: {
          lessons: {
            where: { status: 'PUBLISHED' },
            orderBy: { position: 'asc' },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!course) {
    return null;
  }

  // Get completed lesson IDs for user
  const completedIds = new Set(await getCompletedLessonIds(userId, courseId));

  // Flatten to ordered array of lessons and find first incomplete
  for (const courseModule of course.modules) {
    for (const lesson of courseModule.lessons) {
      if (!completedIds.has(lesson.id)) {
        return { lessonId: lesson.id, moduleId: courseModule.id };
      }
    }
  }

  // All lessons complete
  return null;
}
