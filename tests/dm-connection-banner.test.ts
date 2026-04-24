import { describe, it, expect } from 'vitest';
import { createElement, Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ConnectionBanner,
  mapRealtimeStatus,
} from '@/components/messages/connection-banner';
import {
  createConnectionGrace,
  type GraceTimers,
} from '@/components/messages/connection-grace';

const i18n = {
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
};

function render(node: ReactNode): string {
  return renderToStaticMarkup(createElement(Fragment, null, node));
}

describe('mapRealtimeStatus (Round 2 / A1)', () => {
  it('maps SUBSCRIBED → subscribed', () => {
    expect(mapRealtimeStatus('SUBSCRIBED')).toBe('subscribed');
  });

  it('maps CHANNEL_ERROR / TIMED_OUT / CLOSED → degraded', () => {
    expect(mapRealtimeStatus('CHANNEL_ERROR')).toBe('degraded');
    expect(mapRealtimeStatus('TIMED_OUT')).toBe('degraded');
    expect(mapRealtimeStatus('CLOSED')).toBe('degraded');
  });

  it('returns null for unrecognised status strings (caller keeps previous state)', () => {
    expect(mapRealtimeStatus('JOINING')).toBeNull();
    expect(mapRealtimeStatus('')).toBeNull();
  });
});

describe('<ConnectionBanner /> (Round 2 / A1)', () => {
  it('Case 1 — mount with status=connecting → banner is visible with the connecting label', () => {
    const html = render(
      createElement(ConnectionBanner, { status: 'connecting', messages: i18n }),
    );
    expect(html).toContain('Connecting…');
    // aria-live="polite" so screen readers announce status transitions
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it('Case 2 — status=subscribed → banner disappears (renders null)', () => {
    const html = render(
      createElement(ConnectionBanner, { status: 'subscribed', messages: i18n }),
    );
    expect(html).toBe('');
  });

  it('Case 3 — status=degraded → banner shows the reconnecting label', () => {
    const html = render(
      createElement(ConnectionBanner, { status: 'degraded', messages: i18n }),
    );
    expect(html).toContain('Reconnecting…');
    expect(html).not.toContain('Connecting…');
    expect(html).toContain('role="status"');
  });
});

/**
 * Round 3 / A2 — grace-period state machine.
 *
 * The helper is driven through an injected `timers` shim so the test can
 * deterministically advance (or skip) the 500 ms timer without relying on
 * real time or on `vi.useFakeTimers` (Vitest-native, mirrors the
 * `visibility-polling.ts` test pattern).
 */
describe('createConnectionGrace (Round 3 / A2)', () => {
  /** A tiny deterministic `timers` shim: records every setTimeout call so
   *  the test can fire them explicitly. */
  function makeTimers() {
    type Scheduled = { id: number; fn: () => void; delay: number; live: boolean };
    const scheduled: Scheduled[] = [];
    let nextId = 1;

    const timers: GraceTimers = {
      setTimeout: (fn, ms) => {
        const id = nextId++;
        scheduled.push({ id, fn, delay: ms, live: true });
        return id;
      },
      clearTimeout: (handle) => {
        const entry = scheduled.find((s) => s.id === handle);
        if (entry) entry.live = false;
      },
    };

    function flush() {
      for (const entry of scheduled) {
        if (entry.live) {
          entry.live = false;
          entry.fn();
        }
      }
    }

    function liveCount() {
      return scheduled.filter((s) => s.live).length;
    }

    return { timers, flush, liveCount, scheduled };
  }

  it('fast SUBSCRIBE (within 500 ms) produces zero banner render', () => {
    const changes: boolean[] = [];
    const { timers, flush, liveCount } = makeTimers();
    const grace = createConnectionGrace({
      delayMs: 500,
      timers,
      onVisibleChange: (v) => changes.push(v),
    });

    grace.setStatus('connecting');
    // There is one live timer armed, but we SUBSCRIBE before it fires.
    expect(liveCount()).toBe(1);
    grace.setStatus('subscribed');
    // Timer is cancelled, no visible=true ever emitted.
    expect(liveCount()).toBe(0);
    // Flushing any residual scheduled timers must not flip visibility.
    flush();

    // The callback never flipped to visible=true at all.
    expect(changes.includes(true)).toBe(false);
  });

  it('slow SUBSCRIBE (after 500 ms) renders the banner, then hides on SUBSCRIBED', () => {
    const changes: boolean[] = [];
    const { timers, flush } = makeTimers();
    const grace = createConnectionGrace({
      delayMs: 500,
      timers,
      onVisibleChange: (v) => changes.push(v),
    });

    grace.setStatus('connecting');
    // Simulate "500 ms elapsed without SUBSCRIBED arriving": fire the timer.
    flush();
    expect(changes).toEqual([true]);

    // Connection finally recovers.
    grace.setStatus('subscribed');
    expect(changes).toEqual([true, false]);
  });

  it('flap (SUBSCRIBED → CHANNEL_ERROR) re-arms the 500 ms timer; no instant banner', () => {
    const changes: boolean[] = [];
    const { timers, flush, liveCount } = makeTimers();
    const grace = createConnectionGrace({
      delayMs: 500,
      timers,
      onVisibleChange: (v) => changes.push(v),
    });

    // Healthy connection on mount.
    grace.setStatus('subscribed');
    expect(changes).toEqual([]); // banner was never visible

    // Channel error (flap).
    grace.setStatus('degraded');
    // A fresh timer must be armed — not re-using a prior one, not surfacing
    // visible=true synchronously.
    expect(liveCount()).toBe(1);
    expect(changes).toEqual([]);

    // If reconnect happens within the grace window, the banner stays silent.
    grace.setStatus('subscribed');
    expect(liveCount()).toBe(0);
    expect(changes.includes(true)).toBe(false);

    // Second flap — if the outage outlasts 500 ms this time, the banner does
    // appear. Re-arming on every SUBSCRIBED → non-subscribed transition is
    // the contract we want.
    grace.setStatus('degraded');
    flush();
    expect(changes).toEqual([true]);
  });

  it('status transitions within the non-subscribed family do NOT reset the timer', () => {
    const changes: boolean[] = [];
    const { timers, flush, scheduled } = makeTimers();
    const grace = createConnectionGrace({
      delayMs: 500,
      timers,
      onVisibleChange: (v) => changes.push(v),
    });

    grace.setStatus('connecting');
    expect(scheduled.filter((s) => s.live).length).toBe(1);

    // Moving connecting → degraded (still "not good") should keep the same
    // timer — from the user's perspective the outage is one continuous event.
    grace.setStatus('degraded');
    expect(scheduled.filter((s) => s.live).length).toBe(1);
    // Same scheduled entry — total count across history hasn't grown.
    expect(scheduled.length).toBe(1);

    // Timer fires, banner appears.
    flush();
    expect(changes).toEqual([true]);
  });

  it('stop() cancels the pending timer and emits no further visibility changes', () => {
    const changes: boolean[] = [];
    const { timers, flush, liveCount } = makeTimers();
    const grace = createConnectionGrace({
      delayMs: 500,
      timers,
      onVisibleChange: (v) => changes.push(v),
    });

    grace.setStatus('connecting');
    expect(liveCount()).toBe(1);
    grace.stop();
    expect(liveCount()).toBe(0);
    flush();
    expect(changes).toEqual([]);
  });
});
