'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { dismissActivationChecklist } from '@/lib/activation-actions';
import type { ActivationSignals } from '@/types/activation';

interface ActivationLabels {
  title: string;
  stepSignUp: string;
  stepProfile: string;
  stepEnrollment: string;
  stepFirstPost: string;
  dismiss: string;
}

interface ActivationChecklistProps {
  signals: ActivationSignals;
  labels: ActivationLabels;
}

const PROFILE_EDIT = '/profile/edit';
const CLASSROOM = '/classroom';

export function ActivationChecklist({ signals, labels }: ActivationChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();

  if (dismissed) return null;

  const doneCount = [signals.signUp, signals.profile, signals.enrollment, signals.firstPost].filter(
    Boolean
  ).length;
  const totalSteps = 4;

  function handleDismiss() {
    setDismissed(true);
    startTransition(async () => {
      await dismissActivationChecklist();
    });
  }

  return (
    <aside
      role="region"
      aria-label={labels.title}
      className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-[#1f2937] dark:text-neutral-100">
            {labels.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
            {doneCount}/{totalSteps}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label={labels.dismiss}
          className="text-gray-500 dark:text-neutral-400 hover:text-[#D94A4A] dark:hover:text-[#D94A4A] transition-colors shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <ul className="mt-3 space-y-1.5 text-sm" role="list">
        <Step done={signals.signUp} label={labels.stepSignUp} />
        <Step done={signals.profile} label={labels.stepProfile} href={PROFILE_EDIT} />
        <Step done={signals.enrollment} label={labels.stepEnrollment} href={CLASSROOM} />
        <Step done={signals.firstPost} label={labels.stepFirstPost} />
      </ul>
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

function Step({ done, label, href }: { done: boolean; label: string; href?: string }) {
  const content = (
    <span className="flex items-center gap-2 text-[#1f2937] dark:text-neutral-100">
      <StepIcon done={done} />
      <span className={done ? 'line-through text-gray-500 dark:text-neutral-500' : ''}>
        {label}
      </span>
    </span>
  );

  return (
    <li>
      {!done && href ? (
        <Link href={href} className="hover:underline hover:text-[#D94A4A] dark:hover:text-[#D94A4A] transition-colors">
          {content}
        </Link>
      ) : (
        content
      )}
    </li>
  );
}
