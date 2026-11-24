// Story 1.8: verifyStudySet, one test (or more) per row of the spec's I/O & Edge-Case Matrix.
import { describe, expect, it } from "vitest";
import type { components } from "../api/schema";
import { messages } from "../i18n/messages";
import { noteHash } from "./noteHash";
import type { Passage, RawKeyConcept, RawQuizQuestion, RawStudySet, VerifiedStudySet } from "./types";
import { quoteCheck, verifyStudySet, type VerifyResult } from "./verifyStudySet";

// Type-level check: the contract's StudySet must be assignable to RawStudySet (fails `tsc` otherwise).
const contractIsRaw = (s: components["schemas"]["StudySet"]): RawStudySet => s;
void contractIsRaw;

// Type-level check: every failure code is a message key (fails `tsc` otherwise).
const codeIsKey = (c: Extract<VerifyResult, { ok: false }>["code"]): keyof typeof messages => c;
void codeIsKey;

const PASSAGES: Passage[] = [
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `p${i + 1}`,
    text: `Avsnitt ${i + 1} forklarer tema nummer ${i + 1} grundig. Det er skrevet for studenten som leser.`,
  })),
  // Straight quotes, as Normalization leaves them.
  { id: "p11", text: 'Læreren sa "lyset fanges av klorofyll" i timen.' },
];
/** Curly-quoted, padded form of a Quote from p11; normalizes to QUOTE_P11. */
const CURLY_P11 = "  sa  “lyset fanges av klorofyll”  ";
const QUOTE_P11 = 'sa "lyset fanges av klorofyll"';
const BY_ID = new Map(PASSAGES.map((p) => [p.id, p] as const));

/** A valid Quote (the first sentence) from Passage `n`. */
const q = (n: number) => `Avsnitt ${n} forklarer tema nummer ${n} grundig.`;

const fc = (n: number, quote = q(n), passageId = `p${n}`) => ({ front: `F${n}`, back: `B${n}`, passageId, quote });
const qq = (n: number, overrides: Partial<RawQuizQuestion> = {}): RawQuizQuestion => ({
  question: `Q${n}`,
  options: ["A", "B", "C", "D"],
  correctIndex: 0,
  passageId: `p${n}`,
  quote: q(n),
  ...overrides,
});
const sp = (n: number, quote = q(n), passageId = `p${n}`) => ({ text: `S${n}`, passageId, quote });

const concept = (name: string, n: number, extra: Partial<RawKeyConcept> = {}): RawKeyConcept => ({
  name,
  centralityRank: n,
  flashcards: [fc(n)],
  quizQuestions: [qq(n)],
  ...extra,
});

const NAMES = ["Fotosyntese", "Celleånding", "Mitose", "Meiose", "Osmose", "Diffusjon"];

function rawSet(overrides: Partial<RawStudySet> = {}): RawStudySet {
  return {
    concepts: NAMES.slice(0, 5).map((name, i) => concept(name, i + 1)),
    summaryPoints: [1, 2, 3, 4, 5].map((n) => sp(n)),
    language: "nb",
    model: "anthropic/claude-haiku-5.5",
    promptVersion: "v1",
    ...overrides,
  };
}

function ok(raw: RawStudySet): VerifiedStudySet {
  const result = verifyStudySet(raw, PASSAGES);
  if (!result.ok) throw new Error(`expected ok, got ${result.code}`);
  return result.set;
}

describe("verifyStudySet: happy path and IDs", () => {
  it("happy: 5 concepts with 1 fc + 1 qq each and 5 sp → ok, every concept covered", () => {
    const set = ok(rawSet());
    expect(set.concepts).toHaveLength(5);
    expect(set.concepts.every((c) => c.covered)).toBe(true);
    expect(set.summaryPoints).toHaveLength(5);
    expect(set.concepts[0]).toEqual({
      id: "k-fotosyntese",
      name: "Fotosyntese",
      centralityRank: 1,
      covered: true,
      flashcards: [{ id: "k-fotosyntese.fc1", front: "F1", back: "B1", passageId: "p1", quote: q(1) }],
      quizQuestions: [
        {
          id: "k-fotosyntese.qq1",
          question: "Q1",
          options: ["A", "B", "C", "D"],
          correctIndex: 0,
          passageId: "p1",
          quote: q(1),
        },
      ],
    });
  });

  it("IDs: concept slug, .fc1/.fc2, .qq1/.qq2 and sp1…sp6", () => {
    const c4 = concept("Fotosyntese i C4-planter", 1, {
      flashcards: [fc(1), fc(2)],
      quizQuestions: [qq(1), qq(2)],
    });
    const set = ok(
      rawSet({
        concepts: [c4, ...NAMES.slice(1, 5).map((name, i) => concept(name, i + 2))],
        summaryPoints: [1, 2, 3, 4, 5, 6].map((n) => sp(n)),
      }),
    );
    const first = set.concepts[0];
    expect(first.id).toBe("k-fotosyntese-i-c4-planter");
    expect(first.flashcards.map((x) => x.id)).toEqual(["k-fotosyntese-i-c4-planter.fc1", "k-fotosyntese-i-c4-planter.fc2"]);
    expect(first.quizQuestions.map((x) => x.id)).toEqual([
      "k-fotosyntese-i-c4-planter.qq1",
      "k-fotosyntese-i-c4-planter.qq2",
    ]);
    expect(set.summaryPoints.map((x) => x.id)).toEqual(["sp1", "sp2", "sp3", "sp4", "sp5", "sp6"]);
  });

  it("collision: a later concept with the same slug is dropped with its Items", () => {
    const set = ok(
      rawSet({
        concepts: [
          concept("Celle-ånding", 1),
          concept("celle ånding", 2, { flashcards: [fc(9)], quizQuestions: [qq(9)] }),
          ...["A1", "A2", "A3", "A4"].map((name, i) => concept(name, i + 3)),
        ],
      }),
    );
    expect(set.concepts.map((c) => c.id)).toEqual(["k-celle-ånding", "k-a1", "k-a2", "k-a3", "k-a4"]);
    expect(set.concepts[0].name).toBe("Celle-ånding");
    expect(set.concepts.flatMap((c) => c.flashcards).some((x) => x.passageId === "p9")).toBe(false);
    expect(set.concepts.flatMap((c) => c.quizQuestions).some((x) => x.passageId === "p9")).toBe(false);
  });

  it("empty slug: a concept named ??? is dropped with its Items", () => {
    const set = ok(rawSet({ concepts: [concept("???", 9), ...NAMES.slice(0, 5).map((n, i) => concept(n, i + 1))] }));
    expect(set.concepts.map((c) => c.id)).toEqual(["k-fotosyntese", "k-celleånding", "k-mitose", "k-meiose", "k-osmose"]);
    expect(set.concepts.flatMap((c) => c.flashcards).some((x) => x.passageId === "p9")).toBe(false);
    expect(set.concepts.flatMap((c) => c.quizQuestions).some((x) => x.passageId === "p9")).toBe(false);
  });

  it("ID stability: when fc1 fails, the survivor keeps .fc2", () => {
    const first = concept("Fotosyntese", 1, { flashcards: [fc(1, q(1), "p99"), fc(2)] });
    const set = ok(rawSet({ concepts: [first, ...NAMES.slice(1, 5).map((n, i) => concept(n, i + 2)), concept("Ekstra", 6)] }));
    expect(set.concepts[0].flashcards.map((x) => x.id)).toEqual(["k-fotosyntese.fc2"]);
  });

  it("ID stability: when qq1 fails, the survivor keeps .qq2", () => {
    const first = concept("Fotosyntese", 1, { quizQuestions: [qq(1, { passageId: "p99" }), qq(2)] });
    const set = ok(rawSet({ concepts: [first, ...NAMES.slice(1, 5).map((n, i) => concept(n, i + 2)), concept("Ekstra", 6)] }));
    expect(set.concepts[0].quizQuestions.map((x) => x.id)).toEqual(["k-fotosyntese.qq2"]);
  });

  it("ID stability: when sp1 fails, the survivors keep sp2…sp6", () => {
    const summaryPoints = [sp(1, q(1), "p99"), sp(2), sp(3), sp(4), sp(5), sp(6)];
    const set = ok(rawSet({ summaryPoints }));
    expect(set.summaryPoints.map((x) => x.id)).toEqual(["sp2", "sp3", "sp4", "sp5", "sp6"]);
  });

  it("ranks are kept as sent, also with gaps after a duplicate drop", () => {
    const set = ok(
      rawSet({ concepts: [concept("Mitose", 1), concept("mitose", 2), ...["B", "C", "D", "E"].map((n, i) => concept(n, i + 3))] }),
    );
    expect(set.concepts.map((c) => c.centralityRank)).toEqual([1, 3, 4, 5, 6]);
  });
});

describe("quoteCheck", () => {
  it("bad Passage: an unknown passageId fails", () => {
    expect(quoteCheck("p99", q(1), BY_ID)).toBeNull();
  });

  it("wrong Passage: a Quote found in p3 but citing p2 fails", () => {
    expect(quoteCheck("p2", q(3), BY_ID)).toBeNull();
    expect(quoteCheck("p3", q(3), BY_ID)).toBe(q(3));
  });

  it("spans Passages: end of p1 + start of p2 fails against either", () => {
    const spanning = `${PASSAGES[0].text.slice(-25)} ${PASSAGES[1].text.slice(0, 25)}`;
    expect(quoteCheck("p1", spanning, BY_ID)).toBeNull();
    expect(quoteCheck("p2", spanning, BY_ID)).toBeNull();
  });

  it("normalization: curly quotes, soft hyphen and double spaces match a Passage with straight quotes", () => {
    const passages = new Map([["p1", { id: "p1", text: 'Han sa "lyset fanges av klorofyll" i timen.' }]]);
    const quote = "sa  “lyset fan­ges av   klorofyll”";
    expect(quoteCheck("p1", quote, passages)).toBe('sa "lyset fanges av klorofyll"');
  });

  it("length: 19 / 20 / 300 / 301 normalized code points → fail / pass / pass / fail", () => {
    const text = "abcdefghij".repeat(40);
    const passages = new Map([["p1", { id: "p1", text }]]);
    expect(quoteCheck("p1", text.slice(0, 19), passages)).toBeNull();
    expect(quoteCheck("p1", text.slice(0, 20), passages)).toBe(text.slice(0, 20));
    expect(quoteCheck("p1", text.slice(0, 300), passages)).toBe(text.slice(0, 300));
    expect(quoteCheck("p1", text.slice(0, 301), passages)).toBeNull();
  });

  it("length is counted in code points, not UTF-16 units", () => {
    const text = "😀".repeat(400);
    const passages = new Map([["p1", { id: "p1", text }]]);
    expect(quoteCheck("p1", "😀".repeat(19), passages)).toBeNull(); // 38 UTF-16 units
    expect(quoteCheck("p1", "😀".repeat(20), passages)).not.toBeNull();
    expect(quoteCheck("p1", "😀".repeat(300), passages)).not.toBeNull(); // 600 UTF-16 units
    expect(quoteCheck("p1", "😀".repeat(301), passages)).toBeNull();
  });

  it("length is measured after Normalization (whitespace padding does not count)", () => {
    const text = "abcdefghij".repeat(40);
    const passages = new Map([["p1", { id: "p1", text }]]);
    expect(quoteCheck("p1", `   ${text.slice(0, 19)}   `, passages)).toBeNull();
  });

  it("verifyStudySet stores the normalized Quote and drops failing Items", () => {
    const set = ok(
      rawSet({
        concepts: [
          concept("Fotosyntese", 1, { flashcards: [fc(1, `  ${q(1)}  `), fc(2, q(3))] }),
          ...NAMES.slice(1, 5).map((n, i) => concept(n, i + 2)),
          concept("Ekstra", 6),
        ],
      }),
    );
    expect(set.concepts[0].flashcards).toEqual([
      { id: "k-fotosyntese.fc1", front: "F1", back: "B1", passageId: "p1", quote: q(1) },
    ]);
  });

  it("verifyStudySet stores the normalized Quote for Quiz Questions and Summary Points", () => {
    const set = ok(
      rawSet({
        concepts: [
          concept("Fotosyntese", 1, { quizQuestions: [qq(1, { passageId: "p11", quote: CURLY_P11 })] }),
          ...NAMES.slice(1, 5).map((n, i) => concept(n, i + 2)),
        ],
        summaryPoints: [sp(1, CURLY_P11, "p11"), sp(2), sp(3), sp(4), sp(5)],
      }),
    );
    expect(set.concepts[0].quizQuestions.map((x) => x.quote)).toEqual([QUOTE_P11]);
    expect(set.summaryPoints[0]).toEqual({ id: "sp1", text: "S1", passageId: "p11", quote: QUOTE_P11 });
  });
});

describe("verifyStudySet: options, coverage, floors", () => {
  const withQuiz = (options: string[]) =>
    rawSet({
      concepts: [
        concept("Fotosyntese", 1, { quizQuestions: [qq(1, { options })] }),
        ...NAMES.slice(1, 5).map((n, i) => concept(n, i + 2)),
        concept("Ekstra", 6),
      ],
    });

  it('options: ["A", "a", …] is kept (case-sensitive)', () => {
    expect(ok(withQuiz(["A", "a", "B", "C"])).concepts[0].quizQuestions).toHaveLength(1);
  });

  it('options: ["A", "A ", …] is dropped (equal after Normalization)', () => {
    const set = ok(withQuiz(["A", "A ", "B", "C"]));
    expect(set.concepts[0].quizQuestions).toEqual([]);
    expect(set.concepts[0].covered).toBe(true); // its Flashcard survives
  });

  it("not covered: a concept that loses all Items is kept with covered: false and empty lists", () => {
    const lost = concept("Diffusjon", 6, { flashcards: [fc(6, q(6), "p99")], quizQuestions: [qq(6, { passageId: "p99" })] });
    const set = ok(rawSet({ concepts: [...rawSet().concepts, lost] }));
    expect(set.concepts[5]).toEqual({
      id: "k-diffusjon",
      name: "Diffusjon",
      centralityRank: 6,
      covered: false,
      flashcards: [],
      quizQuestions: [],
    });
  });

  it("covered: zero surviving Flashcards but a surviving Quiz Question is still covered", () => {
    const onlyQuiz = concept("Diffusjon", 6, { flashcards: [fc(6, q(6), "p99")] });
    const set = ok(rawSet({ concepts: [...rawSet().concepts, onlyQuiz] }));
    expect(set.concepts[5]).toMatchObject({ id: "k-diffusjon", covered: true, flashcards: [] });
    expect(set.concepts[5].quizQuestions.map((x) => x.id)).toEqual(["k-diffusjon.qq1"]);
  });

  it("floors: 4 concepts after dedupe → err.generation", () => {
    const concepts = [concept("Mitose", 1), concept("MITOSE", 2), ...["B", "C", "D"].map((n, i) => concept(n, i + 3))];
    expect(verifyStudySet(rawSet({ concepts }), PASSAGES)).toEqual({ ok: false, code: "err.generation" });
  });

  it("floors: not-covered concepts still count towards the 5 concepts", () => {
    // 4 covered concepts with 2 + 2 Items each, and one concept that loses everything.
    const covered = NAMES.slice(0, 4).map((name, i) =>
      concept(name, i + 1, { flashcards: [fc(i + 1), fc(i + 5)], quizQuestions: [qq(i + 1), qq(i + 5)] }),
    );
    const lost = concept("Tom", 5, { flashcards: [], quizQuestions: [qq(9, { passageId: "p99" })] });
    const set = ok(rawSet({ concepts: [...covered, lost] }));
    expect(set.concepts).toHaveLength(5);
    expect(set.concepts.filter((c) => !c.covered).map((c) => c.id)).toEqual(["k-tom"]);
  });

  it("floors: 4 sp after the Quote Check → err.generation", () => {
    const summaryPoints = [sp(1), sp(2), sp(3), sp(4), sp(5, q(5), "p99")];
    expect(verifyStudySet(rawSet({ summaryPoints }), PASSAGES)).toEqual({ ok: false, code: "err.generation" });
  });

  it("floors: 4 fc in total → err.tooFewItems", () => {
    const concepts = rawSet().concepts.map((c, i) => (i === 0 ? { ...c, flashcards: [fc(1, q(1), "p99")] } : c));
    expect(verifyStudySet(rawSet({ concepts }), PASSAGES)).toEqual({ ok: false, code: "err.tooFewItems" });
  });

  it("floors: 4 qq in total → err.tooFewItems", () => {
    const concepts = rawSet().concepts.map((c, i) => (i === 0 ? { ...c, quizQuestions: [] } : c));
    expect(verifyStudySet(rawSet({ concepts }), PASSAGES)).toEqual({ ok: false, code: "err.tooFewItems" });
  });

  it("floors: err.generation is checked before err.tooFewItems", () => {
    const concepts = rawSet().concepts.map((c) => ({ ...c, flashcards: [] }));
    const summaryPoints = [sp(1), sp(2), sp(3), sp(4)];
    expect(verifyStudySet(rawSet({ concepts, summaryPoints }), PASSAGES)).toEqual({ ok: false, code: "err.generation" });
  });

  it("returns only codes that are message keys", () => {
    for (const code of ["err.generation", "err.tooFewItems"]) expect(Object.hasOwn(messages, code), code).toBe(true);
  });
});

describe("verifyStudySet: language, cache key, purity", () => {
  it("language: the tag goes through checkLanguage", () => {
    expect(ok(rawSet({ language: "NB-no" })).language).toBe("nb");
    expect(ok(rawSet({ language: "xx" })).language).toBe("und");
  });

  it("cache key: `${noteHash(passages)}:${promptVersion}:${model}`", () => {
    const set = ok(rawSet());
    expect(set.cacheKey).toBe(`${noteHash(PASSAGES)}:v1:anthropic/claude-haiku-5.5`);
    expect(set.model).toBe("anthropic/claude-haiku-5.5");
    expect(set.promptVersion).toBe("v1");
  });

  it("is deterministic and does not mutate its input", () => {
    const raw = rawSet();
    const before = JSON.stringify(raw);
    expect(verifyStudySet(raw, PASSAGES)).toEqual(verifyStudySet(raw, PASSAGES));
    expect(JSON.stringify(raw)).toBe(before);
  });

  it("does not throw for odd but schema-valid input", () => {
    const odd = rawSet({
      concepts: [concept("__proto__", 1), concept("", 2), concept("constructor", 3)],
      summaryPoints: [sp(1, "", "__proto__")],
      language: "",
    });
    expect(() => verifyStudySet(odd, [])).not.toThrow();
    expect(verifyStudySet(odd, [])).toEqual({ ok: false, code: "err.generation" });
  });
});
