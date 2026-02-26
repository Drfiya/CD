import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canModerateContent } from '@/lib/permissions';
import { AdminTabs } from '@/components/admin/admin-tabs';
import type { Role } from '@/lib/permissions';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userRole = session.user.role;

  // Only moderator+ can access admin section
  if (!canModerateContent(userRole)) {
    redirect('/feed');
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Admin header */}
      <div className="bg-neutral-900 border-b border-neutral-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold text-neutral-100">Admin Dashboard</h1>
        </div>
      </div>

      {/* Admin navigation tabs */}
      <AdminTabs role={userRole as Role} />

      {/* Page content - with card styling */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
}
