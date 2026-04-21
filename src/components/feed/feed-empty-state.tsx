'use client';

interface FeedEmptyStateProps {
  hasActiveFilter: boolean;
}

export function FeedEmptyState({ hasActiveFilter }: FeedEmptyStateProps) {
  function scrollToPostTrigger() {
    // The CreatePostModal trigger is rendered above the post list.
    // Scroll to top so users immediately see it.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (hasActiveFilter) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-neutral-700">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1}
          stroke="currentColor"
          className="w-12 h-12 mx-auto text-gray-300 dark:text-neutral-600 mb-3"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
        </svg>
        <p className="text-gray-500 dark:text-neutral-400 font-medium">No posts in this category yet</p>
        <p className="text-sm text-gray-400 dark:text-neutral-500 mt-1">
          Try a different category or be the first to post here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-12 text-center shadow-sm border border-gray-100 dark:border-neutral-700">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1}
        stroke="currentColor"
        className="w-14 h-14 mx-auto text-gray-300 dark:text-neutral-600 mb-4"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
      </svg>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-neutral-200 mb-2">
        The community is quiet — start the conversation!
      </h3>
      <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">
        Share something. Ask a question, introduce yourself, or post what you&apos;re working on.
      </p>
      <button
        onClick={scrollToPostTrigger}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Create the first post
      </button>
    </div>
  );
}
