import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import Image from 'next/image';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCommunitySettings } from '@/lib/settings-actions';
import { isEuropeanCountry } from '@/lib/i18n/geolocation';
import { getUserLanguage, tMany } from '@/lib/translation/helpers';
import { getMessages } from '@/lib/i18n';
import db from '@/lib/db';
import { LandingVideoPlayer } from '@/components/landing/LandingVideoPlayer';
import { ThemeLogo } from '@/components/layout/ThemeLogo';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import './landing.css';

// CR10 A2: Site URL resolution. NEXT_PUBLIC_SITE_URL is the canonical override; falls back
// to NEXTAUTH_URL (already wired across email/digest paths) and a localhost dev default.
function resolveSiteUrl(): string {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        'http://localhost:3000'
    );
}

// CR10 A2: Brand-stable defaults for the rare race where the singleton row is unreachable.
const DEFAULT_COMMUNITY_NAME = 'ScienceExperts.ai';
const DEFAULT_COMMUNITY_DESCRIPTION =
    'Where science meets AI — courses, community, and global collaboration.';

/**
 * CR10 A2: Landing-page metadata. Reads communityName/communityDescription from
 * CommunitySettings with fail-open defaults so a DB hiccup never strips OG tags.
 * Twitter Card uses the dynamic /opengraph-image route (1200×630).
 */
export async function generateMetadata(): Promise<Metadata> {
    const siteUrl = resolveSiteUrl();
    let title = DEFAULT_COMMUNITY_NAME;
    let description = DEFAULT_COMMUNITY_DESCRIPTION;
    try {
        const settings = await getCommunitySettings();
        title = settings.communityName || DEFAULT_COMMUNITY_NAME;
        description = settings.communityDescription || DEFAULT_COMMUNITY_DESCRIPTION;
    } catch (err) {
        console.error('[Landing.generateMetadata] settings read failed, using defaults:', err);
    }

    return {
        metadataBase: new URL(siteUrl),
        title,
        description,
        alternates: { canonical: '/' },
        openGraph: {
            title,
            description,
            url: '/',
            siteName: title,
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
        robots: { index: true, follow: true },
    };
}

// CR9 F1: Week-in-Numbers stats — cached 15 min. Fail-open on DB error.
const getWeekInNumbers = unstable_cache(
    async () => {
        const startOfWeek = new Date();
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 7);
        const [newPosts, activeDiscussions, lessonsCompleted] = await Promise.all([
            db.post.count({ where: { createdAt: { gte: startOfWeek } } }),
            db.comment.count({ where: { createdAt: { gte: startOfWeek } } }),
            db.lessonProgress.count({ where: { completedAt: { gte: startOfWeek } } }),
        ]);
        return { newPosts, activeDiscussions, lessonsCompleted };
    },
    ['landing-week-in-numbers'],
    { revalidate: 900, tags: ['landing:week'] }
);

/**
 * CR9 F1: Interpolate {count} and similar placeholders in a localized template string.
 */
function interpolate(template: string, vars: Record<string, string | number>): string {
    return Object.entries(vars).reduce(
        (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
        template
    );
}

export default async function LandingPage() {
    // If logged in, redirect to feed
    const session = await getServerSession(authOptions);
    if (session?.user) {
        redirect('/feed');
    }

    const settings = await getCommunitySettings();

    // Detect European visitor for currency
    const headersList = await headers();
    const countryCode = headersList.get('x-vercel-ip-country')
        || headersList.get('cf-ipcountry')
        || null;
    const isEurope = isEuropeanCountry(countryCode);

    // All landing-page DB reads in a single Promise.all batch. Each is fail-open per CR5 pattern.
    type FeaturedCourse = { id: string; title: string; coverImage: string | null; _count: { enrollments: number } };
    type RecentPost = { id: string; title: string | null; createdAt: Date; category: { color: string } | null };
    type AvatarUser = { id: string; image: string | null; name: string | null };
    type WeekNumbers = { newPosts: number; activeDiscussions: number; lessonsCompleted: number };

    const [memberCount, courseCount, featuredCoursesList, weekNumbers, recentPostsList, avatarMosaicUsers] = await Promise.all([
        db.user.count().catch(() => 0),
        db.course.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
        db.course.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: { updatedAt: 'desc' },
            take: 3,
            select: { id: true, title: true, coverImage: true, _count: { select: { enrollments: true } } },
        }).catch(() => [] as FeaturedCourse[]),
        getWeekInNumbers().catch(() => null as WeekNumbers | null),
        settings.landingShowRecentPosts
            ? db.post.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                select: { id: true, title: true, createdAt: true, category: { select: { color: true } } },
            }).catch(() => [] as RecentPost[])
            : Promise.resolve([] as RecentPost[]),
        settings.landingShowAvatarMosaic
            ? db.user.findMany({
                where: { image: { not: null } },
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: { id: true, image: true, name: true },
            }).catch(() => [] as AvatarUser[])
            : Promise.resolve([] as AvatarUser[]),
    ]);

    // Detect visitor language — fail-open, landing page must always render
    let userLang: string;
    try {
        userLang = await getUserLanguage();
    } catch (err) {
        console.error('[Landing] getUserLanguage failed, defaulting to en:', err);
        userLang = 'en';
    }

    // Default EN content
    const enHeadline = settings.landingHeadline || 'Join the Science Experts Community Today';
    const enSubheadline = settings.landingSubheadline || 'Where researchers, scientists, and innovators connect, learn, and grow together.';
    const enDescription = settings.landingDescription || 'Get access to exclusive courses, expert discussions, live events, and a network of brilliant minds. Whether you\'re a seasoned researcher or an aspiring scientist — this is your community.';
    const enBenefits = settings.landingBenefits.length > 0 ? settings.landingBenefits : [
        'Access to all expert-led courses and masterclasses',
        'Join live Q&A sessions and workshops with leading scientists',
        'Private discussion forums with peer researchers',
        'Weekly science briefings and trend analysis',
        'Exclusive networking events and collaborations',
        'Certificate of participation for completed courses',
        'Direct access to mentors and advisors',
        'Community-driven research project opportunities',
    ];
    const enCtaText = settings.landingCtaText || 'Join Now';

    // Check for saved translation
    const savedTranslation = userLang !== 'en' ? settings.landingTranslations[userLang] : undefined;

    // Resolve content: saved translation > auto-translate > English
    let headline: string, subheadline: string, description: string, ctaText: string;
    let finalBenefits: string[];
    let videoUrls = settings.landingVideoUrls;

    if (userLang === 'en') {
        // English: use directly
        headline = enHeadline;
        subheadline = enSubheadline;
        description = enDescription;
        ctaText = enCtaText;
        finalBenefits = enBenefits;
    } else {
        // Non-English: use saved translations, auto-translate any missing fields via DeepL
        // Collect fields that need auto-translation
        const needsTranslation: Record<string, string> = {};
        if (!savedTranslation?.headline) needsTranslation.headline = enHeadline;
        if (!savedTranslation?.subheadline) needsTranslation.subheadline = enSubheadline;
        if (!savedTranslation?.description) needsTranslation.description = enDescription;
        if (!savedTranslation?.ctaText) needsTranslation.ctaText = enCtaText;

        // Auto-translate only the missing fields (if any)
        let autoTranslated: Record<string, string> = {};
        if (Object.keys(needsTranslation).length > 0) {
            try {
                autoTranslated = await tMany(needsTranslation, 'landing_page');
            } catch {
                // If DeepL fails, fall back to English for missing fields
                autoTranslated = needsTranslation;
            }
        }

        // Combine: saved translation takes priority, auto-translated fills gaps
        headline = savedTranslation?.headline || autoTranslated.headline || enHeadline;
        subheadline = savedTranslation?.subheadline || autoTranslated.subheadline || enSubheadline;
        description = savedTranslation?.description || autoTranslated.description || enDescription;
        ctaText = savedTranslation?.ctaText || autoTranslated.ctaText || enCtaText;

        // Benefits: use saved, or auto-translate each one
        if (savedTranslation?.benefits?.length) {
            finalBenefits = savedTranslation.benefits;
        } else {
            try {
                finalBenefits = await Promise.all(
                    enBenefits.map(b => tMany({ benefit: b }, 'landing_page').then(r => r.benefit))
                );
            } catch {
                finalBenefits = enBenefits;
            }
        }

        // Per-language video URLs
        if (savedTranslation?.videoUrls?.length) {
            videoUrls = savedTranslation.videoUrls.filter(u => u.trim() !== '');
            if (videoUrls.length === 0) videoUrls = settings.landingVideoUrls;
        }
    }

    // Translate UI labels
    const translated = await tMany({
        statsMembers: 'Members',
        statsCourses: 'Courses',
        statsOnline: 'Online',
        whatYouGet: 'What You Get',
        aboutTitle: 'About Our Community',
        logIn: 'Log In',
        joinNow: 'Join Now',
        privacyPolicy: 'Privacy Policy',
        termsOfService: 'Terms of Service',
    }, 'landing_page');

    // Merge content into translated object for template
    const allTranslated = { ...translated, headline, subheadline, description, ctaText };

    // CR9 F1: Locale-resolved strings for the social-proof sections (static messages, 4 locales).
    const sp = getMessages(userLang).landing_social_proof;
    // Round the member count down to the nearest 10 for the public member-count line.
    const roundedMemberCount = Math.max(0, Math.floor(memberCount / 10) * 10);
    const memberCountLine = interpolate(sp.memberCountTemplate, { count: roundedMemberCount });
    // Snapshot the server-render timestamp so relative post ages don't invoke Date.now() during JSX (linter: impure in render).
    const nowMs = new Date().getTime();

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <Link href="/" className="landing-nav-logo">
                        {settings.communityLogo ? (
                            <ThemeLogo
                                lightSrc={settings.communityLogo}
                                darkSrc={settings.communityLogoDark}
                                alt={settings.communityName}
                                width={200}
                                height={100}
                                className="landing-logo-img"
                                style={{ height: `${settings.logoSize || 36}px`, width: 'auto', maxWidth: '200px' }}
                            />
                        ) : (
                            <span className="landing-logo-text">{settings.communityName}</span>
                        )}
                    </Link>
                    <div className="landing-nav-actions">
                        {/* CR9 F3: Anonymous visitors can pick their theme before signing up. Preference persists via localStorage;
                            after signup, the next ThemeToggle interaction syncs to the DB via F2's updateThemePreference. */}
                        <ThemeToggle />
                        <Link href="/login" className="landing-nav-login">{translated.logIn}</Link>
                        <Link href="/register" className="landing-nav-join">{translated.joinNow}</Link>
                    </div>
                </div>
            </nav>

            {/* Video Section – above the fold */}
            {videoUrls.length > 0 && (
                <section className="landing-video-hero">
                    <div className="landing-container">
                        <LandingVideoPlayer videoUrls={videoUrls} />
                    </div>
                </section>
            )}

            {/* Hero Section */}
            <section className="landing-hero" aria-labelledby="landing-hero-title">
                <div className="landing-hero-bg" />
                <div className="landing-hero-content">
                    <div className="landing-hero-badge">
                        <span className="landing-hero-badge-dot" />
                        {settings.communityName}
                    </div>
                    <h1 id="landing-hero-title" className="landing-hero-title">{allTranslated.headline}</h1>
                    <p className="landing-hero-subtitle">{allTranslated.subheadline}</p>
                    <div className="landing-hero-actions">
                        <Link
                            href="/register"
                            className="landing-hero-cta-primary"
                            aria-label={sp.heroJoinCta}
                        >
                            {translated.joinNow}
                        </Link>
                        <Link href="/login" className="landing-hero-cta-secondary">{translated.logIn}</Link>
                    </div>
                </div>
            </section>

            {/* CR9 F1 — Featured Courses (always on) */}
            <section className="landing-section landing-featured-courses" aria-labelledby="landing-featured-courses-title">
                <div className="landing-container">
                    <h2 id="landing-featured-courses-title" className="landing-section-title">
                        {sp.featuredCoursesTitle}
                    </h2>
                    {featuredCoursesList.length === 0 ? (
                        <p className="landing-courses-empty text-gray-600 dark:text-neutral-400">
                            {sp.featuredCoursesEmpty}
                        </p>
                    ) : (
                        <div className="landing-courses-grid" role="list">
                            {featuredCoursesList.map(course => (
                                <Link
                                    key={course.id}
                                    href={`/login?callbackUrl=/classroom/courses/${course.id}`}
                                    className="landing-course-card bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 hover:border-[var(--color-brand,#D94A4A)] dark:hover:border-[var(--color-brand,#D94A4A)] transition-colors rounded-xl overflow-hidden"
                                    role="listitem"
                                >
                                    {course.coverImage && course.coverImage.trim() !== '' && (course.coverImage.startsWith('/') || course.coverImage.startsWith('http')) ? (
                                        <Image
                                            src={course.coverImage}
                                            alt=""
                                            width={480}
                                            height={270}
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                            loading="lazy"
                                            unoptimized
                                            className="landing-course-thumb"
                                        />
                                    ) : (
                                        <div className="landing-course-thumb-fallback bg-gray-100 dark:bg-neutral-800" />
                                    )}
                                    <div className="landing-course-body p-4">
                                        <h3 className="landing-course-title text-gray-900 dark:text-neutral-100">{course.title}</h3>
                                        <p className="landing-course-meta text-gray-500 dark:text-neutral-400 text-sm mt-1">
                                            {course._count.enrollments} {sp.enrolledCountLabel}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CR9 F1 — Recent Posts Ticker (admin-togglable, default OFF) */}
            {settings.landingShowRecentPosts && recentPostsList.length > 0 && (
                <section className="landing-section landing-posts-ticker" aria-labelledby="landing-ticker-title">
                    <div className="landing-container">
                        <h2 id="landing-ticker-title" className="landing-section-title">
                            {sp.recentPostsTitle}
                        </h2>
                        <ul className="landing-ticker-list" aria-live="off">
                            {recentPostsList.map(post => {
                                const minutesAgo = Math.max(1, Math.floor((nowMs - new Date(post.createdAt).getTime()) / 60000));
                                const relative = minutesAgo < 60
                                    ? `${minutesAgo}m ago`
                                    : minutesAgo < 60 * 24
                                        ? `${Math.floor(minutesAgo / 60)}h ago`
                                        : `${Math.floor(minutesAgo / (60 * 24))}d ago`;
                                return (
                                    <li key={post.id} className="landing-ticker-item">
                                        <span
                                            className="landing-ticker-dot"
                                            style={{ backgroundColor: post.category?.color ?? '#D94A4A' }}
                                            aria-hidden="true"
                                        />
                                        <span className="landing-ticker-title text-gray-900 dark:text-neutral-100">
                                            {post.title ?? sp.recentPostsAuthor}
                                        </span>
                                        <span className="landing-ticker-meta text-gray-500 dark:text-neutral-400">
                                            {sp.recentPostsAuthor} · {relative}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </section>
            )}

            {/* CR9 F1 — Week in Numbers (always on, fail-open with em-dash placeholders) */}
            <section className="landing-section landing-week" aria-labelledby="landing-week-title">
                <div className="landing-container">
                    <h2 id="landing-week-title" className="landing-section-title">
                        {sp.weekInNumbersTitle}
                    </h2>
                    <div className="landing-week-grid">
                        <div className="landing-week-stat">
                            <span className="landing-week-value text-gray-900 dark:text-neutral-100">
                                {weekNumbers?.newPosts ?? '—'}
                            </span>
                            <span className="landing-week-label text-gray-500 dark:text-neutral-400">
                                {sp.weekNewPosts}
                            </span>
                        </div>
                        <div className="landing-week-stat">
                            <span className="landing-week-value text-gray-900 dark:text-neutral-100">
                                {weekNumbers?.activeDiscussions ?? '—'}
                            </span>
                            <span className="landing-week-label text-gray-500 dark:text-neutral-400">
                                {sp.weekActiveDiscussions}
                            </span>
                        </div>
                        <div className="landing-week-stat">
                            <span className="landing-week-value text-gray-900 dark:text-neutral-100">
                                {weekNumbers?.lessonsCompleted ?? '—'}
                            </span>
                            <span className="landing-week-label text-gray-500 dark:text-neutral-400">
                                {sp.weekLessonsCompleted}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* CR9 F1 — Avatar Mosaic (admin-togglable, default OFF) */}
            {settings.landingShowAvatarMosaic && avatarMosaicUsers.length > 0 && (
                <section className="landing-section landing-avatar-mosaic" aria-labelledby="landing-mosaic-title">
                    <div className="landing-container">
                        <h2 id="landing-mosaic-title" className="landing-section-title sr-only">
                            Community members
                        </h2>
                        <ul className="landing-mosaic-grid" role="list">
                            {avatarMosaicUsers.map(user => (
                                <li key={user.id} role="listitem" className="landing-mosaic-item">
                                    {user.image ? (
                                        <Image
                                            src={user.image}
                                            alt={user.name ? `${user.name}'s avatar` : ''}
                                            width={56}
                                            height={56}
                                            sizes="56px"
                                            loading="lazy"
                                            className="landing-mosaic-avatar"
                                        />
                                    ) : (
                                        <div
                                            className="landing-mosaic-avatar-fallback bg-[var(--color-brand,#D94A4A)] text-white"
                                            aria-hidden="true"
                                        >
                                            {(user.name || '?').slice(0, 1).toUpperCase()}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {/* CR9 F1 — Member Count Line (admin-togglable, default OFF) */}
            {settings.landingShowMemberCount && roundedMemberCount > 0 && (
                <section className="landing-section landing-member-count" aria-labelledby="landing-member-count-title">
                    <div className="landing-container">
                        <p id="landing-member-count-title" className="landing-member-count-text text-gray-900 dark:text-neutral-100">
                            {memberCountLine}
                        </p>
                    </div>
                </section>
            )}

            {/* Stats */}
            <section className="landing-stats">
                <div className="landing-container">
                    <div className="landing-stats-grid">
                        <div className="landing-stat">
                            <span className="landing-stat-value">{memberCount}</span>
                            <span className="landing-stat-label">{translated.statsMembers}</span>
                        </div>
                        <div className="landing-stat-divider" />
                        <div className="landing-stat">
                            <span className="landing-stat-value">{courseCount}</span>
                            <span className="landing-stat-label">{translated.statsCourses}</span>
                        </div>
                        <div className="landing-stat-divider" />
                        <div className="landing-stat">
                            <span className="landing-stat-value landing-stat-online">
                                <span className="landing-online-dot" />
                                {Math.max(1, Math.floor(memberCount * 0.15))}
                            </span>
                            <span className="landing-stat-label">{translated.statsOnline}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits + Pricing Side by Side */}
            <section className="landing-section">
                <div className="landing-container">
                    <div className="landing-benefits-pricing">
                        {/* Benefits */}
                        <div className="landing-benefits">
                            <h2 className="landing-section-title">{translated.whatYouGet}</h2>
                            <ul className="landing-benefits-list">
                                {finalBenefits.map((benefit, i) => (
                                    <li key={i} className="landing-benefit-item">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="landing-benefit-check">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                        </svg>
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Pricing Sidebar */}
                        <div className="landing-pricing-wrapper">
                            <div className="landing-pricing-sidebar">
                                {settings.communityLogo ? (
                                    <ThemeLogo
                                        lightSrc={settings.communityLogo}
                                        darkSrc={settings.communityLogoDark}
                                        alt={settings.communityName}
                                        width={120}
                                        height={120}
                                        className="landing-pricing-logo"
                                    />
                                ) : (
                                    <div className="landing-pricing-logo-fallback">
                                        {settings.communityName.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <h3 className="landing-pricing-name">{settings.communityName}</h3>
                                {settings.communityDescription && (
                                    <p className="landing-pricing-desc">{settings.communityDescription}</p>
                                )}
                                <div className="landing-pricing-stats-mini">
                                    <span>{memberCount} {translated.statsMembers}</span>
                                </div>
                                <LandingPricing
                                    priceUsd={settings.landingPriceUsd}
                                    priceEur={settings.landingPriceEur}
                                    isEurope={isEurope}
                                    ctaText={allTranslated.ctaText}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="landing-section landing-about">
                <div className="landing-container">
                    <h2 className="landing-section-title">{translated.aboutTitle}</h2>
                    <div className="landing-about-text">
                        {allTranslated.description.split('\n').map((paragraph, i) => (
                            <p key={i}>{paragraph}</p>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="landing-container">
                    <div className="landing-footer-inner">
                        <div className="landing-footer-links">
                            <Link href="/login">{translated.logIn}</Link>
                            <span className="landing-footer-sep">·</span>
                            <Link href="/register">{translated.joinNow}</Link>
                        </div>
                        <div className="landing-footer-legal">
                            <span>{translated.privacyPolicy}</span>
                            <span className="landing-footer-sep">·</span>
                            <span>{translated.termsOfService}</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
