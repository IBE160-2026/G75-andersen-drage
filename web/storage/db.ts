// IndexedDB records (AD-10, AD-21). This module and settings.ts are the only code that touches
// browser storage. Every function here resolves to a result and never throws to React.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { z } from "zod";
import type { Note, VerifiedStudySet } from "../core/types";

export const DB_NAME = "torsa";
export const DB_VERSION = 1;
export const RECORD_SCHEMA_VERSION = 1;

/** All four AD-21 stores exist from version 1; `conceptProgress` and `rounds` are filled by Epic 2. */
export const STORES = ["notes", "studySets", "conceptProgress", "rounds"] as const;
export type StoreName = (typeof STORES)[number];

const KEY_PATHS: Record<StoreName, string | string[]> = {
  notes: "noteHash",
  studySets: "cacheKey",
  conceptProgress: ["noteHash", "keyConceptId"],
  rounds: "roundId",
};

// ---- Record schemas (validated on read). Unknown top-level fields are kept, as in settings.ts. ----

const PassageSchema = z.object({ id: z.string(), text: z.string() });
const QuoteRef = { passageId: z.string(), quote: z.string() };

export const NoteRecordSchema = z.looseObject({
  schemaVersion: z.literal(RECORD_SCHEMA_VERSION),
  noteHash: z.string().min(1),
  title: z.string(),
  sourceType: z.enum(["txt", "md", "docx", "pdf"]),
  wordCount: z.number().int().nonnegative(),
  passages: z.array(PassageSchema),
  normalizationVersion: z.number().int(),
  currentCacheKey: z.string().min(1),
  archived: z.boolean(),
  importanceLevel: z.number().int().min(1).max(3),
  lastPractisedAt: z.string().nullable(),
});

export const StudySetRecordSchema = z.looseObject({
  schemaVersion: z.literal(RECORD_SCHEMA_VERSION),
  noteHash: z.string().min(1),
  cacheKey: z.string().min(1),
  model: z.string(),
  promptVersion: z.string(),
  language: z.string(),
  summaryPoints: z.array(z.object({ id: z.string(), text: z.string(), ...QuoteRef })),
  concepts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      centralityRank: z.number().int(),
      covered: z.boolean(),
      flashcards: z.array(z.object({ id: z.string(), front: z.string(), back: z.string(), ...QuoteRef })),
      quizQuestions: z.array(
        z.object({
          id: z.string(),
          question: z.string(),
          options: z.array(z.string()),
          correctIndex: z.number().int(),
          ...QuoteRef,
        }),
      ),
    }),
  ),
});

export type NoteRecord = Note & { schemaVersion: typeof RECORD_SCHEMA_VERSION };
export type StudySetRecord = VerifiedStudySet & { schemaVersion: typeof RECORD_SCHEMA_VERSION; noteHash: string };

// Compile-time: the schemas' output is the stored shape, so a field added to core/types.ts must be added here.
const _noteSchemaMatches: z.ZodType<NoteRecord> = NoteRecordSchema;
const _studySetSchemaMatches: z.ZodType<StudySetRecord> = StudySetRecordSchema;
void _noteSchemaMatches;
void _studySetSchemaMatches;

interface TorsaDb extends DBSchema {
  notes: { key: string; value: NoteRecord; indexes: { noteHash: string } };
  studySets: { key: string; value: StudySetRecord; indexes: { noteHash: string } };
  conceptProgress: { key: [string, string]; value: { noteHash: string; keyConceptId: string }; indexes: { noteHash: string } };
  rounds: { key: string; value: { roundId: string; noteHash: string }; indexes: { noteHash: string } };
}

/** Message keys only (AD-16). The UI shows storage failures as `err.generation` until Story 3.7. */
export type StorageResult<T> = { ok: true; value: T } | { ok: false; code: "err.generation" };
const FAILED = { ok: false, code: "err.generation" } as const;

/** Opens (and on first use creates) the database. Rejects when IndexedDB is missing or blocked. */
export function openDb(): Promise<IDBPDatabase<TorsaDb>> {
  if (typeof globalThis.indexedDB === "undefined") return Promise.reject(new Error("indexedDB unavailable"));
  return openDB<TorsaDb>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        for (const name of STORES) {
          const store = db.createObjectStore(name, { keyPath: KEY_PATHS[name] });
          store.createIndex("noteHash", "noteHash");
        }
      }
    },
  });
}

async function withDb<T>(run: (db: IDBPDatabase<TorsaDb>) => Promise<StorageResult<T>>): Promise<StorageResult<T>> {
  let db: IDBPDatabase<TorsaDb>;
  try {
    db = await openDb();
  } catch {
    return FAILED;
  }
  try {
    return await run(db);
  } catch {
    return FAILED;
  } finally {
    db.close();
  }
}

/**
 * Writes the Note and its Study Set in one `readwrite` transaction (AD-21). Both are replaced (`put`)
 * when the Note is already stored. If either write fails, the transaction is aborted: nothing is written.
 */
export function saveGeneratedNote(note: Note, set: VerifiedStudySet): Promise<StorageResult<void>> {
  const noteRecord: NoteRecord = { ...note, schemaVersion: RECORD_SCHEMA_VERSION };
  const setRecord: StudySetRecord = { ...set, schemaVersion: RECORD_SCHEMA_VERSION, noteHash: note.noteHash };
  return withDb(async (db) => {
    const tx = db.transaction(["notes", "studySets"], "readwrite");
    const done = tx.done;
    const writes: Promise<unknown>[] = [];
    try {
      writes.push(tx.objectStore("notes").put(noteRecord));
      writes.push(tx.objectStore("studySets").put(setRecord));
      await Promise.all([...writes, done]);
      return { ok: true, value: undefined };
    } catch {
      // A put can throw synchronously (DataError, DataCloneError) without aborting the transaction.
      for (const p of [...writes, done]) p.catch(() => {});
      try {
        tx.abort();
      } catch {
        // Already aborted or finished.
      }
      await done.catch(() => {});
      return FAILED;
    }
  });
}

/** The stored Note, validated. Missing, invalid or unreadable → not ok. */
export function readNote(noteHash: string): Promise<StorageResult<NoteRecord>> {
  return withDb(async (db) => {
    const parsed = NoteRecordSchema.safeParse(await db.get("notes", noteHash));
    return parsed.success ? { ok: true, value: parsed.data } : FAILED;
  });
}

/** The stored Study Set for `cacheKey`, validated. Missing, invalid or unreadable → not ok. */
export function readStudySet(cacheKey: string): Promise<StorageResult<StudySetRecord>> {
  return withDb(async (db) => {
    const parsed = StudySetRecordSchema.safeParse(await db.get("studySets", cacheKey));
    return parsed.success ? { ok: true, value: parsed.data } : FAILED;
  });
}
