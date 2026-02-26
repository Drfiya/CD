import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canManageMembers } from '@/lib/permissions';
import { getMembersForAdmin } from '@/lib/admin-actions';
import { MemberTable } from '@/components/admin/member-table';
import Link from 'next/link';
import type { Role } from '@/lib/permissions';

export const metadata: Metadata = {
  title: 'Members | Admin',
};

interface MembersPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userRole = session.user.role;

  // Only admin+ can access member management
  if (!canManageMembers(userRole)) {
    redirect('/admin');
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  const { members, total, totalPages } = await getMembersForAdmin(page, 20);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Member Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage roles, ban, or remove members from the community
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'member' : 'members'} total
          </p>
        </div>

        <MemberTable members={members} actorRole={userRole as Role} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
            {page > 1 && (
              <Link
                href={`/admin/members?page=${page - 1}`}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Previous
              </Link>
            )}

            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>

            {page < totalPages && (
              <Link
                href={`/admin/members?page=${page + 1}`}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
