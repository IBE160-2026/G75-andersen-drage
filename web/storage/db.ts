// IndexedDB records (AD-10, AD-21). This module and settings.ts are the only code that touches
// browser storage. Every function here resolves to a result and never throws to React.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { z } from "zod";
import type { ConceptProgress, Round, RoundComposition } from "../core/round";
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

/** ISO 8601 UTC (`…Z`): `lastShownAt` is compared as a string, so the format must be fixed. */
const Timestamp = z.iso.datetime();

export const ConceptProgressRecordSchema = z.looseObject({
  schemaVersion: z.literal(RECORD_SCHEMA_VERSION),
  noteHash: z.string().min(1),
  keyConceptId: z.string().min(1),
  state: z.enum(["new", "shaky", "known"]),
  lastShownAt: Timestamp.nullable(),
  lastUsedQuizQuestionId: z.string().nullable(),
});

export const RoundRecordSchema = z.looseObject({
  schemaVersion: z.literal(RECORD_SCHEMA_VERSION),
  roundId: z.string().min(1),
  noteHash: z.string().min(1),
  cacheKey: z.string().min(1),
  number: z.number().int().positive(),
  review: z.boolean(),
  conceptIds: z.array(z.string()),
  itemIds: z.array(z.string()),
  optionOrder: z.record(z.string(), z.array(z.number().int().nonnegative())),
  answers: z.array(z.looseObject({ itemId: z.string() })),
  status: z.enum(["active", "complete", "abandoned"]),
  startedAt: Timestamp,
  completedAt: Timestamp.nullable(),
});

export type NoteRecord = Note & { schemaVersion: typeof RECORD_SCHEMA_VERSION };
export type StudySetRecord = VerifiedStudySet & { schemaVersion: typeof RECORD_SCHEMA_VERSION; noteHash: string };
export type ConceptProgressRecord = ConceptProgress & { schemaVersion: typeof RECORD_SCHEMA_VERSION };
export type RoundRecord = Round & { schemaVersion: typeof RECORD_SCHEMA_VERSION };

// Compile-time: the schemas' output is the stored shape, so a field added to core/types.ts must be added here.
const _noteSchemaMatches: z.ZodType<NoteRecord> = NoteRecordSchema;
const _studySetSchemaMatches: z.ZodType<StudySetRecord> = StudySetRecordSchema;
const _progressSchemaMatches: z.ZodType<ConceptProgressRecord> = ConceptProgressRecordSchema;
const _roundSchemaMatches: z.ZodType<RoundRecord> = RoundRecordSchema;
void _noteSchemaMatches;
void _studySetSchemaMatches;
void _progressSchemaMatches;
void _roundSchemaMatches;

interface TorsaDb extends DBSchema {
  notes: { key: string; value: NoteRecord; indexes: { noteHash: string } };
  studySets: { key: string; value: StudySetRecord; indexes: { noteHash: string } };
  conceptProgress: { key: [string, string]; value: ConceptProgressRecord; indexes: { noteHash: string } };
  rounds: { key: string; value: RoundRecord; indexes: { noteHash: string } };
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
      await abortQuietly(tx, [...writes, done]);
      return FAILED;
    }
  });
}

/**
 * A put can throw synchronously (DataError, DataCloneError) without aborting the transaction, so abort it
 * here; nothing it queued is then written. Silences the pending requests, which reject on abort.
 */
async function abortQuietly(tx: { abort(): void; done: Promise<void> }, pending: Promise<unknown>[]): Promise<void> {
  for (const p of pending) p.catch(() => {});
  try {
    tx.abort();
  } catch {
    // Already aborted or finished.
  }
  await tx.done.catch(() => {});
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

/** The Note's valid `conceptProgress` rows; an invalid row is left out (it reads as `new`). */
export function readConceptProgress(noteHash: string): Promise<StorageResult<ConceptProgressRecord[]>> {
  return withDb(async (db) => {
    const rows = await db.getAllFromIndex("conceptProgress", "noteHash", noteHash);
    return { ok: true, value: validRows(rows) };
  });
}

function validRows(rows: unknown[]): ConceptProgressRecord[] {
  return rows.flatMap((row) => {
    const parsed = ConceptProgressRecordSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

/**
 * Story 2.1 (AD-21): stores a composed Round in one `readwrite` transaction. Every eligible concept
 * without a valid row gets one as `new`; each included concept (`round.conceptIds`) gets `lastShownAt` =
 * `startedAt` and, when it has a Quiz Question (`usedQuizQuestionIds`), `lastUsedQuizQuestionId`. The Round's `number` is the Note's Round count + 1,
 * and any other `active` Round of the Note becomes `abandoned`. If any write fails, nothing is written.
 */
export function startRound(composition: RoundComposition): Promise<StorageResult<RoundRecord>> {
  const { round, eligibleConceptIds, usedQuizQuestionIds } = composition;
  return withDb(async (db) => {
    const tx = db.transaction(["conceptProgress", "rounds"], "readwrite");
    const done = tx.done;
    const writes: Promise<unknown>[] = [];
    try {
      const progressStore = tx.objectStore("conceptProgress");
      const roundStore = tx.objectStore("rounds");
      const [rows, noteRounds] = await Promise.all([
        progressStore.index("noteHash").getAll(round.noteHash),
        roundStore.index("noteHash").getAll(round.noteHash),
      ]);
      const existing = new Map(validRows(rows).map((row) => [row.keyConceptId, row]));
      const includedIds = new Set(round.conceptIds);

      for (const keyConceptId of eligibleConceptIds) {
        const stored = existing.get(keyConceptId);
        const included = includedIds.has(keyConceptId);
        if (stored && !included) continue;
        const base: ConceptProgressRecord = stored ?? {
          schemaVersion: RECORD_SCHEMA_VERSION,
          noteHash: round.noteHash,
          keyConceptId,
          state: "new",
          lastShownAt: null,
          lastUsedQuizQuestionId: null,
        };
        const row: ConceptProgressRecord = included
          ? {
              ...base,
              lastShownAt: round.startedAt,
              lastUsedQuizQuestionId: usedQuizQuestionIds[keyConceptId] ?? base.lastUsedQuizQuestionId,
            }
          : base;
        writes.push(progressStore.put(row));
      }

      for (const other of noteRounds) {
        if (other.status === "active" && other.roundId !== round.roundId) {
          writes.push(roundStore.put({ ...other, status: "abandoned" }));
        }
      }
      const record: RoundRecord = { ...round, number: noteRounds.length + 1, schemaVersion: RECORD_SCHEMA_VERSION };
      writes.push(roundStore.put(record));
      await Promise.all([...writes, done]);
      return { ok: true, value: record };
    } catch {
      await abortQuietly(tx, [...writes, done]);
      return FAILED;
    }
  });
}

/** The stored Round, validated. Missing, invalid or unreadable → not ok. */
export function readRound(roundId: string): Promise<StorageResult<RoundRecord>> {
  return withDb(async (db) => {
    const parsed = RoundRecordSchema.safeParse(await db.get("rounds", roundId));
    return parsed.success ? { ok: true, value: parsed.data } : FAILED;
  });
}
