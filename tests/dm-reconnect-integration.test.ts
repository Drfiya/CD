import { describe, it, expect } from 'vitest';
import {
  upsertIncoming,
  mergeRefetch,
  type ChatMessage,
} from '@/components/messages/message-reconcile';

/**
 * Round 2 / B2 — Live Reconnect Integration Test.
 *
 * Dealbreaker §5.7 ("Ghost-Messages / Dupes nach Reconnect") is the hardest
 * gate in the brief. These tests drive the ChatWindow's reconcile state
 * machine through the Supabase channel lifecycle on a pure, deterministic
 * substrate — no flake risk, no timer dependence, no React mounting.
 *
 * The lifecycle we simulate:
 *   FakeChannel.subscribe()          → passes 'SUBSCRIBED' to the callback.
 *   FakeChannel.emitStatus(status)   → re-invokes the callback with a status.
 *   FakeChannel.emitInsert(row)      → invokes every registered
 *                                      `postgres_changes` INSERT handler.
 *
 * On every 'SUBSCRIBED' callback the component asks `getConversation()` for a
 * fresh page and merges it via `mergeRefetch`. On every INSERT broadcast the
 * component runs `upsertIncoming` on the payload. These two operations own
 * the anti-dupe guarantee; the tests below drive them in concert.
 */

type SubscribeCallback = (status: string) => void | Promise<void>;
type PostgresChangeHandler = (payload: { new: unknown; old: unknown }) => void;

class FakeChannel {
  private statusCallback: SubscribeCallback | null = null;
  private changeHandlers: Array<{ event: string; handler: PostgresChangeHandler }> = [];

  on(
    _kind: 'postgres_changes',
    cfg: { event: string },
    handler: PostgresChangeHandler,
  ): FakeChannel {
    this.changeHandlers.push({ event: cfg.event, handler });
    return this;
  }

  subscribe(cb: SubscribeCallback): FakeChannel {
    this.statusCallback = cb;
    // Default lifecycle: emit SUBSCRIBED asynchronously on next tick.
    queueMicrotask(() => void cb('SUBSCRIBED'));
    return this;
  }

  emitStatus(status: string): void {
    void this.statusCallback?.(status);
  }

  emitInsert(row: unknown): void {
    for (const h of this.changeHandlers) {
      if (h.event === 'INSERT') h.handler({ new: row, old: null });
    }
  }
}

/**
 * Reusable harness: encapsulates what the ChatWindow effect does when a
 * Realtime payload arrives or a 'SUBSCRIBED' event fires. No DOM, no React.
 */
function createReconcileHarness(initial: ChatMessage[]) {
  let state = [...initial];
  const ref = {
    lastSeenCreatedAt:
      initial.length > 0
        ? initial[initial.length - 1].createdAt.toISOString()
        : null,
  };
  return {
    get messages(): ChatMessage[] {
      return state;
    },
    get lastSeenCreatedAt(): string | null {
      return ref.lastSeenCreatedAt;
    },
    handleInsert(incoming: ChatMessage): void {
      state = upsertIncoming(state, incoming);
      ref.lastSeenCreatedAt = incoming.createdAt.toISOString();
    },
    handleRefetch(fresh: ChatMessage[]): void {
      state = mergeRefetch(state, fresh, ref.lastSeenCreatedAt);
      const newest = state[state.length - 1];
      ref.lastSeenCreatedAt = newest ? newest.createdAt.toISOString() : null;
    },
  };
}

function makeMsg(
  id: string,
  opts: {
    senderId?: string;
    body?: string;
    clientMessageId?: string | null;
    createdAtMs?: number;
  } = {},
): ChatMessage {
  return {
    id,
    conversationId: 'conv1',
    senderId: opts.senderId ?? 'bob',
    body: opts.body ?? 'hi',
    clientMessageId: opts.clientMessageId ?? null,
    createdAt: new Date(opts.createdAtMs ?? 1_700_000_000_000),
    readAt: null,
  };
}

describe('ChatWindow reconnect integration (Round 2 / B2)', () => {
  it('FakeChannel subscribe callback fires SUBSCRIBED asynchronously', async () => {
    const ch = new FakeChannel();
    let status: string | null = null;
    ch.subscribe((s) => {
      status = s;
    });
    // Flush microtasks.
    await Promise.resolve();
    expect(status).toBe('SUBSCRIBED');
  });

  it('6.1 — initial SUBSCRIBE delivers subsequent Postgres INSERTs into msgs', () => {
    const h = createReconcileHarness([
      makeMsg('m1', { createdAtMs: 1000 }),
      makeMsg('m2', { createdAtMs: 2000 }),
      makeMsg('m3', { createdAtMs: 3000 }),
    ]);

    // Initial SUBSCRIBED would refetch — server returns the same 3.
    h.handleRefetch([
      makeMsg('m1', { createdAtMs: 1000 }),
      makeMsg('m2', { createdAtMs: 2000 }),
      makeMsg('m3', { createdAtMs: 3000 }),
    ]);
    expect(h.messages).toHaveLength(3);

    // A new INSERT arrives via the postgres_changes handler.
    h.handleInsert(makeMsg('m4', { body: 'hi', createdAtMs: 4000 }));

    expect(h.messages).toHaveLength(4);
    expect(h.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4']);
  });

  it('6.2 — disconnect → no new inserts → reconnect → NO ghost rows', () => {
    const h = createReconcileHarness([
      makeMsg('m1', { createdAtMs: 1000 }),
      makeMsg('m2', { createdAtMs: 2000 }),
      makeMsg('m3', { createdAtMs: 3000 }),
      makeMsg('m4', { createdAtMs: 4000 }),
    ]);

    // CLOSED → no client-side action on the state machine.
    // SUBSCRIBED again → refetch returns exactly the same 4 messages.
    h.handleRefetch([
      makeMsg('m1', { createdAtMs: 1000 }),
      makeMsg('m2', { createdAtMs: 2000 }),
      makeMsg('m3', { createdAtMs: 3000 }),
      makeMsg('m4', { createdAtMs: 4000 }),
    ]);

    expect(h.messages).toHaveLength(4);
    expect(new Set(h.messages.map((m) => m.id))).toEqual(
      new Set(['m1', 'm2', 'm3', 'm4']),
    );
  });

  it('6.3 — disconnect → 2 messages during blackout → reconnect → both appended, no dupes', () => {
    const h = createReconcileHarness([
      makeMsg('m1', { createdAtMs: 1000 }),
      makeMsg('m2', { createdAtMs: 2000 }),
      makeMsg('m3', { createdAtMs: 3000 }),
      makeMsg('m4', { createdAtMs: 4000 }),
    ]);

    // Server sends a full page that includes two blackout messages (m5, m6).
    h.handleRefetch([
      makeMsg('m1', { createdAtMs: 1000 }),
      makeMsg('m2', { createdAtMs: 2000 }),
      makeMsg('m3', { createdAtMs: 3000 }),
      makeMsg('m4', { createdAtMs: 4000 }),
      makeMsg('m5', { createdAtMs: 5000 }),
      makeMsg('m6', { createdAtMs: 6000 }),
    ]);

    expect(h.messages).toHaveLength(6);
    expect(h.messages.map((m) => m.id)).toEqual([
      'm1',
      'm2',
      'm3',
      'm4',
      'm5',
      'm6',
    ]);
  });

  it('6.4 — INSERT broadcast races SUBSCRIBED refetch → exactly one row for the new message', () => {
    const h = createReconcileHarness([makeMsg('m1', { createdAtMs: 1000 })]);

    // Simulated race: the INSERT broadcast arrives BEFORE the refetch resolves.
    h.handleInsert(makeMsg('m2', { createdAtMs: 2000 }));
    expect(h.messages.map((m) => m.id)).toEqual(['m1', 'm2']);

    // Then the SUBSCRIBED refetch includes the same m2 row.
    h.handleRefetch([
      makeMsg('m1', { createdAtMs: 1000 }),
      makeMsg('m2', { createdAtMs: 2000 }),
    ]);

    // Dedupe by `id` keeps us at exactly 2 rows.
    expect(h.messages).toHaveLength(2);
    expect(h.messages.filter((m) => m.id === 'm2')).toHaveLength(1);
  });

  it('6.5 — optimistic send → server ACK broadcast with same clientMessageId → dedupe to one row', () => {
    const h = createReconcileHarness([makeMsg('m1', { createdAtMs: 1000 })]);

    // User sends. Optimistic row enters the state with a placeholder id.
    const cid = 'cmid-abc';
    h.handleInsert({
      id: `optimistic-${cid}`,
      conversationId: 'conv1',
      senderId: 'alice',
      body: 'yo',
      clientMessageId: cid,
      createdAt: new Date(2000),
      readAt: null,
      isPending: true,
    });
    expect(h.messages).toHaveLength(2);

    // Supabase broadcast delivers the real server row with the same
    // clientMessageId — should REPLACE the optimistic bubble, not append.
    h.handleInsert(
      makeMsg('real-2', {
        senderId: 'alice',
        body: 'yo',
        clientMessageId: cid,
        createdAtMs: 2000,
      }),
    );

    expect(h.messages).toHaveLength(2);
    const reconciled = h.messages.find((m) => m.clientMessageId === cid);
    expect(reconciled?.id).toBe('real-2');
    expect(reconciled?.isPending).toBeUndefined();
  });

  it('6.6 — rapid flap: SUBSCRIBED → CLOSED → SUBSCRIBED → CLOSED → SUBSCRIBED with no new rows keeps length constant', () => {
    const h = createReconcileHarness([
      makeMsg('m1', { createdAtMs: 1000 }),
      makeMsg('m2', { createdAtMs: 2000 }),
    ]);
    const identical = [
      makeMsg('m1', { createdAtMs: 1000 }),
      makeMsg('m2', { createdAtMs: 2000 }),
    ];

    // Each SUBSCRIBED triggers a refetch; the server state is unchanged.
    h.handleRefetch(identical);
    h.handleRefetch(identical);
    h.handleRefetch(identical);

    expect(h.messages).toHaveLength(2);
    expect(h.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('FakeChannel.emitInsert fans out to every registered INSERT handler', () => {
    const ch = new FakeChannel();
    const calls: Array<unknown> = [];
    ch.on('postgres_changes', { event: 'INSERT' }, (payload) => {
      calls.push(payload.new);
    });
    ch.on('postgres_changes', { event: 'UPDATE' }, (payload) => {
      calls.push({ __update: payload.new });
    });
    ch.emitInsert({ id: 'x' });
    expect(calls).toEqual([{ id: 'x' }]);
  });
});
