'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { banUser } from '@/lib/admin-actions';

interface BanDialogProps {
  userId: string;
  userName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BAN_DURATIONS = [
  { days: 1, label: '1 day' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
] as const;

export function BanDialog({
  userId,
  userName,
  onClose,
  onSuccess,
}: BanDialogProps) {
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<1 | 7 | 30>(7);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleBan = () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the ban');
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await banUser(userId, reason, duration);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onSuccess();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-semibold mb-4">
          Ban {userName || 'User'}
        </h2>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Duration selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Ban Duration
            </label>
            <div className="flex gap-2">
              {BAN_DURATIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDuration(d.days)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${duration === d.days
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-600'
                    }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason input */}
          <div>
            <label
              htmlFor="ban-reason"
              className="block text-sm font-medium mb-2"
            >
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this user is being banned..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This reason will be visible to the banned user.
            </p>
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <strong>Warning:</strong> Banning this user will delete all their
            posts and comments.
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBan}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? 'Banning...' : 'Ban User'}
          </Button>
        </div>
      </div>
    </div>
  );
}
