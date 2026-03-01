import { CourseCatalogCard, type CatalogCourse } from './course-catalog-card';
import { EnrolledCourseCard, type EnrolledCourse } from './enrolled-course-card';

interface CatalogGridUI {
  lessons: string;
  lesson: string;
  viewCourse: string;
  noCoursesAvailable: string;
  checkBackSoon: string;
}

interface CourseCatalogGridProps {
  courses: CatalogCourse[];
  ui: CatalogGridUI;
}

export function CourseCatalogGrid({ courses, ui }: CourseCatalogGridProps) {
  if (courses.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-neutral-700">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-gray-400 dark:text-neutral-500"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100 mb-1">{ui.noCoursesAvailable}</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400">{ui.checkBackSoon}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {courses.map((course) => (
        <CourseCatalogCard
          key={course.id}
          course={course}
          ui={{ lessons: ui.lessons, lesson: ui.lesson, viewCourse: ui.viewCourse }}
        />
      ))}
    </div>
  );
}

interface EnrolledGridUI {
  lessons: string;
  completed: string;
  continueLearning: string;
  startCourse: string;
  noEnrolledCourses: string;
  notEnrolledYet: string;
}

interface EnrolledCoursesGridProps {
  courses: EnrolledCourse[];
  ui: EnrolledGridUI;
}

export function EnrolledCoursesGrid({ courses, ui }: EnrolledCoursesGridProps) {
  if (courses.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-neutral-700">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-gray-400 dark:text-neutral-500"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100 mb-1">{ui.noEnrolledCourses}</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400">{ui.notEnrolledYet}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {courses.map((course) => (
        <EnrolledCourseCard
          key={course.id}
          course={course}
          ui={{
            lessons: ui.lessons,
            completed: ui.completed,
            continueLearning: ui.continueLearning,
            startCourse: ui.startCourse,
          }}
        />
      ))}
    </div>
  );
}
