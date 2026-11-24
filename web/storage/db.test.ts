// Story 1.9: IndexedDB records (AD-21) on fake-indexeddb. A fresh factory per test.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Note, VerifiedStudySet } from "../core/types";
import { DB_NAME, DB_VERSION, openDb, readNote, readStudySet, saveGeneratedNote, STORES } from "./db";

const HASH = "a".repeat(64);

const SET: VerifiedStudySet = {
  concepts: [
    {
      id: "k-scrum",
      name: "Scrum",
      centralityRank: 1,
      covered: true,
      flashcards: [{ id: "k-scrum.fc1", front: "Hva er Scrum?", back: "Et rammeverk.", passageId: "p1", quote: "Scrum er et rammeverk for team." }],
      quizQuestions: [
        {
          id: "k-scrum.qq1",
          question: "Hva er Scrum?",
          options: ["Et rammeverk", "Et språk", "En database", "Et verktøy"],
          correctIndex: 0,
          passageId: "p1",
          quote: "Scrum er et rammeverk for team.",
        },
      ],
    },
  ],
  summaryPoints: [{ id: "sp1", text: "Scrum er et rammeverk.", passageId: "p1", quote: "Scrum er et rammeverk for team." }],
  model: "anthropic/claude-haiku-5.5",
  promptVersion: "2",
  language: "nb",
  cacheKey: `${HASH}:2:anthropic/claude-haiku-5.5`,
};

const NOTE: Note = {
  noteHash: HASH,
  title: "Scrum",
  sourceType: "md",
  wordCount: 6,
  passages: [{ id: "p1", text: "Scrum er et rammeverk for team." }],
  normalizationVersion: 1,
  currentCacheKey: SET.cacheKey,
  archived: false,
  importanceLevel: 2,
  lastPractisedAt: null,
};

async function counts() {
  const db = await openDb();
  try {
    return { notes: await db.count("notes"), studySets: await db.count("studySets") };
  } finally {
    db.close();
  }
}

const savedIndexedDb = globalThis.indexedDB;
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => {
  globalThis.indexedDB = savedIndexedDb;
});

describe("schema", () => {
  it("creates the four AD-21 stores, each with a noteHash index", async () => {
    const db = await openDb();
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(DB_VERSION);
    expect([...db.objectStoreNames].sort()).toEqual([...STORES].sort());
    const tx = db.transaction([...STORES], "readonly");
    for (const name of STORES) expect([...tx.objectStore(name).indexNames], name).toEqual(["noteHash"]);
    expect(tx.objectStore("notes").keyPath).toBe("noteHash");
    expect(tx.objectStore("studySets").keyPath).toBe("cacheKey");
    expect(tx.objectStore("conceptProgress").keyPath).toEqual(["noteHash", "keyConceptId"]);
    expect(tx.objectStore("rounds").keyPath).toBe("roundId");
    db.close();
  });
});

describe("saveGeneratedNote", () => {
  it("round trip: both records carry schemaVersion 1 and read back validated", async () => {
    expect(await saveGeneratedNote(NOTE, SET)).toEqual({ ok: true, value: undefined });
    expect(await readNote(HASH)).toEqual({ ok: true, value: { ...NOTE, schemaVersion: 1 } });
    expect(await readStudySet(SET.cacheKey)).toEqual({ ok: true, value: { ...SET, schemaVersion: 1, noteHash: HASH } });
  });

  it("the same Note again replaces both records (put)", async () => {
    await saveGeneratedNote(NOTE, SET);
    const next = { ...SET, language: "en" };
    expect((await saveGeneratedNote({ ...NOTE, wordCount: 7 }, next)).ok).toBe(true);
    expect(await counts()).toEqual({ notes: 1, studySets: 1 });
    const note = await readNote(HASH);
    expect(note.ok && note.value.wordCount).toBe(7);
    const set = await readStudySet(SET.cacheKey);
    expect(set.ok && set.value.language).toBe("en");
  });

  it("a rejected write aborts the transaction: both stores stay empty", async () => {
    // No key at the studySets keyPath: the second put fails after the Note's put was queued.
    const broken = { ...SET, cacheKey: undefined } as unknown as VerifiedStudySet;
    expect(await saveGeneratedNote(NOTE, broken)).toEqual({ ok: false, code: "err.generation" });
    expect(await counts()).toEqual({ notes: 0, studySets: 0 });
  });

  it("a value that cannot be cloned aborts the transaction too", async () => {
    const broken = { ...SET, extra: () => 1 } as unknown as VerifiedStudySet;
    expect((await saveGeneratedNote(NOTE, broken)).ok).toBe(false);
    expect(await counts()).toEqual({ notes: 0, studySets: 0 });
  });

  it("without IndexedDB: not ok, no throw", async () => {
    // The browser may have no indexedDB (blocked storage, some private modes).
    globalThis.indexedDB = undefined as unknown as IDBFactory;
    expect(await saveGeneratedNote(NOTE, SET)).toEqual({ ok: false, code: "err.generation" });
    expect(await readNote(HASH)).toEqual({ ok: false, code: "err.generation" });
  });
});

describe("reads", () => {
  it("a missing Note is not ok", async () => {
    expect(await readNote(HASH)).toEqual({ ok: false, code: "err.generation" });
  });

  it("an invalid record is not ok", async () => {
    const db = await openDb();
    await db.put("notes", { ...NOTE, schemaVersion: 1, importanceLevel: "high" } as never);
    await db.put("studySets", { ...SET, schemaVersion: 2, noteHash: HASH } as never);
    db.close();
    expect((await readNote(HASH)).ok).toBe(false);
    expect((await readStudySet(SET.cacheKey)).ok).toBe(false);
  });

  it("unknown fields are kept", async () => {
    const db = await openDb();
    await db.put("notes", { ...NOTE, schemaVersion: 1, later: true } as never);
    db.close();
    const note = await readNote(HASH);
    expect(note.ok && (note.value as Record<string, unknown>).later).toBe(true);
  });
});
