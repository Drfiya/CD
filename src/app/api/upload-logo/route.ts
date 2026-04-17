import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { checkRateLimit, rateLimitHeaders } from '@/lib/api/rate-limit';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!canEditSettings(session.user.role)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const rateLimit = checkRateLimit({
        scope: 'upload-logo',
        limit: 10,
        windowMs: 60_000,
        userId: session.user.id,
        req,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429, headers: rateLimitHeaders(rateLimit) }
        );
    }

    const formData = await req.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 });
    }

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Determine extension
        const ext = file.name.split('.').pop() || 'png';
        const filename = `community-logo.${ext}`;
        const publicDir = join(process.cwd(), 'public');
        const filepath = join(publicDir, filename);

        // Remove old logos with different extensions
        const extensions = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
        for (const e of extensions) {
            const oldPath = join(publicDir, `community-logo.${e}`);
            if (e !== ext && existsSync(oldPath)) {
                await unlink(oldPath).catch(() => { });
            }
        }

        // Write the file
        await writeFile(filepath, buffer);

        // Return the public URL path (cache-bust with timestamp)
        const url = `/${filename}?v=${Date.now()}`;

        return NextResponse.json({ success: true, url });
    } catch (error) {
        console.error('Logo upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
