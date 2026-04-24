/**
 * Round 2 / A3 — Visibility-aware polling helper.
 *
 * A small state machine that runs a `refresh()` callback on an interval while
 * the owning document is visible, and pauses the interval entirely while the
 * document is hidden. When visibility is regained the helper triggers an
 * immediate `refresh()` before restarting the interval, so the UI catches up
 * the moment the user comes back.
 *
 * Extracted from `unread-badge.tsx` so the pure behaviour is testable in the
 * default node vitest environment (the caller injects a `document` and
 * window-like shim in tests).
 *
 * Koum-principle: If the user is not looking, the product must not work.
 * A hidden tab should generate zero `getTotalUnreadCount()` requests.
 */
interface DocumentLike {
  hidden: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

interface TimersLike {
  setInterval: (fn: () => void, ms: number) => ReturnType<typeof setInterval>;
  clearInterval: (handle: ReturnType<typeof setInterval>) => void;
}

export interface VisibilityAwarePollerOptions {
  refresh: () => void | Promise<void>;
  intervalMs: number;
  doc?: DocumentLike;
  timers?: TimersLike;
}

export interface VisibilityAwarePoller {
  start: () => void;
  stop: () => void;
}

export function createVisibilityAwarePoller(
  opts: VisibilityAwarePollerOptions,
): VisibilityAwarePoller {
  const doc =
    opts.doc ??
    (typeof document !== 'undefined'
      ? (document as unknown as DocumentLike)
      : undefined);
  const timers: TimersLike = opts.timers ?? {
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (h) => clearInterval(h),
  };

  let handle: ReturnType<typeof setInterval> | null = null;
  let listener: (() => void) | null = null;
  let running = false;

  function startInterval() {
    if (handle !== null) return;
    handle = timers.setInterval(() => {
      // Defensive: skip if doc is hidden between ticks.
      if (doc?.hidden) return;
      void opts.refresh();
    }, opts.intervalMs);
  }

  function stopInterval() {
    if (handle !== null) {
      timers.clearInterval(handle);
      handle = null;
    }
  }

  function onVisibilityChange() {
    if (!doc) return;
    if (doc.hidden) {
      stopInterval();
    } else {
      // Catch up immediately, then resume the polling loop.
      void opts.refresh();
      startInterval();
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      if (!doc || !doc.hidden) startInterval();
      if (doc) {
        listener = onVisibilityChange;
        doc.addEventListener('visibilitychange', listener);
      }
    },
    stop() {
      if (!running) return;
      running = false;
      stopInterval();
      if (doc && listener) {
        doc.removeEventListener('visibilitychange', listener);
        listener = null;
      }
    },
  };
}
