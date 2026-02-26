import { Suspense } from 'react';
import { Metadata } from 'next';
import { getPostsForModeration } from '@/lib/admin-actions';
import { PostTable } from '@/components/admin/post-table';
import { Pagination } from '@/components/ui/pagination';

export const metadata: Metadata = {
  title: 'Post Moderation | Admin',
};

interface PostsPageProps {
  searchParams: Promise<{ page?: string }>;
}

async function PostsList({ page }: { page: number }) {
  const { posts, totalPages, currentPage } = await getPostsForModeration(page);

  return (
    <div className="space-y-6">
      <PostTable posts={posts} />

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} />
      )}
    </div>
  );
}

/**
 * Post moderation page - lists all posts with edit/delete actions.
 * Accessible to moderator+.
 */
export default async function PostsPage({ searchParams }: PostsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Post Moderation</h1>
        <p className="text-muted-foreground mt-1">
          Review, edit, and delete posts. Edits are silent (no indicator shown to users).
        </p>
      </div>

      <div>
        <Suspense
          fallback={
            <div className="p-8 text-center text-muted-foreground">Loading posts...</div>
          }
        >
          <PostsList page={page} />
        </Suspense>
      </div>
    </div>
  );
}
