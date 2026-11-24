// Seeds a stored Consent decision before the first page script runs (spec 1.3, Code Map).
// The guard makes it a one-off per tab, so later reloads see what the app itself stored.
import type { Page } from "@playwright/test";

export const SETTINGS_KEY = "torsa.settings";

export async function seedConsent(page: Page, consent: "accepted" | "declined") {
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem("e2e-seeded")) return;
      sessionStorage.setItem("e2e-seeded", "1");
      localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, consent: value }));
    },
    [SETTINGS_KEY, consent] as const,
  );
}

// Story 1.11: a stored Note and Study Set, written straight to IndexedDB `torsa` (schemaVersion 1),
// with the same stores and key paths as web/storage/db.ts. Call after a page on the app's origin is open.
export type SeedPassage = { id: string; text: string };
export type SeedNote = {
  noteHash: string;
  title: string;
  sourceType: "txt" | "md" | "docx" | "pdf";
  wordCount: number;
  passages: SeedPassage[];
  normalizationVersion: number;
  currentCacheKey: string;
  archived: boolean;
  importanceLevel: number;
  lastPractisedAt: string | null;
};
export type SeedStudySet = Record<string, unknown> & { cacheKey: string };

export async function seedNoteRecords(page: Page, note: SeedNote, studySet: SeedStudySet | null) {
  await page.evaluate(
    async ([note, studySet]) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("torsa", 1);
        req.onupgradeneeded = (event) => {
          if (event.oldVersion >= 1) return;
          const keyPaths: Record<string, string | string[]> = {
            notes: "noteHash",
            studySets: "cacheKey",
            conceptProgress: ["noteHash", "keyConceptId"],
            rounds: "roundId",
          };
          for (const [name, keyPath] of Object.entries(keyPaths)) {
            req.result.createObjectStore(name, { keyPath }).createIndex("noteHash", "noteHash");
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(["notes", "studySets"], "readwrite");
        tx.objectStore("notes").put({ ...note, schemaVersion: 1 });
        if (studySet) tx.objectStore("studySets").put({ ...studySet, schemaVersion: 1, noteHash: note.noteHash });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error("aborted"));
      });
      db.close();
    },
    [note, studySet] as const,
  );
}
