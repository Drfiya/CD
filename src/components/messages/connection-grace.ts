/**
 * Round 3 / A2 — Connection-banner grace-period state machine.
 *
 * The Realtime channel initially transitions through `'connecting'` → `'subscribed'`
 * on nearly every chat open. When the transition completes within ~80–200 ms
 * (the common case on a healthy network) the banner would otherwise flash
 * "Connecting…" for just long enough to be visible. That is a small lie — we
 * told the user the connection was bad when it wasn't. This helper introduces
 * a grace period so the banner only renders when a non-subscribed state holds
 * for at least `delayMs`. On flap (`subscribed` → non-subscribed) the timer
 * is re-armed, so a 50 ms reconnect blip also produces zero flash.
 *
 * Extracted as a pure helper so Vitest can drive the four transition cases
 * deterministically via injected `timers` — no React mount needed.
 * (Same pattern as `message-reconcile.ts` / `visibility-polling.ts`.)
 */
import type { RealtimeStatus } from './connection-banner';

export interface GraceTimers {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
}

export interface ConnectionGraceOptions {
  delayMs: number;
  onVisibleChange: (visible: boolean) => void;
  timers?: GraceTimers;
}

export interface ConnectionGraceHandle {
  /** Report the current Realtime channel status. Safe to call repeatedly. */
  setStatus(status: RealtimeStatus): void;
  /** Cancel any pending timer; leaves visibility at its last value. */
  stop(): void;
}

const defaultTimers: GraceTimers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export function createConnectionGrace({
  delayMs,
  onVisibleChange,
  timers = defaultTimers,
}: ConnectionGraceOptions): ConnectionGraceHandle {
  let timer: unknown = null;
  let prevStatus: RealtimeStatus | null = null;
  let visible = false;

  function setVisible(next: boolean) {
    if (next === visible) return;
    visible = next;
    onVisibleChange(next);
  }

  function cancel() {
    if (timer !== null) {
      timers.clearTimeout(timer);
      timer = null;
    }
  }

  function arm() {
    cancel();
    timer = timers.setTimeout(() => {
      timer = null;
      // Race guard: if a SUBSCRIBED arrived between arm() and the callback
      // firing, the caller already cancel()-ed us via setStatus('subscribed').
      // This extra check is belt-and-braces.
      if (prevStatus !== 'subscribed') {
        setVisible(true);
      }
    }, delayMs);
  }

  return {
    setStatus(next) {
      const prev = prevStatus;
      prevStatus = next;

      if (next === 'subscribed') {
        // Hitting a good connection cancels the pending timer and hides the
        // banner immediately, regardless of prior state.
        cancel();
        setVisible(false);
        return;
      }

      // Non-subscribed target state.
      if (prev === null || prev === 'subscribed') {
        // Fresh entry into a non-subscribed state — either cold start or a
        // flap from a previously-good connection. Start a new grace window.
        // Banner stays hidden until the timer fires.
        setVisible(false);
        arm();
      }
      // else: prev was already non-subscribed → timer is either still pending
      // or has already fired. Nothing to do: `connecting → degraded` should not
      // reset the grace window (it's still the same outage from the user's POV).
    },
    stop() {
      cancel();
    },
  };
}
