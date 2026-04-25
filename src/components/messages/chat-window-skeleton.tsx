import { cn } from '@/lib/utils';

function SkeletonBubble({ isMine }: { isMine: boolean }) {
  return (
    <div className={cn('flex items-end gap-1.5', isMine && 'flex-row-reverse')}>
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
      <div
        className={cn(
          'h-10 rounded-2xl bg-muted animate-pulse',
          isMine ? 'w-48' : 'w-64',
        )}
      />
    </div>
  );
}

export function ChatWindowSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="h-4 w-32 rounded bg-muted animate-pulse flex-1" />
      </header>
      <div className="flex-1 overflow-y-hidden px-3 py-4 space-y-4 bg-background">
        <SkeletonBubble isMine={false} />
        <SkeletonBubble isMine={true} />
        <SkeletonBubble isMine={false} />
        <SkeletonBubble isMine={true} />
        <SkeletonBubble isMine={true} />
        <SkeletonBubble isMine={false} />
      </div>
      <div className="border-t border-border bg-card px-3 py-3">
        <div className="h-10 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}
