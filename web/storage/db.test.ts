// Story 1.9: IndexedDB records (AD-21) on fake-indexeddb. A fresh factory per test. Story 2.1: Round start.
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  recordFlashcardMark,
  saveGeneratedNote,
  startRound,
  STORES,
  type ConceptProgressRecord,
  type FlashcardMark,
  type RoundRecord,
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

  it("the same Note again: the Note is merged (stored title kept) and the set replaced", async () => {
    await saveGeneratedNote(NOTE, SET);
    const next = { ...SET, language: "en" };
    expect((await saveGeneratedNote({ ...NOTE, wordCount: 7, title: "Ny tittel" }, next)).ok).toBe(true);
    expect(await counts()).toEqual({ notes: 1, studySets: 1 });
    const note = await readNote(HASH);
    expect(note.ok && note.value.wordCount).toBe(7);
    expect(note.ok && note.value.title).toBe("Scrum");
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

// ---- AD-21 › "Replacing a Study Set": saveGeneratedNote on a stored Note ----

describe("saveGeneratedNote on a stored Note (AD-21)", () => {
  const KEY_A = `${HASH}:2:model-a`;
  const KEY_B = `${HASH}:2:model-b`;
  const DEMO_KEY_A = `demo:${KEY_A}`;

  function setWith(cacheKey: string, ids: string[]): VerifiedStudySet {
    return { ...SET, cacheKey, concepts: ids.map((id, i) => ({ ...SET.concepts[0], id, name: id, centralityRank: i + 1 })) };
  }

  const STORED: Note = {
    ...NOTE,
    title: "A",
    currentCacheKey: KEY_A,
    archived: true,
    importanceLevel: 3,
    lastPractisedAt: T1,
  };

  function progressRow(noteHash: string, keyConceptId: string): ConceptProgressRecord {
    return { schemaVersion: 1, noteHash, keyConceptId, state: "shaky", lastShownAt: T1, lastUsedQuizQuestionId: `${keyConceptId}.qq1` };
  }

  function roundRow(roundId: string, noteHash: string, cacheKey: string, status: "active" | "complete" | "abandoned" = "active") {
    return {
      schemaVersion: 1 as const,
      roundId,
      noteHash,
      cacheKey,
      number: 1,
      review: false,
      conceptIds: ["k-a"],
      itemIds: ["k-a.fc1", "k-a.qq1"],
      optionOrder: { "k-a.qq1": [0, 1, 2, 3] },
      answers: [{ itemId: "k-a.fc1", knew: true, answeredAt: T1 }],
      status,
      startedAt: T1,
      completedAt: null,
    };
  }

  /** A stored live Note on KEY_A with user fields, progress rows for k-a and k-x, an active Round, and its `demo:` twin. */
  async function seed() {
    expect((await saveGeneratedNote(STORED, setWith(KEY_A, ["k-a", "k-x"]))).ok).toBe(true);
    const demoNote = { ...STORED, noteHash: DEMO_HASH, currentCacheKey: DEMO_KEY_A };
    expect((await saveGeneratedNote(demoNote, setWith(DEMO_KEY_A, ["k-a", "k-x"]))).ok).toBe(true);
    const db = await openDb();
    for (const h of [HASH, DEMO_HASH]) {
      await db.put("conceptProgress", progressRow(h, "k-a"));
      await db.put("conceptProgress", progressRow(h, "k-x"));
    }
    await db.put("rounds", roundRow("live-old", HASH, KEY_A));
    await db.put("rounds", roundRow("demo-old", DEMO_HASH, DEMO_KEY_A));
    db.close();
  }

  async function snapshot() {
    const db = await openDb();
    try {
      return {
        notes: await db.getAll("notes"),
        studySets: await db.getAll("studySets"),
        progress: await db.getAll("conceptProgress"),
        rounds: await db.getAll("rounds"),
      };
    } finally {
      db.close();
    }
  }

  const NEW_FILE: Note = { ...NOTE, title: "Fra ny fil", wordCount: 9, sourceType: "pdf", currentCacheKey: KEY_B };

  it("first save: Note and set written as given", async () => {
    expect((await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a"]))).ok).toBe(true);
    expect(await readNote(HASH)).toEqual({ ok: true, value: { ...NEW_FILE, schemaVersion: 1 } });
    expect((await readStudySet(KEY_B)).ok).toBe(true);
  });

  it("same cache key: user fields and title kept, set replaced, no set deleted, the active Round abandoned, the row pruned", async () => {
    await seed();
    const next = { ...setWith(KEY_A, ["k-a", "k-b"]), language: "en" };
    expect((await saveGeneratedNote({ ...NEW_FILE, currentCacheKey: KEY_A }, next)).ok).toBe(true);
    const note = await readNote(HASH);
    expect(note.ok && note.value).toMatchObject({ title: "A", archived: true, importanceLevel: 3, lastPractisedAt: T1, wordCount: 9 });
    const set = await readStudySet(KEY_A);
    expect(set.ok && set.value.language).toBe("en");
    expect((await snapshot()).studySets).toHaveLength(2);
    const live = await readRound("live-old");
    expect(live.ok && live.value).toEqual({ ...roundRow("live-old", HASH, KEY_A), status: "abandoned" });
    const progress = await readConceptProgress(HASH);
    expect(progress.ok && progress.value).toEqual([progressRow(HASH, "k-a")]);
  });

  it("new cache key: old set deleted, new set written, currentCacheKey updated", async () => {
    await seed();
    expect((await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]))).ok).toBe(true);
    expect((await readStudySet(KEY_A)).ok).toBe(false);
    expect((await readStudySet(KEY_B)).ok).toBe(true);
    const note = await readNote(HASH);
    expect(note.ok && note.value.currentCacheKey).toBe(KEY_B);
  });

  it("new cache key: an earlier orphaned set of the Note is deleted too; other Notes' sets stay", async () => {
    await seed();
    const KEY_C = `${HASH}:1:model-c`;
    const db = await openDb();
    await db.put("studySets", { ...setWith(KEY_C, ["k-a"]), schemaVersion: 1, noteHash: HASH });
    db.close();
    expect((await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]))).ok).toBe(true);
    const keys = (await snapshot()).studySets.map((s) => s.cacheKey).sort();
    expect(keys).toEqual([KEY_B, DEMO_KEY_A].sort());
  });

  it("user fields: archived, importanceLevel, lastPractisedAt and title kept; the new title is ignored", async () => {
    await seed();
    await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]));
    const note = await readNote(HASH);
    expect(note.ok && note.value).toEqual({
      ...NEW_FILE,
      schemaVersion: 1,
      title: "A",
      archived: true,
      importanceLevel: 3,
      lastPractisedAt: T1,
    });
  });

  it("prune: the row for a vanished concept is deleted, the others unchanged, none created", async () => {
    await seed();
    await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]));
    const progress = await readConceptProgress(HASH);
    expect(progress.ok && progress.value).toEqual([progressRow(HASH, "k-a")]);
  });

  it("prune: an invalid row for a vanished concept is deleted; an invalid row for a kept concept is left as is", async () => {
    await seed();
    const badKept = { schemaVersion: 1, noteHash: HASH, keyConceptId: "k-a", state: "great" };
    const badGone = { schemaVersion: 1, noteHash: HASH, keyConceptId: "k-x", state: "great" };
    const db = await openDb();
    await db.put("conceptProgress", badKept as never);
    await db.put("conceptProgress", badGone as never);
    db.close();
    expect((await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]))).ok).toBe(true);
    const after = await openDb();
    expect(await after.get("conceptProgress", [HASH, "k-a"])).toEqual(badKept);
    expect(await after.get("conceptProgress", [HASH, "k-x"])).toBeUndefined();
    after.close();
  });

  it("active Round on the old cache key: abandoned, answers kept", async () => {
    await seed();
    await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]));
    const round = await readRound("live-old");
    expect(round.ok && round.value).toEqual({ ...roundRow("live-old", HASH, KEY_A), status: "abandoned" });
  });

  it("active Round on the new cache key (an earlier set on that key): abandoned too", async () => {
    await seed();
    const db = await openDb();
    await db.put("rounds", roundRow("live-new", HASH, KEY_B));
    db.close();
    await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]));
    const round = await readRound("live-new");
    expect(round.ok && round.value).toEqual({ ...roundRow("live-new", HASH, KEY_B), status: "abandoned" });
  });

  it("other Rounds: a complete and an abandoned Round of the Note, and the demo: twin's records stay untouched", async () => {
    await seed();
    const db = await openDb();
    await db.put("rounds", roundRow("live-new", HASH, KEY_B, "abandoned"));
    await db.put("rounds", roundRow("live-done", HASH, KEY_A, "complete"));
    db.close();
    const before = await snapshot();
    await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]));
    const after = await snapshot();
    const demoOnly = <T extends { noteHash: string }>(rows: T[]) => rows.filter((r) => r.noteHash === DEMO_HASH);
    expect(demoOnly(after.notes)).toEqual(demoOnly(before.notes));
    expect(demoOnly(after.studySets)).toEqual(demoOnly(before.studySets));
    expect(demoOnly(after.progress)).toEqual(demoOnly(before.progress));
    expect(demoOnly(after.rounds)).toEqual(demoOnly(before.rounds));
    for (const id of ["live-new", "live-done"]) {
      const round = await readRound(id);
      expect(round.ok && round.value).toEqual(before.rounds.find((r) => r.roundId === id));
    }
  });

  it("invalid stored Note: written fresh, nothing deleted", async () => {
    await seed();
    const db = await openDb();
    const stored = await db.get("notes", HASH);
    await db.put("notes", { ...stored!, importanceLevel: "high" } as never);
    db.close();
    expect((await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]))).ok).toBe(true);
    expect(await readNote(HASH)).toEqual({ ok: true, value: { ...NEW_FILE, schemaVersion: 1 } });
    expect((await readStudySet(KEY_A)).ok).toBe(true);
    const progress = await readConceptProgress(HASH);
    expect(progress.ok && progress.value.map((p) => p.keyConceptId).sort()).toEqual(["k-a", "k-x"]);
    const round = await readRound("live-old");
    expect(round.ok && round.value.status).toBe("active");
  });

  it("write fails: the transaction aborts; Note, set, rows and Rounds unchanged", async () => {
    await seed();
    const before = await snapshot();
    // The set's put is queued last, after the Note put, the deletes and the abandon; it cannot be cloned.
    const broken = { ...setWith(KEY_B, ["k-a", "k-b"]), extra: () => 1 } as unknown as VerifiedStudySet;
    expect(await saveGeneratedNote(NEW_FILE, broken)).toEqual({ ok: false, code: "err.generation" });
    expect(await snapshot()).toEqual(before);
  });

  it("an invalid Round row of the Note is left as is", async () => {
    await seed();
    const bad = { ...roundRow("live-bad", HASH, KEY_A), startedAt: "i går" };
    const db = await openDb();
    await db.put("rounds", bad as never);
    db.close();
    expect((await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]))).ok).toBe(true);
    const after = await openDb();
    expect(await after.get("rounds", "live-bad")).toEqual(bad);
    after.close();
    const live = await readRound("live-old");
    expect(live.ok && live.value.status).toBe("abandoned");
  });

  it("an earlier request rejects asynchronously (the old-set delete): everything rolls back", async () => {
    await seed();
    const before = await snapshot();
    const original = IDBObjectStore.prototype.delete;
    // The old-set delete becomes an `add` of an existing key: that request fails later with ConstraintError,
    // after the Note put, the prune, the abandon and the set put have all been queued.
    const spy = vi.spyOn(IDBObjectStore.prototype, "delete").mockImplementation(function (this: IDBObjectStore, key) {
      if (this.name === "studySets") return this.add({ cacheKey: key, noteHash: HASH }) as unknown as IDBRequest<undefined>;
      return original.call(this, key);
    });
    try {
      expect(await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]))).toEqual({ ok: false, code: "err.generation" });
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
    expect(await snapshot()).toEqual(before);
  });

  it("one call on a new cache key: every outcome at once, and readNote returns the merged Note", async () => {
    await seed();
    expect(await saveGeneratedNote(NEW_FILE, setWith(KEY_B, ["k-a", "k-b"]))).toEqual({ ok: true, value: undefined });
    const after = await snapshot();
    const live = <T extends { noteHash: string }>(rows: T[]) => rows.filter((r) => r.noteHash === HASH);
    expect(live(after.studySets).map((s) => s.cacheKey)).toEqual([KEY_B]);
    expect(live(after.progress)).toEqual([progressRow(HASH, "k-a")]);
    expect(live(after.rounds).map((r) => [r.roundId, r.status])).toEqual([["live-old", "abandoned"]]);
    expect(await readNote(HASH)).toEqual({
      ok: true,
      value: { ...NEW_FILE, schemaVersion: 1, title: "A", archived: true, importanceLevel: 3, lastPractisedAt: T1 },
    });
  });
});

describe("recordFlashcardMark (Story 2.2)", () => {
  const T3 = "2026-11-25T12:00:00.000Z";
  const mark = (itemId: string, knew: boolean, state: FlashcardMark["state"] = knew ? "known" : "shaky"): FlashcardMark => ({
    roundId: "r-1",
    itemId,
    keyConceptId: itemId.split(".")[0],
    knew,
    state,
    answeredAt: T3,
  });
  const started = async () => {
    const saved = await startRound(await compose("r-1", T1));
    if (!saved.ok) throw new Error("start failed");
    return saved.value;
  };

  it("appends the answer and puts the concept's state in one go; the other progress fields stay", async () => {
    const round = await started();
    expect(round.itemIds[0]).toBe("k-a.fc1");
    const saved = await recordFlashcardMark(mark("k-a.fc1", true));
    expect(saved.ok).toBe(true);
    const { progress, rounds } = await all();
    const row = progress.find((p) => p.keyConceptId === "k-a");
    expect(row).toEqual({
      schemaVersion: 1,
      noteHash: DEMO_HASH,
      keyConceptId: "k-a",
      state: "known",
      lastShownAt: T1,
      lastUsedQuizQuestionId: "k-a.qq1",
    });
    expect(rounds[0]).toEqual({ ...round, answers: [{ itemId: "k-a.fc1", knew: true, answeredAt: T3 }] });
    expect(saved.ok && saved.value).toEqual({ round: rounds[0], progress: row });
  });

  it("'Kunne det ikke' stores shaky; each mark puts only its own concept's state", async () => {
    await started();
    expect((await recordFlashcardMark(mark("k-a.fc1", false))).ok).toBe(true);
    let progress = await readConceptProgress(DEMO_HASH);
    expect(progress.ok && progress.value.find((p) => p.keyConceptId === "k-a")?.state).toBe("shaky");
    expect((await recordFlashcardMark(mark("k-b.fc1", true))).ok).toBe(true);
    progress = await readConceptProgress(DEMO_HASH);
    const states = Object.fromEntries((progress.ok ? progress.value : []).map((p) => [p.keyConceptId, p.state]));
    expect(states).toEqual({ "k-a": "shaky", "k-b": "known", "k-c": "new" });
  });

  it("the same Item twice (double press): one answer, the second call resolves to the stored records", async () => {
    await started();
    const first = await recordFlashcardMark(mark("k-a.fc1", true));
    const second = await recordFlashcardMark(mark("k-a.fc1", false));
    expect(second).toEqual(first);
    const { rounds, progress } = await all();
    expect(rounds[0].answers).toHaveLength(1);
    expect(progress.find((p) => p.keyConceptId === "k-a")?.state).toBe("known");
  });

  it("rejects, writing nothing: an Item out of order, a concept that does not own the Item, an unknown Round", async () => {
    await started();
    const before = await all();
    expect(await recordFlashcardMark(mark("k-b.fc1", true))).toEqual({ ok: false, code: "err.generation" });
    expect((await recordFlashcardMark({ ...mark("k-a.fc1", true), keyConceptId: "k-b" })).ok).toBe(false);
    expect((await recordFlashcardMark({ ...mark("k-a.fc1", true), roundId: "nope" })).ok).toBe(false);
    expect(await all()).toEqual(before);
  });

  it("rejects a mark on a Round that is not active, also a repeat of its last answer", async () => {
    await started();
    await recordFlashcardMark(mark("k-a.fc1", true));
    await startRound(await compose("r-2", T2));
    const before = await all();
    expect((await recordFlashcardMark(mark("k-b.fc1", true))).ok).toBe(false);
    expect((await recordFlashcardMark(mark("k-a.fc1", true))).ok).toBe(false);
    expect(await all()).toEqual(before);
  });

  it("rejects a Quiz Question ID, and a repeat of an earlier (not the last) answer", async () => {
    const round = await started();
    let db = await openDb();
    await db.put("rounds", { ...round, itemIds: ["k-a.qq1", "k-a.fc1"] });
    db.close();
    expect((await recordFlashcardMark(mark("k-a.qq1", true))).ok).toBe(false);
    db = await openDb();
    await db.put("rounds", round);
    db.close();
    await recordFlashcardMark(mark("k-a.fc1", true));
    await recordFlashcardMark(mark("k-b.fc1", true));
    expect((await recordFlashcardMark(mark("k-a.fc1", false))).ok).toBe(false);
    const read = await readRound("r-1");
    expect(read.ok && read.value.answers).toHaveLength(2);
  });

  it("the mark that answers the last Item completes the Round in the same transaction", async () => {
    const round = await started();
    const onlyCards: RoundRecord = { ...round, itemIds: ["k-a.fc1", "k-b.fc1"], optionOrder: {} };
    const db = await openDb();
    await db.put("rounds", onlyCards);
    db.close();
    const first = await recordFlashcardMark(mark("k-a.fc1", true));
    expect(first.ok && first.value.round).toMatchObject({ status: "active", completedAt: null });
    const last = await recordFlashcardMark(mark("k-b.fc1", false));
    expect(last.ok && last.value.round).toMatchObject({ status: "complete", completedAt: T3 });
    const read = await readRound("r-1");
    expect(read.ok && read.value).toMatchObject({ status: "complete", completedAt: T3 });
    expect(read.ok && read.value.answers.map((a) => a.itemId)).toEqual(["k-a.fc1", "k-b.fc1"]);
  });

  it("the last Flashcard of a Round with Quiz Questions leaves it active", async () => {
    await started();
    for (const id of ["k-a.fc1", "k-b.fc1", "k-c.fc1"]) await recordFlashcardMark(mark(id, true));
    const read = await readRound("r-1");
    expect(read.ok && read.value).toMatchObject({ status: "active", completedAt: null });
  });

  it("a missing progress row is created with the new state", async () => {
    await started();
    const db = await openDb();
    await db.delete("conceptProgress", [DEMO_HASH, "k-a"]);
    db.close();
    const saved = await recordFlashcardMark(mark("k-a.fc1", false));
    expect(saved.ok && saved.value.progress).toEqual({
      schemaVersion: 1,
      noteHash: DEMO_HASH,
      keyConceptId: "k-a",
      state: "shaky",
      lastShownAt: T1,
      lastUsedQuizQuestionId: null,
    });
  });

  it("write fails (a value that cannot be cloned): nothing changes", async () => {
    await started();
    const before = await all();
    const broken = { ...mark("k-a.fc1", true), answeredAt: (() => 1) as unknown as string };
    expect((await recordFlashcardMark(broken)).ok).toBe(false);
    expect(await all()).toEqual(before);
  });

  it("without IndexedDB: not ok, no throw", async () => {
    globalThis.indexedDB = undefined as unknown as IDBFactory;
    expect(await recordFlashcardMark(mark("k-a.fc1", true))).toEqual({ ok: false, code: "err.generation" });
  });
});
