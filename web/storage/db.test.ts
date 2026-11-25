// Story 1.9: IndexedDB records (AD-21) on fake-indexeddb. A fresh factory per test. Story 2.1: Round start.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { composeRound, type RoundComposition } from "../core/round";
import type { Note, VerifiedStudySet } from "../core/types";
import {
  DB_NAME,
  DB_VERSION,
  openDb,
  readConceptProgress,
  readNote,
  readRound,
  readStudySet,
  saveGeneratedNote,
  startRound,
  STORES,
  type ConceptProgressRecord,
} from "./db";

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

// ---- Story 2.1: conceptProgress and rounds ----

const DEMO_HASH = `demo:${HASH}`;
const T1 = "2026-11-25T10:00:00.000Z";
const T2 = "2026-11-25T11:00:00.000Z";

/** Three covered concepts (k-a with two Quiz Questions, k-c with none) and one not covered. */
const CONCEPTS = [
  { id: "k-a", rank: 1, quiz: 2 },
  { id: "k-b", rank: 2, quiz: 1 },
  { id: "k-c", rank: 3, quiz: 0 },
].map(({ id, rank, quiz }) => ({
  id,
  name: id,
  centralityRank: rank,
  covered: true,
  flashcards: [{ id: `${id}.fc1`, front: "F", back: "B", passageId: "p1", quote: "q" }],
  quizQuestions: Array.from({ length: quiz }, (_, i) => ({
    id: `${id}.qq${i + 1}`,
    question: "Q",
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
    passageId: "p1",
    quote: "q",
  })),
}));
const ALL_CONCEPTS = [...CONCEPTS, { id: "k-x", name: "x", centralityRank: 4, covered: false, flashcards: [], quizQuestions: [] }];

async function compose(roundId: string, now: string, noteHash = DEMO_HASH): Promise<RoundComposition> {
  const progress = await readConceptProgress(noteHash);
  if (!progress.ok) throw new Error("read failed");
  return composeRound({
    roundId,
    noteHash,
    cacheKey: `${noteHash}:2:m`,
    now,
    random: () => 0.3,
    concepts: ALL_CONCEPTS,
    progress: progress.value,
  })!;
}

async function all() {
  const db = await openDb();
  try {
    return { progress: await db.getAll("conceptProgress"), rounds: await db.getAll("rounds") };
  } finally {
    db.close();
  }
}

describe("startRound", () => {
  it("creates a new row per eligible concept, stamps the included ones, stores the Round as number 1", async () => {
    const composition = await compose("r-1", T1);
    const saved = await startRound(composition);
    expect(saved.ok).toBe(true);
    const { progress, rounds } = await all();
    const byId = Object.fromEntries(progress.map((p) => [p.keyConceptId, p]));
    expect(Object.keys(byId).sort()).toEqual(["k-a", "k-b", "k-c"]);
    expect(byId["k-a"]).toEqual({
      schemaVersion: 1,
      noteHash: DEMO_HASH,
      keyConceptId: "k-a",
      state: "new",
      lastShownAt: T1,
      lastUsedQuizQuestionId: "k-a.qq1",
    });
    expect(byId["k-c"]).toMatchObject({ lastShownAt: T1, lastUsedQuizQuestionId: null });
    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toEqual({ ...composition.round, number: 1, schemaVersion: 1 });
    expect(rounds[0]).toMatchObject({ noteHash: DEMO_HASH, cacheKey: `${DEMO_HASH}:2:m`, status: "active", answers: [], completedAt: null });
    expect(saved.ok && saved.value).toEqual(rounds[0]);
    const read = await readRound("r-1");
    expect(read.ok && read.value).toEqual(rounds[0]);
  });

  it("not covered: no progress row", async () => {
    await startRound(await compose("r-1", T1));
    const progress = await readConceptProgress(DEMO_HASH);
    expect(progress.ok && progress.value.map((p) => p.keyConceptId)).not.toContain("k-x");
  });

  it("a second Round: number 2, the first becomes abandoned, the Quiz Question rotates, states are kept", async () => {
    await startRound(await compose("r-1", T1));
    const db = await openDb();
    const row = (await db.get("conceptProgress", [DEMO_HASH, "k-b"])) as ConceptProgressRecord;
    await db.put("conceptProgress", { ...row, state: "known" });
    db.close();

    const second = await startRound(await compose("r-2", T2));
    expect(second.ok && second.value.number).toBe(2);
    const first = await readRound("r-1");
    expect(first.ok && first.value.status).toBe("abandoned");
    const progress = await readConceptProgress(DEMO_HASH);
    const byId = Object.fromEntries((progress.ok ? progress.value : []).map((p) => [p.keyConceptId, p]));
    expect(byId["k-a"]).toMatchObject({ lastShownAt: T2, lastUsedQuizQuestionId: "k-a.qq2" });
    expect(byId["k-b"].state).toBe("known");
  });

  it("counts and abandons only the same Note's Rounds (live and demo: keys are separate)", async () => {
    await startRound(await compose("live-1", T1, HASH));
    const demo = await startRound(await compose("demo-1", T1));
    expect(demo.ok && demo.value.number).toBe(1);
    const live = await readRound("live-1");
    expect(live.ok && live.value.status).toBe("active");
  });

  it("a stored concept left out of the Round keeps its row untouched", async () => {
    const untouched: ConceptProgressRecord = {
      schemaVersion: 1,
      noteHash: DEMO_HASH,
      keyConceptId: "k-a",
      state: "known",
      lastShownAt: T2,
      lastUsedQuizQuestionId: "k-a.qq2",
    };
    const db = await openDb();
    await db.put("conceptProgress", untouched);
    // k-b is known and shown longer ago, so it is the one known concept added to k-c (new); k-a is left out.
    await db.put("conceptProgress", { ...untouched, keyConceptId: "k-b", lastShownAt: "2026-11-24T10:00:00.000Z", lastUsedQuizQuestionId: null });
    db.close();
    const composition = await compose("r-1", T1);
    expect(composition.round.conceptIds).toEqual(["k-c", "k-b"]);
    await startRound(composition);
    const after = await openDb();
    expect(await after.get("conceptProgress", [DEMO_HASH, "k-a"])).toEqual(untouched);
    after.close();
  });

  it("write fails: the transaction aborts and nothing is stored", async () => {
    const composition = await compose("r-1", T1);
    // No key at the rounds keyPath: the last put fails after the progress puts were queued.
    const broken = { ...composition, round: { ...composition.round, roundId: undefined as unknown as string } };
    expect(await startRound(broken)).toEqual({ ok: false, code: "err.generation" });
    expect(await all()).toEqual({ progress: [], rounds: [] });
  });

  it("write fails on a value that cannot be cloned: nothing changes, the earlier Round stays active", async () => {
    await startRound(await compose("r-1", T1));
    const before = await all();
    const composition = await compose("r-2", T2);
    const broken = { ...composition, round: { ...composition.round, extra: () => 1 } } as unknown as RoundComposition;
    expect((await startRound(broken)).ok).toBe(false);
    expect(await all()).toEqual(before);
  });

  it("without IndexedDB: not ok, no throw", async () => {
    const composition = await compose("r-1", T1);
    globalThis.indexedDB = undefined as unknown as IDBFactory;
    expect(await startRound(composition)).toEqual({ ok: false, code: "err.generation" });
    expect(await readRound("r-1")).toEqual({ ok: false, code: "err.generation" });
    expect(await readConceptProgress(DEMO_HASH)).toEqual({ ok: false, code: "err.generation" });
  });
});

describe("readRound / readConceptProgress", () => {
  it("an unknown roundId is not ok", async () => {
    expect(await readRound("nope")).toEqual({ ok: false, code: "err.generation" });
  });

  it("timestamps must be ISO 8601 UTC: a row or Round with another format is invalid", async () => {
    await startRound(await compose("r-1", T1));
    const db = await openDb();
    const round = await db.get("rounds", "r-1");
    await db.put("rounds", { ...round!, startedAt: "25.11.2026 10:00" });
    const row = (await db.get("conceptProgress", [DEMO_HASH, "k-a"]))!;
    await db.put("conceptProgress", { ...row, lastShownAt: "2026-11-25T10:00:00+01:00" });
    db.close();
    expect((await readRound("r-1")).ok).toBe(false);
    const progress = await readConceptProgress(DEMO_HASH);
    expect(progress.ok && progress.value.map((p) => p.keyConceptId)).not.toContain("k-a");
  });

  it("an invalid Round is not ok; an invalid progress row is left out", async () => {
    const db = await openDb();
    await db.put("rounds", { roundId: "r-bad", noteHash: DEMO_HASH, schemaVersion: 1, status: "paused" } as never);
    await db.put("conceptProgress", { noteHash: DEMO_HASH, keyConceptId: "k-a", schemaVersion: 1, state: "great" } as never);
    await db.put("conceptProgress", {
      noteHash: DEMO_HASH,
      keyConceptId: "k-b",
      schemaVersion: 1,
      state: "shaky",
      lastShownAt: null,
      lastUsedQuizQuestionId: null,
    });
    db.close();
    expect((await readRound("r-bad")).ok).toBe(false);
    const progress = await readConceptProgress(DEMO_HASH);
    expect(progress.ok && progress.value.map((p) => p.keyConceptId)).toEqual(["k-b"]);
  });

  it("an invalid row is replaced by a new one when its concept is eligible", async () => {
    const db = await openDb();
    await db.put("conceptProgress", { noteHash: DEMO_HASH, keyConceptId: "k-c", schemaVersion: 1, state: "great" } as never);
    db.close();
    await startRound(await compose("r-1", T1));
    const progress = await readConceptProgress(DEMO_HASH);
    const c = progress.ok ? progress.value.find((p) => p.keyConceptId === "k-c") : undefined;
    expect(c).toEqual({
      schemaVersion: 1,
      noteHash: DEMO_HASH,
      keyConceptId: "k-c",
      state: "new",
      lastShownAt: T1,
      lastUsedQuizQuestionId: null,
    });
  });
});
