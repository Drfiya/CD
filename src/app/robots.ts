// CR10 A2 — Robots policy. Landing is the only public surface; everything behind
// auth or admin/api endpoints is disallowed so search engines don't surface the
// signed-in app or trigger spurious 401 crawls.

import type { MetadataRoute } from 'next';

function resolveSiteUrl(): string {
    return (
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        'http://localhost:3000'
    );
}

export default function robots(): MetadataRoute.Robots {
    const siteUrl = resolveSiteUrl();
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                // Auth pages are intentionally NOT disallowed here — they ship with
                // a static `noindex` meta tag (CR10), so we let crawlers fetch them
                // and respect the page-level signal. Disallowing them in robots.txt
                // would block the noindex from ever being seen.
                disallow: [
                    '/admin/',
                    '/api/',
                    '/profile/',
                    '/feed/',
                    '/classroom/',
                    '/calendar/',
                    '/events/',
                    '/leaderboard/',
                    '/members/',
                    '/search/',
                    '/onboarding/',
                    '/ai-tools/',
                ],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
    };
}
