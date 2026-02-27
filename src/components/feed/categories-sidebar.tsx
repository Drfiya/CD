'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Category {
    id: string;
    name: string;
    color: string;
}

interface TranslatedUI {
    categoriesTitle: string;
    allPosts: string;
}

interface CategoriesSidebarProps {
    categories: Category[];
    activeCategory: string | null;
    translatedUI: TranslatedUI;
    sidebarBannerImage?: string | null;
    sidebarBannerUrl?: string | null;
    sidebarBannerEnabled?: boolean;
}

export function CategoriesSidebar({ categories, activeCategory, translatedUI, sidebarBannerImage, sidebarBannerUrl, sidebarBannerEnabled }: CategoriesSidebarProps) {
    const searchParams = useSearchParams();

    // Build URL with category filter
    const buildCategoryUrl = (categoryId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (categoryId) {
            params.set('category', categoryId);
        } else {
            params.delete('category');
        }
        params.delete('page'); // Reset to page 1 when changing category
        return `/feed?${params.toString()}`;
    };

    const showBanner = sidebarBannerEnabled && sidebarBannerImage;

    return (
        <aside className="hidden lg:block w-64 shrink-0 space-y-4">
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100 mb-4">{translatedUI.categoriesTitle}</h2>

                <nav className="space-y-1">
                    {/* All Posts */}
                    <Link
                        href={buildCategoryUrl(null)}
                        className={`
              block px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${!activeCategory
                                ? 'bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100'
                                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-700'
                            }
            `}
                    >
                        {translatedUI.allPosts}
                    </Link>

                    {/* Category list - names are already translated */}
                    {categories.map((category) => (
                        <Link
                            key={category.id}
                            href={buildCategoryUrl(category.id)}
                            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeCategory === category.id
                                    ? 'bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100'
                                    : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-700'
                                }
              `}
                        >
                            <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: category.color || '#6b7280' }}
                            />
                            <span>{category.name}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Sidebar Banner */}
            {showBanner && (
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-neutral-700">
                    {sidebarBannerUrl ? (
                        <a href={sidebarBannerUrl} className="block">
                            <img
                                src={sidebarBannerImage}
                                alt="Banner"
                                className="w-full aspect-[9/16] object-cover"
                            />
                        </a>
                    ) : (
                        <img
                            src={sidebarBannerImage}
                            alt="Banner"
                            className="w-full aspect-[9/16] object-cover"
                        />
                    )}
                </div>
            )}
        </aside>
    );
}
