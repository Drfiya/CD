import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVisibilityAwarePoller } from '@/components/messages/visibility-polling';

/**
 * Round 2 / A3 — Visibility-aware polling.
 *
 * These tests drive the extracted `createVisibilityAwarePoller` helper with
 * a fake `document` + fake timer shim so we can assert exactly when
 * `setInterval` / `clearInterval` are called and how `refresh` is triggered
 * across visibility transitions.
 *
 * Koum-Gate: background tabs must generate ZERO getTotalUnreadCount() calls.
 */

interface FakeDocument {
  hidden: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
  dispatch: (type: string) => void;
}

function makeFakeDocument(initialHidden = false): FakeDocument {
  const listeners = new Map<string, Set<() => void>>();
  return {
    hidden: initialHidden,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type) {
      for (const l of listeners.get(type) ?? []) l();
    },
  };
}

describe('createVisibilityAwarePoller (Round 2 / A3)', () => {
  let setIntervalSpy: ReturnType<typeof vi.fn>;
  let clearIntervalSpy: ReturnType<typeof vi.fn>;
  let nextHandle = 0;

  beforeEach(() => {
    nextHandle = 0;
    setIntervalSpy = vi.fn(() => ++nextHandle as unknown as ReturnType<typeof setInterval>);
    clearIntervalSpy = vi.fn();
  });

  it('Case 1 — pauses polling when document becomes hidden', () => {
    const doc = makeFakeDocument(false);
    const refresh = vi.fn();
    const poller = createVisibilityAwarePoller({
      refresh,
      intervalMs: 60_000,
      doc,
      timers: { setInterval: setIntervalSpy, clearInterval: clearIntervalSpy },
    });

    poller.start();
    // Visible start → setInterval was called once.
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    // Tab goes into the background.
    doc.hidden = true;
    doc.dispatch('visibilitychange');

    // Polling interval cleared; no new setInterval issued while hidden.
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    poller.stop();
  });

  it('Case 2 — resumes polling and fires an immediate refresh when tab becomes visible again', () => {
    const doc = makeFakeDocument(false);
    const refresh = vi.fn();
    const poller = createVisibilityAwarePoller({
      refresh,
      intervalMs: 60_000,
      doc,
      timers: { setInterval: setIntervalSpy, clearInterval: clearIntervalSpy },
    });

    poller.start();
    // Hide the tab.
    doc.hidden = true;
    doc.dispatch('visibilitychange');
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    refresh.mockClear();

    // Tab becomes visible again.
    doc.hidden = false;
    doc.dispatch('visibilitychange');

    // Immediate catch-up refresh…
    expect(refresh).toHaveBeenCalledTimes(1);
    // …plus a fresh setInterval installed.
    expect(setIntervalSpy).toHaveBeenCalledTimes(2);

    poller.stop();
  });

  it('Case 3 — starting while hidden installs NO interval and no refresh', () => {
    const doc = makeFakeDocument(true); // initially hidden
    const refresh = vi.fn();
    const poller = createVisibilityAwarePoller({
      refresh,
      intervalMs: 60_000,
      doc,
      timers: { setInterval: setIntervalSpy, clearInterval: clearIntervalSpy },
    });

    poller.start();
    // Hidden at start → no polling, no refresh (the component handles the
    // initial mount refresh separately; the poller only owns the loop).
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();

    poller.stop();
  });

  it('Case 4 — stop() detaches the visibilitychange listener and clears the interval', () => {
    const doc = makeFakeDocument(false);
    const refresh = vi.fn();
    const poller = createVisibilityAwarePoller({
      refresh,
      intervalMs: 60_000,
      doc,
      timers: { setInterval: setIntervalSpy, clearInterval: clearIntervalSpy },
    });

    poller.start();
    poller.stop();

    // Dispatching after stop() must not re-trigger a refresh.
    doc.hidden = false;
    doc.dispatch('visibilitychange');
    expect(refresh).not.toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
