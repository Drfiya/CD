import { Suspense } from 'react';
import { Metadata } from 'next';
import { getCommentsForModeration } from '@/lib/admin-actions';
import { CommentTable } from '@/components/admin/comment-table';
import { Pagination } from '@/components/ui/pagination';

export const metadata: Metadata = {
  title: 'Comment Moderation | Admin',
};

interface CommentsPageProps {
  searchParams: Promise<{ page?: string }>;
}

async function CommentsList({ page }: { page: number }) {
  const { comments, totalPages, currentPage } = await getCommentsForModeration(page);

  return (
    <div className="space-y-6">
      <CommentTable comments={comments} />

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}

/**
 * Comment moderation page - lists all comments with edit/delete actions.
 * Accessible to moderator+.
 */
export default async function CommentsPage({ searchParams }: CommentsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Comment Moderation</h1>
        <p className="text-muted-foreground mt-1">
          Review, edit, and delete comments. Edits are silent (no indicator shown to users).
        </p>
      </div>

      <div>
        <Suspense
          fallback={
            <div className="p-8 text-center text-muted-foreground">Loading comments...</div>
          }
        >
          <CommentsList page={page} />
        </Suspense>
      </div>
    </div>
  );
}
