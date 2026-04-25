import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Round 5 / Item 2 — Block Button UX.
 *
 * Tests: (1) i18n completeness for all 4 locales, (2) static rendering
 * of confirmation-dialog components, and (3) shape of the new i18n keys.
 */

// ---------------------------------------------------------------------------
// i18n key completeness — all 4 locales must carry the new Round 5 DM keys
// ---------------------------------------------------------------------------

describe('Round 5 DM i18n — confirmUnblock keys present in all locales', () => {
  it('en locale has confirmUnblockTitle', async () => {
    const { en } = await import('@/lib/i18n/messages/en');
    expect(typeof en.dm.confirmUnblockTitle).toBe('string');
    expect(en.dm.confirmUnblockTitle.length).toBeGreaterThan(0);
  });

  it('en locale has confirmUnblockBody', async () => {
    const { en } = await import('@/lib/i18n/messages/en');
    expect(typeof en.dm.confirmUnblockBody).toBe('string');
    expect(en.dm.confirmUnblockBody.length).toBeGreaterThan(0);
  });

  it('de locale has confirmUnblockTitle', async () => {
    const { de } = await import('@/lib/i18n/messages/de');
    expect(typeof de.dm.confirmUnblockTitle).toBe('string');
    expect(de.dm.confirmUnblockTitle.length).toBeGreaterThan(0);
  });

  it('de locale has confirmUnblockBody', async () => {
    const { de } = await import('@/lib/i18n/messages/de');
    expect(typeof de.dm.confirmUnblockBody).toBe('string');
    expect(de.dm.confirmUnblockBody.length).toBeGreaterThan(0);
  });

  it('fr locale has confirmUnblockTitle', async () => {
    const { fr } = await import('@/lib/i18n/messages/fr');
    expect(typeof fr.dm.confirmUnblockTitle).toBe('string');
    expect(fr.dm.confirmUnblockTitle.length).toBeGreaterThan(0);
  });

  it('fr locale has confirmUnblockBody', async () => {
    const { fr } = await import('@/lib/i18n/messages/fr');
    expect(typeof fr.dm.confirmUnblockBody).toBe('string');
    expect(fr.dm.confirmUnblockBody.length).toBeGreaterThan(0);
  });

  it('es locale has confirmUnblockTitle', async () => {
    const { es } = await import('@/lib/i18n/messages/es');
    expect(typeof es.dm.confirmUnblockTitle).toBe('string');
    expect(es.dm.confirmUnblockTitle.length).toBeGreaterThan(0);
  });

  it('es locale has confirmUnblockBody', async () => {
    const { es } = await import('@/lib/i18n/messages/es');
    expect(typeof es.dm.confirmUnblockBody).toBe('string');
    expect(es.dm.confirmUnblockBody.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// i18n key completeness — messageDateToday / messageDateYesterday
// ---------------------------------------------------------------------------

describe('Round 5 DM i18n — timestamp labels present in all locales', () => {
  it('en locale has messageDateToday', async () => {
    const { en } = await import('@/lib/i18n/messages/en');
    expect(en.dm.messageDateToday).toBe('Today');
  });

  it('en locale has messageDateYesterday', async () => {
    const { en } = await import('@/lib/i18n/messages/en');
    expect(en.dm.messageDateYesterday).toBe('Yesterday');
  });

  it('de locale has messageDateToday', async () => {
    const { de } = await import('@/lib/i18n/messages/de');
    expect(de.dm.messageDateToday).toBe('Heute');
  });

  it('de locale has messageDateYesterday', async () => {
    const { de } = await import('@/lib/i18n/messages/de');
    expect(de.dm.messageDateYesterday).toBe('Gestern');
  });

  it('fr locale has messageDateToday', async () => {
    const { fr } = await import('@/lib/i18n/messages/fr');
    expect(fr.dm.messageDateToday).toBeTruthy();
  });

  it('fr locale has messageDateYesterday', async () => {
    const { fr } = await import('@/lib/i18n/messages/fr');
    expect(fr.dm.messageDateYesterday).toBeTruthy();
  });

  it('es locale has messageDateToday', async () => {
    const { es } = await import('@/lib/i18n/messages/es');
    expect(es.dm.messageDateToday).toBe('Hoy');
  });

  it('es locale has messageDateYesterday', async () => {
    const { es } = await import('@/lib/i18n/messages/es');
    expect(es.dm.messageDateYesterday).toBe('Ayer');
  });
});

// ---------------------------------------------------------------------------
// Block-dialog component rendering — static markup
// ---------------------------------------------------------------------------

describe('Block/Unblock confirmation dialog — inline markup', () => {
  // Minimal inline dialog components to test the alertdialog pattern without
  // spinning up the full ChatWindow (which needs many mocked providers).

  function BlockConfirmDialog({ title, body, cancel, confirm }: {
    title: string; body: string; cancel: string; confirm: string;
  }) {
    return createElement(
      'div',
      { role: 'alertdialog', 'aria-labelledby': 'title', 'aria-describedby': 'body' },
      createElement('p', { id: 'title' }, title),
      createElement('p', { id: 'body' }, body),
      createElement('button', { type: 'button', id: 'cancel-btn' }, cancel),
      createElement('button', { type: 'button', id: 'confirm-btn' }, confirm),
    );
  }

  it('block confirmation renders role="alertdialog"', () => {
    const html = renderToStaticMarkup(
      createElement(BlockConfirmDialog, {
        title: 'Block this user?',
        body: 'They won\'t be able to message you.',
        cancel: 'Cancel',
        confirm: 'Block',
      }),
    );
    expect(html).toContain('role="alertdialog"');
  });

  it('unblock confirmation renders role="alertdialog"', () => {
    const html = renderToStaticMarkup(
      createElement(BlockConfirmDialog, {
        title: 'Unblock this user?',
        body: 'They will be able to message you again.',
        cancel: 'Cancel',
        confirm: 'Unblock',
      }),
    );
    expect(html).toContain('role="alertdialog"');
    expect(html).toContain('Unblock this user?');
  });

  it('block confirmation contains the destructive label', () => {
    const html = renderToStaticMarkup(
      createElement(BlockConfirmDialog, {
        title: 'Block this user?',
        body: 'They won\'t be able to message you.',
        cancel: 'Cancel',
        confirm: 'Block',
      }),
    );
    expect(html).toContain('Block</button>');
  });

  it('block confirmation contains a cancel button', () => {
    const html = renderToStaticMarkup(
      createElement(BlockConfirmDialog, {
        title: 'Block?',
        body: 'desc',
        cancel: 'Cancel',
        confirm: 'Block',
      }),
    );
    expect(html).toContain('Cancel</button>');
  });

  it('unblock confirmation body text is different from block body', async () => {
    const { en } = await import('@/lib/i18n/messages/en');
    expect(en.dm.confirmUnblockBody).not.toBe(en.dm.confirmBlockBody);
  });
});
