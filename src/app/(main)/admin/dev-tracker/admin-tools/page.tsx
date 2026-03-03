import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getAdminTools } from '@/lib/admin-tool-actions';
import { AdminToolManager } from '@/components/admin/dev-tracker/admin-tool-manager';

export const metadata: Metadata = {
    title: 'Admin Tools | Command Center',
};

export default async function AdminToolsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    if (!canEditSettings(session.user.role)) {
        redirect('/admin/posts');
    }

    const tools = await getAdminTools();

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">
                    Admin Tools
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage external tools and links visible to community members in the AI Tools section.
                </p>
            </div>

            <AdminToolManager tools={tools} />
        </div>
    );
}
