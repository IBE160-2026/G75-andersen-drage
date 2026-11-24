// evaluate.ts (Story 1.13, I/O matrix "Evaluate"): cells, per-model means, the floor and the choice rule.
import { describe, expect, it } from "vitest";
import type { RawStudySet } from "../core/types";
import { evaluate, report, type ExportedNote, type Recording } from "./evaluate";

const QUOTE = "Fotosyntese er prosessen der planter lager sukker.";
const PASSAGES = [{ id: "p1", text: QUOTE }];
const note = (name: string, hash: string): ExportedNote => ({ note: name, noteHash: hash, passages: PASSAGES });
const A = note("a.md", "a".repeat(64));
const B = note("b.md", "b".repeat(64));
const NOTES = [A, B];

/** A Proxy-validated set with 5 concepts × (1 Flashcard + 1 Quiz Question) and 5 Summary Points. `bad` Items cite a missing Quote. */
function validated(model: string, { badFlashcards = 0, badPoints = 0 } = {}): RawStudySet {
  const quote = (bad: boolean) => (bad ? "Dette sitatet står ikke i notatet." : QUOTE);
  return {
    concepts: Array.from({ length: 5 }, (_, i) => ({
      name: `Begrep ${i + 1}`,
      centralityRank: i + 1,
      flashcards: [{ front: "F?", back: "B.", passageId: "p1", quote: quote(i < badFlashcards) }],
      quizQuestions: [{ question: "Q?", options: ["a", "b", "c", "d"], correctIndex: 0, passageId: "p1", quote: QUOTE }],
    })),
    summaryPoints: Array.from({ length: 5 }, (_, i) => ({ text: "Punkt.", passageId: "p1", quote: quote(i < badPoints) })),
    language: "nb",
    model,
    promptVersion: "2",
  };
}

const ok = (model: string, ms: number, opts?: Parameters<typeof validated>[1]): Recording => {
  const set = validated(model, opts);
  return { studySet: set, validated: set, model, generationMs: ms };
};
const failed = (model: string): Recording => ({ studySet: null, validated: null, model, generationMs: 40000, error: "ModelRequestTimeout" });
const rejected = (model: string): Recording => ({ studySet: {}, validated: null, model, generationMs: 900 });

describe("evaluate", () => {
  it("shows a missing recording as —, a failed call as failed and a rules rejection as rejected", () => {
    const { rows } = evaluate([A, B], {
      m__x: { [A.noteHash]: failed("m/x") },
      m__y: { [A.noteHash]: rejected("m/y"), [B.noteHash]: ok("m/y", 1000) },
    });
    expect(rows).toEqual([
      ["m/x", "a.md", "failed", "—", "—", "—", "failed", "40000 ms"],
      ["m/x", "b.md", "—", "—", "—", "—", "—", "—"],
      ["m/y", "a.md", "—", "—", "—", "—", "rejected", "900 ms"],
      ["m/y", "b.md", "100.0 %", "5", "5", "5", "ok", "1000 ms"],
    ]);
  });

  it("averages the pass rate over every note, counting a failed note as 0 %", () => {
    const { summary, winner } = evaluate(NOTES, {
      m__x: { [A.noteHash]: ok("m/x", 1000), [B.noteHash]: failed("m/x") },
    });
    expect(summary).toEqual([
      { slug: "m__x", model: "m/x", meanPassRate: 0.5, items: 15, meanMs: 20500, allOk: false },
    ]);
    expect(winner).toBeNull();
  });

  it("excludes a model with a note below the err.tooFewItems floor, even with the higher pass rate", () => {
    // m/low: 1 of 5 Flashcards fails on note B (4 survivors < 5): err.tooFewItems; mean (15 + 14) / 30.
    // m/ok: 1 of 6 Summary Points fails on both notes, every note still ok; mean 15 / 16 (lower).
    const sixPoints = (model: string) => {
      const r = ok(model, 5000, { badPoints: 1 });
      (r.validated!.summaryPoints as RawStudySet["summaryPoints"][number][]).push({ text: "Ekstra.", passageId: "p1", quote: QUOTE });
      return r;
    };
    const { rows, summary, winner } = evaluate(NOTES, {
      m__low: { [A.noteHash]: ok("m/low", 100), [B.noteHash]: ok("m/low", 100, { badFlashcards: 1 }) },
      m__ok: { [A.noteHash]: sixPoints("m/ok"), [B.noteHash]: sixPoints("m/ok") },
    });
    expect(rows.find((r) => r[0] === "m/low" && r[1] === "b.md")?.[6]).toBe("err.tooFewItems");
    const low = summary.find((s) => s.model === "m/low")!;
    const okModel = summary.find((s) => s.model === "m/ok")!;
    expect(low.meanPassRate!).toBeGreaterThan(okModel.meanPassRate!);
    expect(low.allOk).toBe(false);
    expect(winner?.model).toBe("m/ok");
  });

  it("chooses by pass rate, then surviving Items, then generation time", () => {
    const both = (model: string, ms: number, opts?: Parameters<typeof validated>[1]) => ({
      [A.noteHash]: ok(model, ms, opts),
      [B.noteHash]: ok(model, ms, opts),
    });
    // Pass rate wins over items and speed.
    expect(evaluate(NOTES, { m__fast: both("m/fast", 10, { badPoints: 1 }), m__best: both("m/best", 9000) }).winner?.model).toBe(
      "m/best",
    );

    // Equal pass rate: more surviving Items wins over speed (a 6th Summary Point that passes).
    const more = ok("m/more", 9000);
    (more.validated!.summaryPoints as RawStudySet["summaryPoints"][number][]).push({ text: "Ekstra.", passageId: "p1", quote: QUOTE });
    expect(
      evaluate(NOTES, { m__fast: both("m/fast", 10), m__more: { [A.noteHash]: more, [B.noteHash]: more } }).winner?.model,
    ).toBe("m/more");

    // Equal pass rate and Items: the faster model wins.
    expect(evaluate(NOTES, { m__slow: both("m/slow", 9000), m__quick: both("m/quick", 10) }).winner?.model).toBe("m/quick");
  });

  it("treats pass rates equal at the printed 0.1 % as a tie, so surviving Items decide", () => {
    // m/many: 1 failing Quote among 2 110 Items per note (99.95 %, printed 100.0 %), far more survivors.
    const many = ok("m/many", 9000, { badPoints: 1 });
    const points = many.validated!.summaryPoints as RawStudySet["summaryPoints"][number][];
    for (let i = 0; i < 2100; i++) points.push({ text: "Ekstra.", passageId: "p1", quote: QUOTE });
    const perfect = ok("m/perfect", 10);
    const result = evaluate(NOTES, {
      m__many: { [A.noteHash]: many, [B.noteHash]: many },
      m__perfect: { [A.noteHash]: perfect, [B.noteHash]: perfect },
    });
    expect(result.summary.find((s) => s.model === "m/many")!.meanPassRate!).toBeLessThan(1);
    expect(result.winner?.model).toBe("m/many");
  });

  it("report() names the winner and its promote slug, or none", () => {
    const one = evaluate(NOTES, { m__x: { [A.noteHash]: ok("m/x", 1), [B.noteHash]: ok("m/x", 1) } });
    expect(report(one).split("\n").at(-1)).toBe("Choice: m/x (promote with --promote m__x)");
    const none = evaluate(NOTES, { m__x: {} });
    expect(report(none).split("\n").at(-1)).toMatch(/^Choice: none/);
  });
});
