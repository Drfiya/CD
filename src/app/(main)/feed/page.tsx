import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { PostCard } from '@/components/feed/post-card';
import { Pagination } from '@/components/ui/pagination';
import { CategoriesSidebar } from '@/components/feed/categories-sidebar';
import { RightSidebar } from '@/components/feed/right-sidebar';
import { CreatePostModal } from '@/components/feed/create-post-modal';
import { translatePostsForUser } from '@/lib/translation';
import { translateUIText, translateObjects } from '@/lib/translation/ui';
import { getCommunitySettings } from '@/lib/settings-actions';

const POSTS_PER_PAGE = 10;

interface FeedPageProps {
  searchParams: Promise<{ page?: string; category?: string }>;
}

async function FeedContent({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const category = params.category || null;
  const skip = (page - 1) * POSTS_PER_PAGE;

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // Get user's language preference
  const userLanguage = currentUserId
    ? (await db.user.findUnique({
      where: { id: currentUserId },
      select: { languageCode: true },
    }))?.languageCode || 'en'
    : 'en';

  // Build where clause for category filter
  const whereClause = category ? { categoryId: category } : {};

  const [posts, total, categories] = await Promise.all([
    db.post.findMany({
      where: whereClause,
      skip,
      take: POSTS_PER_PAGE,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, image: true, level: true, role: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
        _count: {
          select: { comments: true, likes: true },
        },
        ...(currentUserId
          ? {
            likes: {
              where: { userId: currentUserId },
              take: 1,
            },
          }
          : {}),
      },
    }),
    db.post.count({ where: whereClause }),
    db.category.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  // Transform posts to add isLiked boolean and prepare for translation
  const postsWithLikeStatus = posts.map((post) => ({
    ...post,
    isLiked: 'likes' in post && Array.isArray(post.likes) && post.likes.length > 0,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
  }));

  // Save original text before translation (for Trues toggle)
  const originalTexts = new Map(
    postsWithLikeStatus.map((post) => [
      post.id,
      { plainText: post.plainText, title: post.title },
    ])
  );

  // Translate posts to user's preferred language (server-side)
  const translatedPosts = await translatePostsForUser(postsWithLikeStatus, userLanguage);

  // Translate categories dynamically
  const translatedCategories = await translateObjects(
    categories,
    ['name'],
    'en', // Categories are stored in English
    userLanguage,
    'category'
  );

  // Translate UI strings dynamically
  const translatedUI = {
    categoriesTitle: await translateUIText('Categories', 'en', userLanguage, 'sidebar'),
    allPosts: await translateUIText('All Posts', 'en', userLanguage, 'sidebar'),
    members: await translateUIText('Members', 'en', userLanguage, 'sidebar'),
    leaderboard: await translateUIText('Top Learners', 'en', userLanguage, 'sidebar'),
    viewAll: await translateUIText('View all', 'en', userLanguage, 'sidebar'),
    aiToolsTitle: await translateUIText('AI Tools', 'en', userLanguage, 'sidebar'),
    level: await translateUIText('Level', 'en', userLanguage, 'gamification'),
    writeSomething: await translateUIText('Write something...', 'en', userLanguage, 'placeholder'),
    noPosts: await translateUIText('No posts yet. Be the first to share something!', 'en', userLanguage, 'message'),
  };

  // Get community settings for sidebar banner
  const communitySettings = await getCommunitySettings();

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* Left sidebar - Categories */}
      <CategoriesSidebar
        categories={translatedCategories}
        activeCategory={category}
        translatedUI={translatedUI}
        sidebarBannerImage={communitySettings.sidebarBannerImage}
        sidebarBannerUrl={communitySettings.sidebarBannerUrl}
        sidebarBannerEnabled={communitySettings.sidebarBannerEnabled}
      />

      {/* Center - Posts feed */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Create post trigger */}
        <CreatePostModal
          categories={translatedCategories}
          userImage={session?.user?.image}
          userName={session?.user?.name}
          writeSomethingPlaceholder={translatedUI.writeSomething}
        />

        {/* Posts list */}
        {translatedPosts.length === 0 ? (
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-12 text-center text-gray-500 dark:text-neutral-400 shadow-sm border border-gray-100 dark:border-neutral-700">
            <p>{translatedUI.noPosts}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {translatedPosts.map((post) => {
              const originals = originalTexts.get(post.id);
              return (
                <PostCard
                  key={post.id}
                  post={post}
                  showActions
                  currentUserId={currentUserId}
                  likeCount={post.likeCount}
                  commentCount={post.commentCount}
                  isLiked={post.isLiked}
                  category={post.category}
                  translatedPlainText={post.plainText || undefined}
                  translatedTitle={post.title || undefined}
                  originalPlainText={originals?.plainText || undefined}
                  originalTitle={originals?.title || undefined}
                  originalLanguage={post._originalLanguage || post.languageCode || 'en'}
                  userLanguage={userLanguage}
                />
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination currentPage={page} totalPages={totalPages} />
          </div>
        )}
      </div>

      {/* Right sidebar - Members & Leaderboard */}
      <RightSidebar translatedUI={translatedUI} />
    </div>
  );
}

export default function FeedPage(props: FeedPageProps) {
  return (
    <Suspense fallback={
      <div className="flex gap-6 max-w-7xl mx-auto">
        <div className="w-64 shrink-0">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 animate-pulse h-48" />
        </div>
        <div className="flex-1">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-12 animate-pulse h-32" />
        </div>
        <div className="w-72 shrink-0 space-y-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 animate-pulse h-24" />
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 animate-pulse h-48" />
        </div>
      </div>
    }>
      <FeedContent {...props} />
    </Suspense>
  );
}
