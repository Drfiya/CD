'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { unblockUser } from '@/lib/dm-block-actions';

interface UnblockButtonProps {
  targetUserId: string;
  label: string;
  className?: string;
}

export function UnblockButton({ targetUserId, label, className }: UnblockButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await unblockUser({ targetUserId });
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(label); // Just as a confirmation
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium',
        'bg-secondary text-secondary-foreground hover:bg-secondary/80 border',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      {/* Unlock icon */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 9.9-1" />
      </svg>
      {label}
    </button>
  );
}
