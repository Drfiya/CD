import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import db from '@/lib/db';
import { CategoryForm } from '@/components/admin/category-form';
import { CategoryList } from '@/components/admin/category-list';

export const metadata: Metadata = {
  title: 'Category Management | Admin',
};

export default async function AdminCategoriesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Requires admin+ role (layout handles moderator+ check)
  if (!canEditSettings(session.user.role)) {
    redirect('/admin/moderation');
  }

  // Fetch all categories with post count
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      color: true,
      _count: {
        select: { posts: true },
      },
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Category Management</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage post categories
        </p>
      </div>

      {/* Category creation form */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-medium mb-4">Create Category</h2>
        <CategoryForm />
      </div>

      {/* Existing categories */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-medium mb-4">Categories</h2>
        <CategoryList categories={categories} />
      </div>
    </div>
  );
}
