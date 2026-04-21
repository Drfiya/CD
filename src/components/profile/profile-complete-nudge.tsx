import Link from 'next/link';
import {
  hasAvatar,
  hasBio,
  hasName,
  isProfileComplete,
  profileCompletionCount,
  type ProfileCompletenessInput,
} from '@/lib/profile-helpers';

interface ProfileNudgeLabels {
  title: string;
  setName: string;
  addBio: string;
  uploadAvatar: string;
  finishCta: string;
  progressSuffix: string;
}

interface ProfileCompleteNudgeProps {
  user: ProfileCompletenessInput;
  labels: ProfileNudgeLabels;
}

export function ProfileCompleteNudge({ user, labels }: ProfileCompleteNudgeProps) {
  if (isProfileComplete(user)) return null;

  const doneCount = profileCompletionCount(user);

  return (
    <aside
      role="region"
      aria-label={labels.title}
      className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm"
    >
      <h3 className="text-base font-semibold text-[#1f2937] dark:text-neutral-100 mb-1">
        {labels.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-neutral-400 mb-3">
        {doneCount} {labels.progressSuffix}
      </p>
      <ul className="space-y-1.5 text-sm" role="list">
        <ChecklistRow done={hasName(user)} label={labels.setName} />
        <ChecklistRow done={hasBio(user)} label={labels.addBio} />
        <ChecklistRow done={hasAvatar(user)} label={labels.uploadAvatar} />
      </ul>
      <Link
        href="/profile/edit"
        className="mt-3 inline-block text-xs font-medium text-[#D94A4A] hover:underline"
      >
        {labels.finishCta}
      </Link>
    </aside>
  );
}

function StepIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="w-4 h-4 shrink-0"
      >
        <circle cx="8" cy="8" r="7" fill="#D94A4A" />
        <path
          d="M5 8.2l2.2 2.2L11 6.6"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="w-4 h-4 shrink-0"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" className="text-gray-300 dark:text-neutral-600" />
    </svg>
  );
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-[#1f2937] dark:text-neutral-100">
      <StepIcon done={done} />
      <span className={done ? 'line-through text-gray-500 dark:text-neutral-500' : ''}>
        {label}
      </span>
    </li>
  );
}
