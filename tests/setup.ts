// Globale test-setup. Voorziet een in-memory IndexedDB voor de offline
// sync-queue tests. crypto.randomUUID is in Node 20 / happy-dom standaard
// beschikbaar.
import "fake-indexeddb/auto";
