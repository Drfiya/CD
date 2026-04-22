import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { PostForm } from '@/components/feed/post-form';
import type { VideoEmbed } from '@/types/post';

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params;

  // Get session - must be authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch post
  const post = await db.post.findUnique({
    where: { id },
  });

  if (!post) {
    notFound();
  }

  // Authorization check - must be the author
  if (post.authorId !== session.user.id) {
    redirect(`/feed/${id}`);
  }

  // Cast Prisma Json fields for TypeScript
  const embeds = (post.embeds as unknown as VideoEmbed[]) || [];
  const images = (post.images as unknown as string[]) || [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href={`/feed/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Post
      </Link>

      <h1 className="text-2xl font-bold">Edit Post</h1>

      <div className="bg-white border rounded-lg p-4">
        <PostForm
          mode="edit"
          postId={id}
          initialContent={JSON.stringify(post.content)}
          initialEmbeds={embeds}
          initialImages={images}
        />
      </div>
    </div>
  );
}
