'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-guards';
import db from '@/lib/db';

/**
 * Get all admin tools, ordered by creation date (newest first)
 */
export async function getAdminTools() {
    await requireAdmin();
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
