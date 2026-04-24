import { describe, it, expect } from 'vitest';
import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderMessageBody } from '@/components/messages/autolink';

function render(text: string): string {
  const nodes = renderMessageBody(text) as ReactNode;
  return renderToStaticMarkup(createElement(Fragment, null, nodes));
}

describe('renderMessageBody (autolink)', () => {
  it('autolinks http(s) URLs', () => {
    const html = render('check https://example.com for details');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('autolinks bare www. domains and adds https:// protocol', () => {
    const html = render('visit www.example.com now');
    expect(html).toContain('href="https://www.example.com"');
  });

  it('does NOT autolink javascript: URIs (XSS safety)', () => {
    const html = render('click javascript:alert(1) here');
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain('<a href="javascript:');
  });

  it('does NOT autolink data: URIs', () => {
    const html = render('data:text/html,<script>alert(1)</script>');
    expect(html).not.toContain('href="data:');
  });

  it('escapes HTML in the plain text body', () => {
    const html = render('<script>alert(1)</script>');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('strips trailing punctuation from URL target but keeps it in rendered text', () => {
    const html = render('see https://example.com.');
    expect(html).toContain('href="https://example.com"');
    expect(html).toMatch(/<\/a>\./);
  });

  it('handles multiple URLs in one message', () => {
    const html = render('a https://one.com and https://two.com end');
    expect(html).toContain('href="https://one.com"');
    expect(html).toContain('href="https://two.com"');
  });

  it('returns null for empty input', () => {
    expect(renderMessageBody('')).toBeNull();
  });

  it('does not inject anchor for plain text', () => {
    const html = render('hello there friend');
    expect(html).not.toContain('<a ');
    expect(html).toContain('hello there friend');
  });

  // Round 2 / A5 — Boundary-fix regression probes. These were P6 in the
  // Examiner Round 1 adversarial report; kept permanent now.
  it('P6 — back-to-back URLs separated by a comma render as two anchors', () => {
    const html = render('check https://a.com,https://b.com end');
    const matches = html.match(/<a /g) ?? [];
    expect(matches).toHaveLength(2);
    expect(html).toContain('href="https://a.com"');
    expect(html).toContain('href="https://b.com"');
  });

  it('P6b — back-to-back URLs separated by a semicolon render as two anchors', () => {
    const html = render('links: https://a.com;https://b.com');
    const matches = html.match(/<a /g) ?? [];
    expect(matches).toHaveLength(2);
    expect(html).toContain('href="https://a.com"');
    expect(html).toContain('href="https://b.com"');
  });

  it('P6c — a quoted URL renders one anchor with the quote outside the href', () => {
    const html = render('Visit "https://example.com" please');
    const matches = html.match(/<a /g) ?? [];
    expect(matches).toHaveLength(1);
    expect(html).toContain('href="https://example.com"');
    // The closing quote must NOT leak into the anchor text.
    expect(html).not.toContain('https://example.com&quot;');
    expect(html).not.toContain('href="https://example.com&quot;"');
  });
});
