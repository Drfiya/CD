/**
 * Content Segmenter
 *
 * Splits post/comment bodies into cache-friendly segments so that a single
 * changed paragraph does not invalidate the translation of the whole post.
 *
 * Strategy:
 *   - HTML content: split on block-level closing tags (</p>, </li>, </h*>,
 *     </blockquote>), keeping the delimiter attached to the preceding segment.
 *   - Plain text: split on double-newlines, then sentences if a single
 *     segment exceeds the soft upper bound.
 *
 * Each segment is translated independently and its own cache key is
 * (sha256 of segment + locale pair + glossaryId). Reassembly is a pure
 * string join — no structural transformation.
 */

const BLOCK_CLOSE = /(<\/(?:p|li|h[1-6]|blockquote|div|section|article|td|th)>)/gi;
const SEGMENT_MIN_CHARS = 40;   // below this, prefer merging with neighbour
const SEGMENT_MAX_CHARS = 1200; // above this, split further by sentence

function looksLikeHtml(content: string): boolean {
    return /<\w+[^>]*>/.test(content);
}

function splitByBlockTags(html: string): string[] {
    // Insert a unique marker after each block-close, then split on marker.
    // If the input happens to contain the sentinel we fall back to a
    // single-segment passthrough — preserving losslessness over granularity.
    const MARK = '\u0001__SEG__\u0001';
    if (html.includes(MARK) || html.includes('\u0001')) {
        return [html];
    }
    const marked = html.replace(BLOCK_CLOSE, (tag) => tag + MARK);
    return marked.split(MARK).filter((s) => s.length > 0);
}

function splitBySentence(text: string): string[] {
    // Conservative sentence split — keeps the delimiter AND preserves
    // whitespace. Losslessness contract: segments.join('') === text.
    //
    // Previously this path called .trim() on the (body + punct) pair, which
    // silently dropped the trailing whitespace of an unpunctuated tail
    // segment on long-form posts. That was a user-visible UGC mutation bug.
    const parts = text.split(/([.!?…]+[\s)"'»]*)/u);
    const segments: string[] = [];
    for (let i = 0; i < parts.length; i += 2) {
        const body = parts[i] ?? '';
        const punct = parts[i + 1] ?? '';
        const combined = body + punct;
        if (combined.length > 0) segments.push(combined);
    }
    return segments.length > 0 ? segments : [text];
}

function coalesce(segments: string[]): string[] {
    // Merge short fragments forward so we do not cache tiny scraps like
    // single </p> closers or whitespace-only chunks.
    const out: string[] = [];
    let buf = '';
    for (const seg of segments) {
        if (!seg.trim()) {
            buf += seg;
            continue;
        }
        if (buf.length + seg.length < SEGMENT_MIN_CHARS) {
            buf += seg;
        } else {
            if (buf) {
                out.push(buf + seg);
                buf = '';
            } else {
                out.push(seg);
            }
        }
    }
    if (buf) out.push(buf);
    return out;
}

export interface Segment {
    /** Raw segment text, ready to send to the translation provider as-is. */
    text: string;
    /** True for whitespace-only segments that are never translated. */
    skip: boolean;
}

/**
 * Split content into cache-friendly segments.
 *
 * Reassembly is just `segments.map(...).join('')` — the segmenter never
 * loses characters, so `segments.join('') === input`.
 */
export function segmentContent(content: string): Segment[] {
    if (!content) return [];

    let pieces: string[];

    if (looksLikeHtml(content)) {
        pieces = splitByBlockTags(content);
    } else {
        // Paragraph-first, then sentence-level as a fallback for very long
        // single paragraphs.
        pieces = content.split(/(\n{2,})/);
        const expanded: string[] = [];
        for (const p of pieces) {
            if (p.length > SEGMENT_MAX_CHARS) {
                expanded.push(...splitBySentence(p));
            } else {
                expanded.push(p);
            }
        }
        pieces = expanded;
    }

    const coalesced = coalesce(pieces);

    return coalesced.map((text) => ({
        text,
        skip: !text.trim(),
    }));
}
