'use client';

import { useOptimistic, useTransition, useState, useRef, useEffect } from 'react';
import { togglePostLike, toggleCommentLike } from '@/lib/like-actions';
import { LikersList } from './likers-list';

interface LikeButtonProps {
  targetId: string;
  targetType: 'post' | 'comment';
  initialLiked: boolean;
  initialCount: number;
}

type LikeState = {
  isLiked: boolean;
  count: number;
};

type LikeAction = 'LIKE' | 'UNLIKE';

function likeReducer(state: LikeState, action: LikeAction): LikeState {
  if (action === 'LIKE') {
    return { isLiked: true, count: state.count + 1 };
  }
  return { isLiked: false, count: Math.max(0, state.count - 1) };
}

export function LikeButton({
  targetId,
  targetType,
  initialLiked,
  initialCount,
}: LikeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [showLikers, setShowLikers] = useState(false);
  const [isPopping, setIsPopping] = useState(false);
  const [showPointsToast, setShowPointsToast] = useState(false);
  const [levelUpToast, setLevelUpToast] = useState<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [optimisticState, setOptimistic] = useOptimistic<LikeState, LikeAction>(
    { isLiked: initialLiked, count: initialCount },
    likeReducer
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (levelTimerRef.current) clearTimeout(levelTimerRef.current);
    };
  }, []);

  const handleClick = () => {
    const action: LikeAction = optimisticState.isLiked ? 'UNLIKE' : 'LIKE';

    if (action === 'LIKE') {
      setIsPopping(true);
      setShowPointsToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setShowPointsToast(false), 950);
    }

    startTransition(async () => {
      setOptimistic(action);
      const toggleAction = targetType === 'post' ? togglePostLike : toggleCommentLike;
      const result = await toggleAction(targetId);
      if ('leveledUp' in result && result.leveledUp) {
        setLevelUpToast(result.leveledUp);
        if (levelTimerRef.current) clearTimeout(levelTimerRef.current);
        levelTimerRef.current = setTimeout(() => setLevelUpToast(null), 1600);
      }
    });
  };

  const handleCountClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (optimisticState.count > 0) {
      setShowLikers(true);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          onAnimationEnd={() => setIsPopping(false)}
          className={`p-1.5 rounded-full transition-colors ${isPopping ? 'animate-like-pop' : ''} ${
            optimisticState.isLiked
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
          } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={optimisticState.isLiked ? 'Unlike' : 'Like'}
        >
          {optimisticState.isLiked ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 0 1 6 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23h-.777ZM2.331 10.977a11.969 11.969 0 0 0-.831 4.398 12 12 0 0 0 .52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 0 1-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227Z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904M14.25 9h2.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.652 3.375Z"
              />
            </svg>
          )}
        </button>

        {/* Points float toast */}
        {showPointsToast && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-semibold text-green-500 dark:text-green-400 whitespace-nowrap animate-points-float"
          >
            +1 pt
          </span>
        )}

        {/* Level-up burst toast */}
        {levelUpToast && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-yellow-500 dark:text-yellow-400 whitespace-nowrap animate-level-burst"
          >
            Level {levelUpToast}!
          </span>
        )}
      </div>

      {/* Count - only show when > 0, clickable to show likers */}
      {optimisticState.count > 0 && (
        <button
          type="button"
          onClick={handleCountClick}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          {optimisticState.count}
        </button>
      )}

      {/* Likers modal */}
      <LikersList
        targetId={targetId}
        targetType={targetType}
        isOpen={showLikers}
        onClose={() => setShowLikers(false)}
      />
    </div>
  );
}
