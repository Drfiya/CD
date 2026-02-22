import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
}

interface CourseCatalogCardProps {
  course: CatalogCourse;
  ui: CatalogCardUI;
}

export function CourseCatalogCard({ course, ui }: CourseCatalogCardProps) {
  return (
    <Link
      href={`/classroom/courses/${course.id}`}
      className={cn(
        'block border border-border rounded-lg overflow-hidden',
        'hover:shadow-md transition-shadow',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
      )}
    >
      {/* Cover Image */}
      <div className="relative w-full h-32 bg-gradient-to-br from-blue-500 to-purple-600">
        {course.coverImage && (
          <Image
            src={course.coverImage}
            alt={course.title}
            fill
            unoptimized
            className="object-cover"
          />
        )}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-foreground truncate">{course.title}</h3>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {course.lessonCount} {course.lessonCount === 1 ? ui.lesson : ui.lessons}
          </span>
        </div>
      </div>
    </Link>
  );
}
