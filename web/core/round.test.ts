// Story 2.1: composeRound (FR-18), one test per rule and per spec I/O matrix row.
import { describe, expect, it } from "vitest";
import { composeRound, nextQuizQuestionId, shuffledIndices, type ComposeRoundInput, type MasteryState } from "./round";
import type { VerifiedKeyConcept } from "./types";

const NOW = "2026-11-25T10:00:00.000Z";

function concept(
  n: number,
  { rank = n, flashcards = 1, quiz = 1, covered = true }: { rank?: number; flashcards?: number; quiz?: number; covered?: boolean } = {},
): VerifiedKeyConcept {
  const id = `k-${n}`;
  const ref = { passageId: "p1", quote: "q" };
  return {
    id,
    name: `Begrep ${n}`,
    centralityRank: rank,
    covered,
    flashcards: covered ? Array.from({ length: flashcards }, (_, i) => ({ id: `${id}.fc${i + 1}`, front: "F", back: "B", ...ref })) : [],
    quizQuestions: covered
      ? Array.from({ length: quiz }, (_, i) => ({
          id: `${id}.qq${i + 1}`,
          question: "Q",
          options: ["A", "B", "C", "D"],
          correctIndex: 0,
          ...ref,
        }))
      : [],
  };
}

type Row = { state: MasteryState; lastShownAt?: string | null; lastUsedQuizQuestionId?: string | null };

function input(concepts: VerifiedKeyConcept[], rows: Record<string, Row> = {}, random = () => 0.5): ComposeRoundInput {
  return {
    roundId: "r-1",
    noteHash: "demo:abc",
    cacheKey: "demo:abc:2:m",
    now: NOW,
    random,
    concepts,
    progress: Object.entries(rows).map(([keyConceptId, r]) => ({
      keyConceptId,
      state: r.state,
      lastShownAt: r.lastShownAt ?? null,
      lastUsedQuizQuestionId: r.lastUsedQuizQuestionId ?? null,
    })),
  };
}

const at = (day: number) => `2026-11-${String(day).padStart(2, "0")}T08:00:00.000Z`;

function compose(concepts: VerifiedKeyConcept[], rows: Record<string, Row> = {}) {
  const result = composeRound(input(concepts, rows));
  expect(result).not.toBeNull();
  return result!;
}

describe("composeRound: selection", () => {
  it("PRD 1: 3 shaky + 5 known → the 3 shaky, then the 1 least recently shown known", () => {
    const concepts = Array.from({ length: 8 }, (_, i) => concept(i + 1));
    const rows: Record<string, Row> = {
      "k-1": { state: "known", lastShownAt: at(20) },
      "k-2": { state: "shaky", lastShownAt: at(20) },
      "k-3": { state: "known", lastShownAt: at(10) },
      "k-4": { state: "shaky", lastShownAt: at(20) },
      "k-5": { state: "known", lastShownAt: at(21) },
      "k-6": { state: "shaky", lastShownAt: at(20) },
      "k-7": { state: "known", lastShownAt: at(22) },
      "k-8": { state: "known", lastShownAt: at(23) },
    };
    const { round } = compose(concepts, rows);
    expect(round.conceptIds).toEqual(["k-2", "k-4", "k-6", "k-3"]);
    expect(round.review).toBe(false);
  });

  it("PRD 2: 4 concepts, one without a Quiz Question → Flashcards of 4, Quiz Questions of 3", () => {
    const concepts = [concept(1), concept(2, { quiz: 0 }), concept(3), concept(4)];
    const { round, usedQuizQuestionIds } = compose(concepts);
    expect(round.itemIds).toEqual(["k-1.fc1", "k-2.fc1", "k-3.fc1", "k-4.fc1", "k-1.qq1", "k-3.qq1", "k-4.qq1"]);
    expect(usedQuizQuestionIds["k-2"]).toBeNull();
    expect(Object.keys(round.optionOrder)).toEqual(["k-1.qq1", "k-3.qq1", "k-4.qq1"]);
  });

  it("many new: 12 new → 8 new by Centrality Rank, no known to add", () => {
    // Stored order is not rank order.
    const concepts = Array.from({ length: 12 }, (_, i) => concept(i + 1, { rank: 12 - i }));
    const { round } = compose(concepts);
    expect(round.conceptIds).toEqual(["k-12", "k-11", "k-10", "k-9", "k-8", "k-7", "k-6", "k-5"]);
  });

  it("few known: 9 shaky/new + 1 known → 8 + 1 (max(1, round(0.2 × 8)) = 2, only 1 known exists)", () => {
    const concepts = Array.from({ length: 10 }, (_, i) => concept(i + 1));
    const rows: Record<string, Row> = { "k-10": { state: "known", lastShownAt: at(1) } };
    for (let i = 1; i <= 4; i++) rows[`k-${i}`] = { state: "shaky", lastShownAt: at(i) };
    const { round } = compose(concepts, rows);
    expect(round.conceptIds).toEqual(["k-1", "k-2", "k-3", "k-4", "k-5", "k-6", "k-7", "k-8", "k-10"]);
  });

  it("8 shaky/new adds 2 known (round(1.6)); 3 adds 1 (max(1, round(0.6)))", () => {
    const concepts = Array.from({ length: 12 }, (_, i) => concept(i + 1));
    const rows: Record<string, Row> = {};
    for (let i = 9; i <= 12; i++) rows[`k-${i}`] = { state: "known", lastShownAt: at(i) };
    expect(compose(concepts, rows).round.conceptIds).toEqual(["k-1", "k-2", "k-3", "k-4", "k-5", "k-6", "k-7", "k-8", "k-9", "k-10"]);

    for (let i = 4; i <= 8; i++) rows[`k-${i}`] = { state: "known", lastShownAt: at(i) };
    expect(compose(concepts, rows).round.conceptIds).toEqual(["k-1", "k-2", "k-3", "k-4"]);
  });

  it("review: 12 known → the 10 least recently shown, review true", () => {
    const concepts = Array.from({ length: 12 }, (_, i) => concept(i + 1));
    const rows: Record<string, Row> = {};
    // k-1 and k-2 are the most recently shown and are left out.
    for (let i = 1; i <= 12; i++) rows[`k-${i}`] = { state: "known", lastShownAt: at(25 - i) };
    const { round } = compose(concepts, rows);
    expect(round.review).toBe(true);
    expect(round.conceptIds).toEqual(["k-12", "k-11", "k-10", "k-9", "k-8", "k-7", "k-6", "k-5", "k-4", "k-3"]);
  });

  it("not covered: excluded from the Round and from the eligible concepts (no progress row)", () => {
    const concepts = [concept(1, { covered: false }), concept(2), concept(3)];
    const result = compose(concepts);
    expect(result.round.conceptIds).toEqual(["k-2", "k-3"]);
    expect(result.eligibleConceptIds).toEqual(["k-2", "k-3"]);
    expect(result.round.itemIds.some((id) => id.startsWith("k-1."))).toBe(false);
  });

  it("no covered concept → null", () => {
    expect(composeRound(input([concept(1, { covered: false })]))).toBeNull();
  });

  it("shaky before new, each least recently shown first, never shown first, ties by rank", () => {
    const concepts = [concept(1, { rank: 3 }), concept(2, { rank: 1 }), concept(3, { rank: 2 }), concept(4, { rank: 4 }), concept(5, { rank: 5 })];
    const rows: Record<string, Row> = {
      "k-1": { state: "new", lastShownAt: at(1) },
      "k-4": { state: "shaky", lastShownAt: at(9) },
      "k-5": { state: "shaky", lastShownAt: at(3) },
    };
    // Shaky: k-5 (day 3), k-4 (day 9). New: never shown k-2 (rank 1), k-3 (rank 2), then k-1 (day 1).
    expect(compose(concepts, rows).round.conceptIds).toEqual(["k-5", "k-4", "k-2", "k-3", "k-1"]);
  });

  it("known concepts come last, after shaky and new, even when shown longer ago", () => {
    const concepts = [concept(1), concept(2), concept(3)];
    const rows: Record<string, Row> = { "k-1": { state: "known", lastShownAt: at(1) }, "k-2": { state: "shaky", lastShownAt: at(9) } };
    expect(compose(concepts, rows).round.conceptIds).toEqual(["k-2", "k-3", "k-1"]);
  });

  it("never more than 10 concepts", () => {
    const concepts = Array.from({ length: 30 }, (_, i) => concept(i + 1));
    const rows: Record<string, Row> = {};
    for (let i = 1; i <= 15; i++) rows[`k-${i}`] = { state: "known" };
    expect(compose(concepts, rows).round.conceptIds).toHaveLength(10);
  });
});

describe("composeRound: Items", () => {
  it("all surviving Flashcards per concept in concept order, then one Quiz Question per concept", () => {
    const concepts = [concept(1, { flashcards: 2, quiz: 2 }), concept(2, { flashcards: 1, quiz: 1 })];
    const rows: Record<string, Row> = { "k-2": { state: "shaky" } };
    expect(compose(concepts, rows).round.itemIds).toEqual(["k-2.fc1", "k-1.fc1", "k-1.fc2", "k-2.qq1", "k-1.qq1"]);
  });

  it("rotation: qq1, qq2 with last used qq2 → qq1 (wraps)", () => {
    const { round, usedQuizQuestionIds } = compose([concept(1, { quiz: 2 })], {
      "k-1": { state: "shaky", lastUsedQuizQuestionId: "k-1.qq2" },
    });
    expect(round.itemIds).toContain("k-1.qq1");
    expect(usedQuizQuestionIds["k-1"]).toBe("k-1.qq1");
  });

  it("rotation: last used qq1 → qq2; none or stale → the first", () => {
    const c = concept(1, { quiz: 3 });
    expect(nextQuizQuestionId(c, "k-1.qq1")).toBe("k-1.qq2");
    expect(nextQuizQuestionId(c, null)).toBe("k-1.qq1");
    expect(nextQuizQuestionId(c, "k-1.qq9")).toBe("k-1.qq1");
    expect(nextQuizQuestionId(concept(2, { quiz: 0 }), null)).toBeNull();
  });

  it("optionOrder: a permutation of the original indices per Quiz Question, from the random source", () => {
    const sequence = [0.1, 0.9, 0.4, 0.7, 0.2, 0.3];
    let i = 0;
    const random = () => sequence[i++ % sequence.length];
    const result = composeRound(input([concept(1), concept(2)], {}, random))!;
    for (const order of Object.values(result.round.optionOrder)) expect([...order].sort()).toEqual([0, 1, 2, 3]);
    // The same random sequence gives the same order (pure).
    i = 0;
    expect(composeRound(input([concept(1), concept(2)], {}, random))!.round.optionOrder).toEqual(result.round.optionOrder);
  });

  it("shuffledIndices: identity when random() is near 1 (or 1, clamped); a permutation for any source", () => {
    expect(shuffledIndices(4, () => 0.9999)).toEqual([0, 1, 2, 3]);
    expect([...shuffledIndices(4, () => 0)].sort()).toEqual([0, 1, 2, 3]);
    expect(shuffledIndices(4, () => 1)).toEqual([0, 1, 2, 3]);
    expect(shuffledIndices(0, Math.random)).toEqual([]);
  });
});

describe("composeRound: the record", () => {
  it("is an active Round with the given ID, time and keys (demo: prefixes kept), no answers", () => {
    const { round } = compose([concept(1)]);
    expect(round).toMatchObject({
      roundId: "r-1",
      noteHash: "demo:abc",
      cacheKey: "demo:abc:2:m",
      answers: [],
      status: "active",
      startedAt: NOW,
      completedAt: null,
    });
    expect(round).not.toHaveProperty("number");
  });

  it("does not mutate its input", () => {
    const concepts = [concept(2, { rank: 2 }), concept(1, { rank: 1 })];
    const before = JSON.stringify(concepts);
    compose(concepts);
    expect(JSON.stringify(concepts)).toBe(before);
  });
});
