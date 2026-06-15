import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { QueuedMutation } from "./types";

// IndexedDB-schema. We bewaren een minimale offline dataset: de sync-queue en
// een lichte cache van relevante lessen per instructeur. GEEN gevoelige
// medische data lokaal langer dan nodig (offline security review, Prompt 15).
interface BubblesDB extends DBSchema {
  syncQueue: {
    key: string;
    value: QueuedMutation;
    indexes: { byStatus: string; byLesson: string };
  };
  lessonCache: {
    key: string; // lessonSessionId
    value: { lessonSessionId: string; cachedAt: string; data: unknown };
  };
}

const DB_NAME = "bubbles";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BubblesDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<BubblesDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB niet beschikbaar in deze omgeving"));
  }
  if (!dbPromise) {
    dbPromise = openDB<BubblesDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const queue = db.createObjectStore("syncQueue", { keyPath: "id" });
        queue.createIndex("byStatus", "status");
        queue.createIndex("byLesson", "lessonSessionId");
        db.createObjectStore("lessonCache", { keyPath: "lessonSessionId" });
      },
    });
  }
  return dbPromise;
}

/** Voor tests: reset de cached connectie. */
export function _resetDbForTests() {
  dbPromise = null;
}
