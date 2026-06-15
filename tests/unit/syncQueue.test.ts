import { beforeEach, describe, expect, it } from "vitest";
import { enqueue, getByStatus, processMutation, syncAll } from "@/lib/offline/syncQueue";
import { getDb } from "@/lib/offline/db";
import type { QueuedMutation } from "@/lib/offline/types";

// De sync-queue is het hart van offline-first (FR-13.4). We testen: enqueue,
// succesvolle sync, conflict-markering en retry/failed-gedrag.

beforeEach(async () => {
  // Schone stores per test. We hergebruiken één connectie (geen deleteDatabase,
  // dat deadlockt achter een open connectie in fake-indexeddb).
  const db = await getDb();
  await db.clear("syncQueue");
  await db.clear("lessonCache");
});

function attendanceInput() {
  return {
    type: "attendance.set" as const,
    payload: { studentId: "s1", status: "present" as const },
    actorId: "staff-1",
    lessonSessionId: "ls-1",
  };
}

describe("syncQueue", () => {
  it("plaatst een mutatie als pending met idempotente id", async () => {
    const m = await enqueue(attendanceInput());
    expect(m.status).toBe("pending");
    expect(m.id).toMatch(/[0-9a-f-]{36}/);
    const pending = await getByStatus("pending");
    expect(pending).toHaveLength(1);
  });

  it("markeert als synced bij succes", async () => {
    const m = await enqueue(attendanceInput());
    const result = await processMutation(m, async () => ({ ok: true }));
    expect(result.status).toBe("synced");
  });

  it("markeert als conflict zonder te overschrijven", async () => {
    const m = await enqueue(attendanceInput());
    const result = await processMutation(m, async () => ({
      ok: false,
      conflict: true,
      error: "server nieuwer",
    }));
    expect(result.status).toBe("conflict");
    expect(result.lastError).toBe("server nieuwer");
  });

  it("zet terug op pending en verhoogt retryCount bij tijdelijke fout", async () => {
    const m = await enqueue(attendanceInput());
    const result = await processMutation(m, async () => ({ ok: false, error: "netwerk" }));
    expect(result.status).toBe("pending");
    expect(result.retryCount).toBe(1);
  });

  it("syncAll telt resultaten correct", async () => {
    await enqueue(attendanceInput());
    await enqueue({ ...attendanceInput(), lessonSessionId: "ls-2" });
    let call = 0;
    const send = async (_m: QueuedMutation) => {
      call += 1;
      return call === 1 ? { ok: true as const } : { ok: false as const, conflict: true, error: "x" };
    };
    const summary = await syncAll(send);
    expect(summary.synced).toBe(1);
    expect(summary.conflicts).toBe(1);
  });
});
