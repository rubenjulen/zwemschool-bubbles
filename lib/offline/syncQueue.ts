import { getDb } from "./db";
import type { MutationType, QueuedMutation, SyncStatus } from "./types";

const MAX_RETRIES = 5;

// De sync-laag: server is bron van waarheid voor het rooster; offline mutaties
// krijgen timestamp + actor + lescontext (FR-13.4). Conflicten worden niet
// stilletjes overschreven maar gemarkeerd voor beheer/instructeur.

export function newMutationId(): string {
  // crypto.randomUUID is beschikbaar in moderne browsers en Node 20.
  return crypto.randomUUID();
}

export async function enqueue<TPayload>(input: {
  type: MutationType;
  payload: TPayload;
  actorId: string;
  lessonSessionId: string;
}): Promise<QueuedMutation<TPayload>> {
  const mutation: QueuedMutation<TPayload> = {
    id: newMutationId(),
    type: input.type,
    payload: input.payload,
    actorId: input.actorId,
    lessonSessionId: input.lessonSessionId,
    createdAt: new Date().toISOString(),
    status: "pending",
    retryCount: 0,
  };
  const db = await getDb();
  await db.put("syncQueue", mutation as QueuedMutation);
  return mutation;
}

export async function getByStatus(status: SyncStatus): Promise<QueuedMutation[]> {
  const db = await getDb();
  return db.getAllFromIndex("syncQueue", "byStatus", status);
}

export async function countPending(): Promise<number> {
  return (await getByStatus("pending")).length;
}

/**
 * Verwerkt een mutatie via de meegegeven sender. Idempotent: de mutation.id
 * wordt server-side gebruikt om dubbele verwerking te voorkomen. Retourneert
 * de bijgewerkte status.
 */
export async function processMutation(
  mutation: QueuedMutation,
  send: (m: QueuedMutation) => Promise<{ ok: true } | { ok: false; conflict?: boolean; error: string }>,
): Promise<QueuedMutation> {
  const db = await getDb();
  const syncing: QueuedMutation = { ...mutation, status: "syncing" };
  await db.put("syncQueue", syncing);

  const result = await send(syncing);

  let next: QueuedMutation;
  if (result.ok) {
    next = { ...syncing, status: "synced" };
  } else if (result.conflict) {
    next = { ...syncing, status: "conflict", lastError: result.error };
  } else {
    const retryCount = syncing.retryCount + 1;
    next = {
      ...syncing,
      retryCount,
      status: retryCount >= MAX_RETRIES ? "failed" : "pending",
      lastError: result.error,
    };
  }
  await db.put("syncQueue", next);
  return next;
}

/** Probeert alle pending mutaties te synchroniseren (bv. bij reconnect). */
export async function syncAll(
  send: (m: QueuedMutation) => Promise<{ ok: true } | { ok: false; conflict?: boolean; error: string }>,
): Promise<{ synced: number; conflicts: number; failed: number }> {
  const pending = await getByStatus("pending");
  let synced = 0;
  let conflicts = 0;
  let failed = 0;
  for (const m of pending) {
    const result = await processMutation(m, send);
    if (result.status === "synced") synced++;
    else if (result.status === "conflict") conflicts++;
    else if (result.status === "failed") failed++;
  }
  return { synced, conflicts, failed };
}
