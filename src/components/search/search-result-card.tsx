import Link from 'next/link';
import type { SearchResult } from '@/lib/search-actions';

const TYPE_CONFIG = {
  post: { label: 'Post', href: (id: string) => `/feed/${id}` },
  user: { label: 'Member', href: (id: string) => `/members/${id}` },
  course: { label: 'Course', href: (id: string) => `/classroom/courses/${id}` },
} as const;

interface SearchResultCardProps {
  result: SearchResult;
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const config = TYPE_CONFIG[result.type];

  return (
    <Link
      href={config.href(result.id)}
      className="block border rounded-lg p-4 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-muted rounded">
          {config.label}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium truncate">{result.title}</h3>
          {/* Safe: snippet comes from Postgres ts_headline() which escapes HTML entities.
              Re-audit if ts_headline() config (StartSel/StopSel/HighlightAll) is customized. */}
          <p
            className="mt-1 text-sm text-muted-foreground line-clamp-2 [&_mark]:bg-yellow-200"
            dangerouslySetInnerHTML={{ __html: result.snippet }}
          />
        </div>
      </div>
    </Link>
  );
}
