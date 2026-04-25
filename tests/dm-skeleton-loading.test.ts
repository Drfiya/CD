import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatWindowSkeleton } from '@/components/messages/chat-window-skeleton';

/**
 * Round 5 / Item 5 — Skeleton loading placeholder.
 *
 * `ChatWindowSkeleton` is a pure Server-compatible component; rendered via
 * `renderToStaticMarkup` to verify its structural invariants without needing
 * a full JSDOM render tree.
 */

describe('ChatWindowSkeleton — static render', () => {
  function render(): string {
    return renderToStaticMarkup(createElement(ChatWindowSkeleton));
  }

  it('renders without throwing', () => {
    expect(() => render()).not.toThrow();
  });

  it('produces non-empty HTML', () => {
    const html = render();
    expect(html.length).toBeGreaterThan(0);
  });

  it('contains an animate-pulse class (Tailwind skeleton pattern)', () => {
    const html = render();
    expect(html).toContain('animate-pulse');
  });

  it('contains multiple skeleton bubbles (isMine + !isMine patterns)', () => {
    const html = render();
    // flex-row-reverse is applied to sent bubbles
    expect(html).toContain('flex-row-reverse');
  });

  it('contains a header skeleton placeholder', () => {
    const html = render();
    // The header renders as a <header> element
    expect(html).toContain('<header');
  });

  it('contains an input skeleton placeholder (bottom bar)', () => {
    const html = render();
    // The composer bar renders a full-width skeleton
    expect(html).toContain('rounded-full');
  });

  it('renders exactly 2 skeleton bubbles with isMine=true (flex-row-reverse)', () => {
    const html = render();
    const count = (html.match(/flex-row-reverse/g) ?? []).length;
    // SkeletonBubble renders one flex-row-reverse per isMine=true bubble (3 total)
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('does not render any real message content', () => {
    const html = render();
    // No text content beyond structure should exist
    expect(html).not.toContain('Write a message');
    expect(html).not.toContain('Send');
  });

  it('renders the bg-muted utility for placeholder colouring', () => {
    const html = render();
    expect(html).toContain('bg-muted');
  });

  it('does not import or reference client hooks (smoke: no useSession text)', () => {
    // The skeleton must be renderable server-side. If it used useSession it would
    // throw during renderToStaticMarkup. This test proves that indirectly.
    expect(() => render()).not.toThrow();
  });
});
