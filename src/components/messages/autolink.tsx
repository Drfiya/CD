import type { ReactNode } from 'react';

// Match http(s) URLs and bare domains starting with www.
// Bounded by word boundaries / whitespace to keep things simple.
// We deliberately do NOT accept `javascript:` / `data:` / etc. — only http(s).
//
// Round 2 / A5 — The character class excludes `,;"'` in addition to whitespace
// and `<>`. In chat bodies these characters always mark a boundary between
// URL and surrounding text (e.g. `https://a.com,https://b.com` = two anchors,
// `Visit "https://example.com"` = href without the quote). RFC 3986 technically
// allows `,` in URLs, but application pragma > spec completeness here.
const URL_REGEX = /(\bhttps?:\/\/[^\s<>,;"']+|\bwww\.[^\s<>,;"']+)/gi;

// Strip a single trailing punctuation char (., ,, !, ?, ), ], }, ;, :)
// so that "check https://example.com." renders as a link to "https://example.com"
// with the period left as plain text. Keeps the visual noise out of the anchor.
function splitTrailingPunct(url: string): [string, string] {
  const match = url.match(/[.,!?)\]};:]+$/);
  if (!match) return [url, ''];
  return [url.slice(0, -match[0].length), match[0]];
}

function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

/**
 * Render plain-text message body with http(s) URLs as safe `<a>` tags.
 *
 * Safety:
 * - React escapes all text children by default → no XSS via message body.
 * - Only http/https/bare-domain URLs are linked; `javascript:` / `data:` never match.
 * - `rel="noopener noreferrer"` prevents `window.opener` tab-nabbing.
 * - `target="_blank"` opens in a new tab to preserve chat state.
 */
export function renderMessageBody(text: string): ReactNode {
  if (!text) return null;

  // Unescape HTML entities (e.g. &#x27; -> ') before splitting/linking.
  // This prevents double-escaping when serving raw DB content in English.
  const decodedText = decodeEntities(text);

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state (it's a shared global)
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(decodedText)) !== null) {
    const [raw] = match;
    const start = match.index;
    const end = start + raw.length;

    if (start > lastIndex) {
      nodes.push(decodedText.slice(lastIndex, start));
    }

    const [urlBody, trailing] = splitTrailingPunct(raw);
    const href = ensureProtocol(urlBody);

    nodes.push(
      <a
        key={`${start}-${urlBody}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 text-primary hover:text-primary/80 break-all"
      >
        {urlBody}
      </a>,
    );

    if (trailing) nodes.push(trailing);

    lastIndex = end;
  }

  if (lastIndex < decodedText.length) {
    nodes.push(decodedText.slice(lastIndex));
  }

  return nodes;
}

function decodeEntities(text: string) {
  if (!text || !text.includes('&')) return text;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}
