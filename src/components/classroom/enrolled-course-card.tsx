import Link from 'next/link';
import Image from 'next/image';
import { ProgressBar } from './progress-bar';

export interface EnrolledCourse {
  id: string;
  title: string;
  description: string | null;
  coverImage?: string | null;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  nextLessonId: string | null;
}

interface EnrolledCardUI {
  lessons: string;
  completed: string;
  continueLearning: string;
  startCourse: string;
}

interface EnrolledCourseCardProps {
  course: EnrolledCourse;
  ui: EnrolledCardUI;
}

export function EnrolledCourseCard({ course, ui }: EnrolledCourseCardProps) {
  const isComplete = course.progressPercent === 100;

  const linkHref = !isComplete && course.nextLessonId
    ? `/classroom/courses/${course.id}/lessons/${course.nextLessonId}`
    : `/classroom/courses/${course.id}`;

  return (
    <Link
      href={linkHref}
      className="block bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden hover:shadow-md dark:hover:border-neutral-600 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{ '--tw-ring-color': '#D94A4A' } as React.CSSProperties}
    >
      {/* Thumbnail */}
      <div className="relative w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden">
        {course.coverImage && (
          <Image
            src={course.coverImage}
            alt={course.title}
            fill
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {/* Progress overlay badge */}
        <div className="absolute top-3 right-3">
          {isComplete ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
              {ui.completed}
            </span>
          ) : (
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: '#D94A4A' }}
            >
              {course.progressPercent}%
            </span>
          )}
        </div>
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-neutral-100 truncate group-hover:text-[#D94A4A] transition-colors">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-sm text-gray-500 dark:text-neutral-400 line-clamp-2">
            {course.description}
          </p>
        )}

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-neutral-400">
            <span>
              {course.completedLessons}/{course.totalLessons} {ui.lessons}
            </span>
          </div>
          <ProgressBar value={course.progressPercent} />
        </div>

        {/* Action label */}
        <div
          className="text-sm font-semibold text-center py-2 rounded-lg transition-colors"
          style={{ color: '#D94A4A' }}
        >
          {isComplete
            ? '✓ ' + ui.completed
            : course.nextLessonId
              ? ui.continueLearning + ' →'
              : ui.startCourse + ' →'}
        </div>
      </div>
    </Link>
  );
}
