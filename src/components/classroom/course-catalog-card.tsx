import Link from 'next/link';
import Image from 'next/image';

export interface CatalogCourse {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  lessonCount: number;
}

interface CatalogCardUI {
  lessons: string;
  lesson: string;
  viewCourse: string;
}

interface CourseCatalogCardProps {
  course: CatalogCourse;
  ui: CatalogCardUI;
}

export function CourseCatalogCard({ course, ui }: CourseCatalogCardProps) {
  return (
    <Link
      href={`/classroom/courses/${course.id}`}
      className="block bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden hover:shadow-md dark:hover:border-neutral-600 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{ '--tw-ring-color': '#D94A4A' } as React.CSSProperties}
    >
      {/* Cover Image */}
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
        {/* Lesson count badge */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-black/50 backdrop-blur-sm text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M10.75 16.82A7.462 7.462 0 0 1 15 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0 0 18 15.06V4.94a.75.75 0 0 0-.546-.721A9.006 9.006 0 0 0 15 3.75a9.006 9.006 0 0 0-4.25 1.065v12.005ZM9.25 4.815A9.006 9.006 0 0 0 5 3.75a9.006 9.006 0 0 0-2.454.469A.75.75 0 0 0 2 4.94v10.12a.75.75 0 0 0 .954.721A7.462 7.462 0 0 1 5 15.5a7.462 7.462 0 0 1 4.25 1.32V4.815Z" />
            </svg>
            {course.lessonCount} {course.lessonCount === 1 ? ui.lesson : ui.lessons}
          </span>
        </div>
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-gray-900 dark:text-neutral-100 truncate group-hover:text-[#D94A4A] transition-colors">
          {course.title}
        </h3>
        {course.description && (
          <p className="text-sm text-gray-500 dark:text-neutral-400 line-clamp-2">
            {course.description}
          </p>
        )}
        <div
          className="text-sm font-semibold pt-1 transition-colors"
          style={{ color: '#D94A4A' }}
        >
          {ui.viewCourse}
        </div>
      </div>
    </Link>
  );
}
