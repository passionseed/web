"use client";

/**
 * Offline-first IndexedDB store for recorded WAV takes.
 * Every finished take is persisted locally BEFORE any upload attempt so a
 * dropped mobile connection, backgrounded Safari tab, or page refresh never
 * loses a recording.
 */

const DB_NAME = "radar-voice-studio-v1";
const DB_VERSION = 1;
const STORE_NAME = "pendingTakes";

export type LocalUploadStatus = "queued" | "uploading" | "failed";

export interface LocalTakeRecord {
  localId: string;
  storyId: string;
  beatIndex: number;
  lineHash: string;
  wavBytes: ArrayBuffer;
  durationMs: number;
  peakDbfs: number;
  noiseFloorDbfs: number;
  clipped: boolean;
  tooQuiet: boolean;
  createdAt: string;
  uploadStatus: LocalUploadStatus;
  uploadError: string | null;
  attempts: number;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "localId" });
        store.createIndex("byStory", "storyId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to open IndexedDB"));
  });
}

function runTx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return openDb().then((db) => {
    if (!db) return null;
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
      tx.oncomplete = () => db.close();
      tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error("IndexedDB transaction aborted"));
      };
    });
  });
}

export async function putLocalTake(record: LocalTakeRecord): Promise<void> {
  try {
    await runTx("readwrite", (store) => store.put(record));
  } catch (err) {
    console.error("[radar-voice] failed to persist local take in IndexedDB:", err);
  }
}

export async function deleteLocalTake(localId: string): Promise<void> {
  try {
    await runTx("readwrite", (store) => store.delete(localId));
  } catch (err) {
    console.error("[radar-voice] failed to remove local take from IndexedDB:", err);
  }
}

export async function listLocalTakes(storyId?: string): Promise<LocalTakeRecord[]> {
  try {
    const rows = await runTx<LocalTakeRecord[]>("readonly", (store) => {
      if (storyId) {
        return store.index("byStory").getAll(storyId);
      }
      return store.getAll();
    });
    if (!rows) return [];
    return [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch (err) {
    console.error("[radar-voice] failed to read local takes from IndexedDB:", err);
    return [];
  }
}

export async function updateLocalTakeStatus(
  localId: string,
  patch: Partial<Pick<LocalTakeRecord, "uploadStatus" | "uploadError" | "attempts">>,
): Promise<void> {
  try {
    const existing = await runTx<LocalTakeRecord>("readonly", (store) => store.get(localId));
    if (!existing) return;
    await runTx("readwrite", (store) => store.put({ ...existing, ...patch }));
  } catch (err) {
    console.error("[radar-voice] failed to update local take status:", err);
  }
}
