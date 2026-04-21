// CR10 A2 — Dynamic Open Graph image for the public landing route.
// Next.js 16 native (next/og), 1200×630, brand palette only.
// Runtime note: brief specified `edge`, but the project's Prisma + pg adapter
// chain is Node-only — Edge breaks the build (`crypto`/`node:path` in the
// translation utils). We stay on the Node.js runtime so the live DB reads work
// without dragging the translation chain into an Edge bundle.
// Every DB read is wrapped fail-open: a DB hiccup must never break OG render.

import { ImageResponse } from 'next/og';
import db from '@/lib/db';

export const runtime = 'nodejs';
export const alt = 'Join the community';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand palette (CR10 constraint — strict).
const BG_DEEP = '#0a0a0a';        // Dunkel-Anthrazit
const BG_PANEL = '#1f2937';       // Anthrazit
const BRAND_RED = '#D94A4A';
const BRAND_WHITE = '#ffffff';
const NEUTRAL = '#d1d5db';

export default async function OpengraphImage() {
    let communityName = 'ScienceExperts.ai';
    let communityDescription =
        'Where science meets AI — courses, community, and global collaboration.';
    let memberCount = 0;

    try {
        // Lean direct query — only the two columns we render. Avoids the heavier
        // `getCommunitySettings()` path which transitively imports the translation
        // chain (not needed for OG, and adds bundle weight).
        const row = await db.communitySettings.findUnique({
            where: { id: 'singleton' },
            select: { communityName: true, communityDescription: true },
        });
        if (row) {
            communityName = row.communityName || communityName;
            communityDescription = row.communityDescription || communityDescription;
        }
    } catch (err) {
        console.error('[opengraph-image] settings read failed, using defaults:', err);
    }

    try {
        memberCount = await db.user.count();
    } catch (err) {
        console.error('[opengraph-image] member count failed, defaulting to 0:', err);
        memberCount = 0;
    }

    // Round down to nearest 10 for the public number (matches landing page convention).
    const roundedMembers = Math.max(0, Math.floor(memberCount / 10) * 10);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: `linear-gradient(135deg, ${BG_DEEP} 0%, ${BG_PANEL} 100%)`,
                    padding: '72px',
                    color: BRAND_WHITE,
                    fontFamily: 'sans-serif',
                }}
            >
                {/* Brand row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            background: BRAND_RED,
                        }}
                    />
                    <span
                        style={{
                            fontSize: 28,
                            fontWeight: 600,
                            letterSpacing: 0.5,
                            color: NEUTRAL,
                        }}
                    >
                        {communityName}
                    </span>
                </div>

                {/* Headline */}
                <div
                    style={{
                        marginTop: 56,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 24,
                        flexGrow: 1,
                    }}
                >
                    <div
                        style={{
                            fontSize: 76,
                            fontWeight: 800,
                            lineHeight: 1.05,
                            color: BRAND_WHITE,
                            display: 'flex',
                        }}
                    >
                        {communityName}
                    </div>
                    <div
                        style={{
                            fontSize: 32,
                            fontWeight: 400,
                            lineHeight: 1.35,
                            color: NEUTRAL,
                            display: 'flex',
                            maxWidth: 1000,
                        }}
                    >
                        {communityDescription}
                    </div>
                </div>

                {/* Footer band */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: `1px solid ${BG_PANEL}`,
                        paddingTop: 32,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                        <span style={{ fontSize: 44, fontWeight: 700, color: BRAND_WHITE }}>
                            {roundedMembers > 0 ? `${roundedMembers}+` : 'New'}
                        </span>
                        <span style={{ fontSize: 24, color: NEUTRAL }}>
                            {roundedMembers > 0 ? 'members' : 'community'}
                        </span>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: BRAND_RED,
                            color: BRAND_WHITE,
                            padding: '16px 32px',
                            borderRadius: 12,
                            fontSize: 26,
                            fontWeight: 600,
                        }}
                    >
                        Join now →
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
