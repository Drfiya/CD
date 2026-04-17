import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { PostCard } from '@/components/feed/post-card';
import { Pagination } from '@/components/ui/pagination';
import { CategoriesSidebar } from '@/components/feed/categories-sidebar';
import { RightSidebar } from '@/components/feed/right-sidebar';
import { CreatePostModal } from '@/components/feed/create-post-modal';
import { translatePostsForUser } from '@/lib/translation';

import { getCachedCommunitySettings, getCachedCategories } from '@/lib/cached-queries';
import { getMessages } from '@/lib/i18n';
import { getUserLanguage } from '@/lib/translation/helpers';

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

  // Get user's language preference (includes DB, cookie, IP geo, Accept-Language fallbacks)
  const userLanguage = await getUserLanguage();

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
    getCachedCategories(),
  ]);

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  // Transform posts to add isLiked boolean and prepare for translation
  const postsWithLikeStatus = posts.map((post) => ({
    ...post,
    isLiked: 'likes' in post && Array.isArray(post.likes) && post.likes.length > 0,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
  }));

  // Save original text before translation (for Truth toggle)
  const originalTexts = new Map(
    postsWithLikeStatus.map((post) => [
      post.id,
      { plainText: post.plainText, title: post.title },
    ])
  );

  // Translate posts to user's preferred language (server-side)
  console.log(`[Translation] User language: "${userLanguage}" | Posts to check: ${postsWithLikeStatus.length}`);
  postsWithLikeStatus.forEach((p) => {
    const postLang = (p as { languageCode?: string | null }).languageCode || 'en';
    const willTranslate = postLang !== userLanguage;
    console.log(`[Translation]   Post "${(p.title || p.id).substring(0, 40)}" lang=${postLang} → ${willTranslate ? 'TRANSLATE' : 'SKIP (same lang)'}`);
  });
  const translatedPosts = await translatePostsForUser(postsWithLikeStatus, userLanguage);

  // Get static UI translations from message files (instant, no API call)
  const messages = getMessages(userLanguage);
  const translatedPostMenuUI = messages.postMenu;

  // Translate category names using static i18n (no API call needed)
  const translatedCategories = categories.map(cat => ({
    ...cat,
    name: (messages.categoryNames as Record<string, string>)[cat.name] || cat.name,
  }));

  const translatedUI = {
    categoriesTitle: messages.categories.title,
    allPosts: messages.categories.allPosts,
    members: messages.sidebar.members,
    leaderboard: messages.sidebar.leaderboard,
    viewAll: messages.sidebar.viewAll,
    aiToolsTitle: messages.nav.aiTools,
    level: messages.gamification.level,
    writeSomething: messages.post.writeSomething,
    noPosts: messages.common.noResults,
  };

  // Get community settings for sidebar banner (cached)
  const communitySettings = await getCachedCommunitySettings();

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
          postButtonLabel={messages.post.post}
          cancelLabel={messages.post.cancel}
          createPostTitle={messages.post.createNewPost}
          categoryLabel={messages.post.category}
          postTitleLabel={messages.post.postTitle}
          titlePlaceholder={messages.post.titlePlaceholder}
          contentLabel={messages.post.content}
          contentPlaceholder={messages.post.contentPlaceholder}
          imageVideoLabel={messages.post.imageVideo}
          linkLabel={messages.post.link}
          categoryNames={messages.categoryNames}
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
                  postMenuUI={translatedPostMenuUI}
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
  // loading.tsx now handles the instant skeleton — no need for inline Suspense fallback
  return <FeedContent {...props} />;
}
