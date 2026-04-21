import Link from 'next/link';
import { MENTION_REGEX } from '@/lib/mentions';

/**
 * MentionChip renders `@name` as a blue pill that links to the members search.
 *
 * The `notranslate` class and `translate="no"` attribute keep GlobalTranslator
 * (and browser translators) from modifying the handle.
 */
export function MentionChip({ name }: { name: string }) {
  return (
    <Link
      href={`/members?q=${encodeURIComponent(name)}`}
      className="inline-block px-1.5 py-0.5 mx-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors notranslate"
      translate="no"
    >
      @{name}
    </Link>
  );
}

/**
 * Split a plain-text body into an array of string segments and MentionChip
 * elements. Use as children of a wrapper tag:
 *
 *   <p>{renderTextWithMentions(comment.content)}</p>
 *
 * Returns the original text unchanged (as a single string) when the body
 * contains no mentions — so callers don't pay a render cost for non-mention
 * text.
 */
export function renderTextWithMentions(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? '';
  // Reset the regex's lastIndex — matchAll handles this, but we keep a fresh
  // copy per call to avoid any shared-state surprises.
  const regex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let hasMatch = false;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    hasMatch = true;
    const [full, name] = match;
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    nodes.push(<MentionChip key={`m-${start}`} name={name} />);
    lastIndex = start + full.length;
  }
  if (!hasMatch) return text;
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}
