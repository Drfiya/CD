'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import db from '@/lib/db';

async function requireAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !canEditSettings(session.user.role)) {
        throw new Error('Unauthorized');
    }
    return session;
}

/**
 * Get all admin tools, ordered by creation date (newest first)
 */
export async function getAdminTools() {
    return db.adminTool.findMany({ orderBy: { createdAt: 'desc' } });
}

/**
 * Create a new admin tool
 */
export async function createAdminTool(data: {
    name: string;
    url: string;
    description?: string;
}) {
    await requireAdmin();

    const tool = await db.adminTool.create({
        data: {
            name: data.name,
            url: data.url,
            description: data.description || null,
        },
    });

    revalidatePath('/admin/dev-tracker/admin-tools');
    revalidatePath('/ai-tools');
    return tool;
}

/**
 * Delete an admin tool
 */
export async function deleteAdminTool(id: string) {
    await requireAdmin();

    await db.adminTool.delete({ where: { id } });

    revalidatePath('/admin/dev-tracker/admin-tools');
    revalidatePath('/ai-tools');
}
