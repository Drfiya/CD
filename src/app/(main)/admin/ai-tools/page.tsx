import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getAiTools } from '@/lib/ai-tool-actions';
import { AiToolTable } from '@/components/admin/ai-tool-table';

export const metadata: Metadata = {
    title: 'AI Tools Management | Admin',
};

export default async function AdminAiToolsPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect('/login');
    }

    if (!canEditSettings(session.user.role)) {
        redirect('/admin/posts');
    }

    const tools = await getAiTools();

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">
                    AI Tools Management
                </h1>
                <p className="text-muted-foreground mt-1">
                    Add, edit, and manage AI tools displayed in the sidebar and on the AI Tools page.
                </p>
            </div>

            <AiToolTable tools={tools} />
        </div>
    );
}
