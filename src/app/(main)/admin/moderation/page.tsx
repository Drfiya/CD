import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Moderation Queue | Admin',
};

/**
 * Moderation queue page - placeholder for content moderation.
 * Will be implemented in 10-02-PLAN.md (Content Moderation).
 */
export default function ModerationPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Moderation Queue</h1>
        <p className="text-muted-foreground mt-1">
          Review and moderate flagged content
        </p>
      </div>

      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-8 text-center">
        <div className="text-muted-foreground">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-neutral-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-medium">No items to moderate</p>
          <p className="mt-1 text-sm">
            Content moderation features coming in the next plan.
          </p>
        </div>
      </div>
    </div>
  );
}
