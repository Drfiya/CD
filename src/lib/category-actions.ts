'use server';

import { revalidatePath } from 'next/cache';
import db from '@/lib/db';
import { categorySchema } from '@/lib/validations/category';
import { preTranslateAdminContent } from '@/lib/translation/pretranslate';
import { requireAuth, requireAdmin } from '@/lib/auth-guards';

export async function getCategories() {
  await requireAuth();
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      color: true,
    },
  });

  return categories;
}

export async function createCategory(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const validatedFields = categorySchema.safeParse({
    name: formData.get('name'),
    color: formData.get('color'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { name, color } = validatedFields.data;

  // Check for duplicate name
  const existing = await db.category.findUnique({
    where: { name },
  });

  if (existing) {
    return { error: 'A category with this name already exists' };
  }

  const category = await db.category.create({
    data: { name, color },
  });

  // Fire-and-forget: eagerly translate into all live languages
  preTranslateAdminContent('category', category.id, { name }).catch(() => {});

  revalidatePath('/admin/categories');
  revalidatePath('/feed');

  return { success: true };
}

export async function updateCategory(categoryId: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const category = await db.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    return { error: 'Category not found' };
  }

  const validatedFields = categorySchema.safeParse({
    name: formData.get('name'),
    color: formData.get('color'),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { name, color } = validatedFields.data;

  // Check for duplicate name (excluding current category)
  if (name !== category.name) {
    const existing = await db.category.findUnique({
      where: { name },
    });

    if (existing) {
      return { error: 'A category with this name already exists' };
    }
  }

  await db.category.update({
    where: { id: categoryId },
    data: { name, color },
  });

  // Fire-and-forget: eagerly re-translate if name changed
  if (name !== category.name) {
    preTranslateAdminContent('category', categoryId, { name }).catch(() => {});
  }

  revalidatePath('/admin/categories');
  revalidatePath('/feed');

  return { success: true };
}

export async function deleteCategory(categoryId: string) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const category = await db.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    return { error: 'Category not found' };
  }

  // Posts will have categoryId set to null via onDelete: SetNull
  await db.category.delete({
    where: { id: categoryId },
  });

  revalidatePath('/admin/categories');
  revalidatePath('/feed');

  return { success: true };
}
