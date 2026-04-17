'use client';

import Link from 'next/link';
import { UGCText } from '@/components/translation/UGCText';

interface CurriculumSidebarProps {
  courseId: string;
  courseTitle: string;
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      status: 'DRAFT' | 'PUBLISHED';
    }>;
  }>;
  completedLessonIds: string[];
  isEnrolled: boolean;
  currentLessonId?: string;
}

export function CurriculumSidebar({
  courseId,
  courseTitle,
  modules,
  completedLessonIds,
  isEnrolled,
  currentLessonId,
}: CurriculumSidebarProps) {
  const completedSet = new Set(completedLessonIds);

  return (
    <aside className="w-72 flex-shrink-0 border-r bg-gray-50/50 overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Back to classroom link */}
        <Link
          href="/classroom"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          All Courses
        </Link>

        {/* Course title */}
        <div>
          <h2 className="font-semibold text-lg truncate" title={courseTitle}>
            {courseTitle}
          </h2>
        </div>

        {/* Curriculum */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Curriculum</h3>

          {!isEnrolled && (
            <p className="text-sm text-muted-foreground mb-4 p-2 bg-amber-50 border border-amber-200 rounded">
              Enroll to access lessons
            </p>
          )}

          <div className="space-y-4">
            {modules.map((module) => {
              // Filter to only show published lessons to students
              const publishedLessons = module.lessons.filter(
                (lesson) => lesson.status === 'PUBLISHED'
              );

              if (publishedLessons.length === 0) {
                return null;
              }

              return (
                <div key={module.id}>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    {module.title}
                  </h4>
                  <ul className="space-y-1">
                    {publishedLessons.map((lesson) => {
                      const isCompleted = completedSet.has(lesson.id);
                      const isCurrent = currentLessonId === lesson.id;

                      if (!isEnrolled) {
                        // Show lesson titles but not clickable
                        return (
                          <li
                            key={lesson.id}
                            className="flex items-center gap-2 py-1.5 px-2 text-sm text-gray-400"
                          >
                            <span className="w-4 h-4 flex-shrink-0" />
                            <UGCText as="span" className="truncate">{lesson.title}</UGCText>
                          </li>
                        );
                      }

                      return (
                        <li key={lesson.id}>
                          <Link
                            href={`/classroom/courses/${courseId}/lessons/${lesson.id}`}
                            className={`flex items-center gap-2 py-1.5 px-2 rounded text-sm transition-colors ${
                              isCurrent
                                ? 'bg-blue-100 text-blue-900 font-semibold'
                                : isCompleted
                                ? 'text-green-700 hover:bg-gray-100'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {isCompleted ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-4 h-4 text-green-600 flex-shrink-0"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <span className="w-4 h-4 flex-shrink-0 rounded-full border-2 border-gray-300" />
                            )}
                            <UGCText as="span" className="truncate">{lesson.title}</UGCText>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {modules.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No content available yet.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
