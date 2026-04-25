/**
 * Round 6 / A5 — Combined Grace + Visibility Integration Test.
 *
 * Tests the interaction between `createConnectionGrace` (connection-banner
 * delay logic) and `createVisibilityAwarePoller` (tab-hidden polling pause)
 * when used together — as they are in the UnreadBadge + ChatWindow components.
 *
 * Both helpers accept injected timers and a mock document so the tests are
 * deterministic: no real `setTimeout` or DOM APIs required.
 */

import { describe, it, expect, vi } from 'vitest';
import { createConnectionGrace } from '../src/components/messages/connection-grace';
import { createVisibilityAwarePoller } from '../src/components/messages/visibility-polling';

// ---------------------------------------------------------------------------
// Shared timer shims
// ---------------------------------------------------------------------------

function makeTimers() {
  let nowMs = 0;
  const pending: Array<{ id: number; fireAt: number; fn: () => void }> = [];
  let nextId = 1;

  return {
    setTimeout(fn: () => void, ms: number): number {
      const id = nextId++;
      pending.push({ id, fireAt: nowMs + ms, fn });
      return id;
    },
    clearTimeout(id: unknown): void {
      const i = pending.findIndex((t) => t.id === id);
      if (i !== -1) pending.splice(i, 1);
    },
    advance(ms: number): void {
      nowMs += ms;
      // Fire all timers whose fireAt <= nowMs (in order).
      const due = pending.filter((t) => t.fireAt <= nowMs).sort((a, b) => a.fireAt - b.fireAt);
      for (const t of due) {
        const i = pending.findIndex((x) => x.id === t.id);
        if (i !== -1) pending.splice(i, 1);
        t.fn();
      }
    },
  };
}

function makeIntervalTimers() {
  let nowMs = 0;
  const intervals: Array<{ id: ReturnType<typeof setInterval>; fn: () => void; ms: number; lastFiredAt: number }> = [];
  let nextId = 1 as unknown as ReturnType<typeof setInterval>;

  function tick(ms: number) {
    nowMs += ms;
    for (const iv of intervals) {
      while (iv.lastFiredAt + iv.ms <= nowMs) {
        iv.lastFiredAt += iv.ms;
        iv.fn();
      }
    }
  }

  return {
    setInterval(fn: () => void, ms: number): ReturnType<typeof setInterval> {
      const id = nextId;
      nextId = (Number(nextId) + 1) as unknown as ReturnType<typeof setInterval>;
      intervals.push({ id, fn, ms, lastFiredAt: nowMs });
      return id;
    },
    clearInterval(id: ReturnType<typeof setInterval>): void {
      const i = intervals.findIndex((x) => x.id === id);
      if (i !== -1) intervals.splice(i, 1);
    },
    tick,
    get activeCount() { return intervals.length; },
  };
}

function makeDoc(initiallyHidden = false) {
  let hidden = initiallyHidden;
  const listeners: (() => void)[] = [];
  return {
    get hidden() { return hidden; },
    addEventListener(_type: string, fn: () => void) { listeners.push(fn); },
    removeEventListener(_type: string, fn: () => void) {
      const i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    },
    setHidden(value: boolean) {
      hidden = value;
      listeners.forEach((fn) => fn());
    },
    get listenerCount() { return listeners.length; },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Grace + Visibility Integration', () => {
  // -------------------------------------------------------------------------
  // A5-1: Poller fires intervals when document is visible
  // -------------------------------------------------------------------------
  it('poller fires the refresh callback at the interval while visible', () => {
    const timers = makeIntervalTimers();
    const doc = makeDoc(false); // visible
    const refresh = vi.fn();

    const poller = createVisibilityAwarePoller({
      refresh,
      intervalMs: 1000,
      doc,
      timers,
    });
    poller.start();

    // start() arms the interval but does NOT fire refresh — the caller (e.g.
    // UnreadBadge) does the initial fetch before calling poller.start().
    expect(refresh).toHaveBeenCalledTimes(0);

    timers.tick(1000);
    expect(refresh).toHaveBeenCalledTimes(1);

    timers.tick(1000);
    expect(refresh).toHaveBeenCalledTimes(2);

    poller.stop();
  });

  // -------------------------------------------------------------------------
  // A5-2: Poller pauses interval when document is hidden
  // -------------------------------------------------------------------------
  it('poller stops firing when the document becomes hidden', () => {
    const timers = makeIntervalTimers();
    const doc = makeDoc(false);
    const refresh = vi.fn();

    const poller = createVisibilityAwarePoller({ refresh, intervalMs: 1000, doc, timers });
    poller.start();
    expect(refresh).toHaveBeenCalledTimes(0); // interval armed, no immediate call

    timers.tick(1000); // +1 interval tick while visible
    expect(refresh).toHaveBeenCalledTimes(1);

    doc.setHidden(true); // tab goes hidden
    timers.tick(3000); // 3 ticks pass with tab hidden
    // No new refresh calls while hidden
    expect(refresh).toHaveBeenCalledTimes(1);

    poller.stop();
  });

  // -------------------------------------------------------------------------
  // A5-3: Poller fires an immediate refresh when visibility is regained
  // -------------------------------------------------------------------------
  it('poller fires immediate catch-up refresh on visibility regain', () => {
    const timers = makeIntervalTimers();
    const doc = makeDoc(true); // start hidden
    const refresh = vi.fn();

    const poller = createVisibilityAwarePoller({ refresh, intervalMs: 1000, doc, timers });
    poller.start();

    // Started hidden → no initial refresh, no interval ticks
    expect(refresh).not.toHaveBeenCalled();
    expect(timers.activeCount).toBe(0);

    timers.tick(5000); // nothing fires
    expect(refresh).not.toHaveBeenCalled();

    doc.setHidden(false); // tab becomes visible
    // Immediate catch-up refresh expected
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(timers.activeCount).toBe(1); // interval now running

    timers.tick(1000);
    expect(refresh).toHaveBeenCalledTimes(2);

    poller.stop();
  });

  // -------------------------------------------------------------------------
  // A5-4: Grace banner stays hidden when SUBSCRIBED within grace window
  // -------------------------------------------------------------------------
  it('grace banner does not appear when channel subscribes within grace window', () => {
    const timers = makeTimers();
    const visibleChanges: boolean[] = [];

    const grace = createConnectionGrace({
      delayMs: 500,
      onVisibleChange: (v) => visibleChanges.push(v),
      timers,
    });

    // Cold start — connecting state arms the 500 ms timer
    grace.setStatus('connecting');
    expect(visibleChanges).toEqual([]); // not shown yet

    // Channel subscribes before the 500 ms timer fires
    timers.advance(200);
    grace.setStatus('subscribed');
    timers.advance(400); // original timer window passes — but was cancelled

    // Banner should never have become visible
    expect(visibleChanges).not.toContain(true);
    grace.stop();
  });

  // -------------------------------------------------------------------------
  // A5-5: Grace banner appears when non-subscribed state holds past grace window
  // -------------------------------------------------------------------------
  it('grace banner appears when connecting state persists past the grace window', () => {
    const timers = makeTimers();
    const visibleChanges: boolean[] = [];

    const grace = createConnectionGrace({
      delayMs: 500,
      onVisibleChange: (v) => visibleChanges.push(v),
      timers,
    });

    grace.setStatus('connecting');
    expect(visibleChanges).toEqual([]);

    // Grace window expires without a SUBSCRIBED arrival
    timers.advance(500);
    expect(visibleChanges).toContain(true); // banner should now be visible

    // Channel recovers → banner hides immediately
    grace.setStatus('subscribed');
    expect(visibleChanges.at(-1)).toBe(false);
    grace.stop();
  });

  // -------------------------------------------------------------------------
  // A5-6: Reconnect flap re-arms grace timer (no double-flash on fast reconnect)
  // -------------------------------------------------------------------------
  it('reconnect flap re-arms the grace timer — fast reconnect produces no flash', () => {
    const timers = makeTimers();
    const visibleChanges: boolean[] = [];

    const grace = createConnectionGrace({
      delayMs: 500,
      onVisibleChange: (v) => visibleChanges.push(v),
      timers,
    });

    // Initially subscribe successfully
    grace.setStatus('connecting');
    timers.advance(500);
    expect(visibleChanges).toContain(true);

    grace.setStatus('subscribed');
    const trueCount = visibleChanges.filter(Boolean).length;

    // Brief disconnect — channel drops back to connecting, re-arms 500 ms grace
    grace.setStatus('connecting');
    // Fast reconnect before grace fires
    timers.advance(100);
    grace.setStatus('subscribed');
    timers.advance(500); // grace window passes but was cancelled

    // No new `true` should have appeared during the brief flap
    const newTrueCount = visibleChanges.filter(Boolean).length;
    expect(newTrueCount).toBe(trueCount);

    grace.stop();
  });
});
