// @vitest-environment happy-dom
// Story 2.3: the Quiz region on the Round screen (UX-DR14): options in optionOrder, an answer keeps focus
// on the chosen option and fills the polite live line, 'Neste spørsmål' focuses the next h2, the last
// answer turns the control into 'Se resultatet', which opens Resultat (Story 2.4). Storage and the router are stubbed; db.test.ts covers
// the transaction itself.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pageTitle, t } from "../../i18n/messages";
import type { ConceptProgressRecord, NoteRecord, QuizAnswerInput, RoundRecord, StudySetRecord } from "../../storage/db";
import { displayOrder } from "./QuizQuestion";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const recordQuizAnswer = vi.fn();
vi.mock("../../storage/db", () => ({
  recordFlashcardMark: vi.fn(),
  recordQuizAnswer: (input: QuizAnswerInput) => recordQuizAnswer(input),
}));

const { RoundScreen } = await import("../Round/Round");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const T = "2026-11-25T10:00:00.000Z";
const ref = { passageId: "p1", quote: "Sitatet." };
const NOTE: NoteRecord = {
  schemaVersion: 1,
  noteHash: "h",
  title: "Notat",
  sourceType: "md",
  wordCount: 3,
  passages: [{ id: "p1", text: "Sitatet." }],
  normalizationVersion: 1,
  currentCacheKey: "h:2:m",
  archived: false,
  importanceLevel: 2,
  lastPractisedAt: null,
};
const question = (id: string, stem: string) => ({
  id,
  question: stem,
  options: ["null", "en", "to", "tre"],
  correctIndex: 0,
  ...ref,
});
const SET: StudySetRecord = {
  schemaVersion: 1,
  noteHash: "h",
  cacheKey: "h:2:m",
  model: "m",
  promptVersion: "2",
  language: "nb",
  summaryPoints: [],
  concepts: [
    { id: "k-a", name: "Begrep A", centralityRank: 1, covered: true, flashcards: [], quizQuestions: [question("k-a.qq1", "Spørsmål A?")] },
    { id: "k-b", name: "Begrep B", centralityRank: 2, covered: true, flashcards: [], quizQuestions: [question("k-b.qq1", "Spørsmål B?")] },
  ],
};
// Display order for k-a.qq1: A = "to", B = "null" (correct), C = "tre", D = "en".
const ROUND: RoundRecord = {
  schemaVersion: 1,
  roundId: "r-1",
  noteHash: "h",
  cacheKey: "h:2:m",
  number: 1,
  review: false,
  conceptIds: ["k-a", "k-b"],
  itemIds: ["k-a.qq1", "k-b.qq1"],
  optionOrder: { "k-a.qq1": [2, 0, 3, 1], "k-b.qq1": [0, 1, 2, 3] },
  answers: [],
  status: "active",
  startedAt: T,
  completedAt: null,
};
const row = (keyConceptId: string, state: ConceptProgressRecord["state"]): ConceptProgressRecord => ({
  schemaVersion: 1,
  noteHash: "h",
  keyConceptId,
  state,
  lastShownAt: T,
  lastUsedQuizQuestionId: `${keyConceptId}.qq1`,
});

let container: HTMLDivElement;
let root: Root;

function render(round: RoundRecord = ROUND) {
  act(() => root.render(<RoundScreen note={NOTE} studySet={SET} round={round} progress={[row("k-a", "known"), row("k-b", "new")]} wide />));
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  recordQuizAnswer.mockReset();
  push.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const options = () => [...container.querySelectorAll<HTMLButtonElement>("ul button")];
const option = (letter: string) => options().find((b) => b.textContent?.startsWith(letter))!;
const live = () => container.querySelector('[aria-live="polite"]')!;
const button = (name: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === name) as HTMLButtonElement | undefined;

async function choose(letter: string) {
  const target = option(letter);
  target.focus();
  await act(async () => {
    target.click();
  });
  return target;
}

const saved = (round: RoundRecord, progress: ConceptProgressRecord) => ({ ok: true, value: { round, progress } });
const withAnswer = (itemId: string, choice: number, extra: Partial<RoundRecord> = {}): RoundRecord => ({
  ...ROUND,
  answers: [...ROUND.answers, { itemId, choice, answeredAt: T }],
  ...extra,
});

describe("displayOrder", () => {
  it("is the stored permutation, or the Study Set order when it is missing or not a permutation", () => {
    expect(displayOrder([2, 0, 3, 1], 4)).toEqual([2, 0, 3, 1]);
    expect(displayOrder(undefined, 4)).toEqual([0, 1, 2, 3]);
    expect(displayOrder([0, 1, 2], 4)).toEqual([0, 1, 2, 3]);
    expect(displayOrder([0, 0, 2, 3], 4)).toEqual([0, 1, 2, 3]);
  });
});

describe("Quiz region, unanswered", () => {
  it("quiz titles, the region, options A–D in optionOrder, no Quote, an empty live line", () => {
    render();
    expect(document.activeElement?.tagName).toBe("H1");
    expect(document.activeElement?.textContent).toBe(`Runde 1${t("round.h1.quiz")}`);
    expect(document.activeElement?.querySelector(".visually-hidden")?.textContent).toBe(t("round.h1.quiz"));
    expect(document.title).toBe(pageTitle({ key: "round.title.quiz", vars: { n: "1" } }, "Notat"));
    const region = container.querySelector("section")!;
    expect(document.getElementById(region.getAttribute("aria-labelledby")!)?.textContent).toBe("Spørsmål 1 av 2");
    expect(region.textContent).toContain("Spørsmål A?");
    expect(region.textContent).toContain("Kilde: P1");
    expect(options().map((b) => b.textContent)).toEqual(["A to", "B null", "C tre", "D en"]);
    expect(options().every((b) => !b.hasAttribute("aria-disabled"))).toBe(true);
    expect(container.querySelector("blockquote")).toBeNull();
    expect(live().textContent).toBe("");
    expect(button(t("quiz.next"))).toBeUndefined();
  });
});

describe("Quiz region, answering", () => {
  it("a wrong choice: stored with its original index as shaky, ✗ and ✓, 'Feil. Rett svar er B.', focus stays", async () => {
    render();
    recordQuizAnswer.mockResolvedValue(saved(withAnswer("k-a.qq1", 2), row("k-a", "shaky")));
    const chosen = await choose("A");
    expect(recordQuizAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ roundId: "r-1", itemId: "k-a.qq1", keyConceptId: "k-a", choice: 2, state: "shaky" }),
    );
    expect(document.activeElement).toBe(chosen);
    expect(live().textContent).toBe("Feil. Rett svar er B.");
    expect(option("A").querySelector('[aria-hidden="true"]')?.textContent).toBe("✗");
    expect(option("B").querySelector('[aria-hidden="true"]')?.textContent).toBe("✓");
    expect(option("C").querySelector('[aria-hidden="true"]')).toBeNull();
    // The chosen and the correct option stay described by the feedback line; the others are not.
    expect([option("A"), option("B"), option("C")].map((b) => b.getAttribute("aria-describedby"))).toEqual([
      live().id,
      live().id,
      null,
    ]);
    expect(options().every((b) => b.getAttribute("aria-disabled") === "true")).toBe(true);
    expect(container.querySelector("blockquote")?.textContent).toContain("Sitatet.");
    expect(container.querySelector("[data-state]")?.textContent).toBe(t("mastery.shaky"));
    expect(button(t("quiz.next"))).toBeDefined();
    // An answered question ignores further choices.
    await act(async () => option("C").click());
    expect(recordQuizAnswer).toHaveBeenCalledTimes(1);
  });

  it("a right answer: 'Riktig.'; 'Neste spørsmål' shows the next question, unanswered, with focus on its h2", async () => {
    render();
    recordQuizAnswer.mockResolvedValue(saved(withAnswer("k-a.qq1", 0), row("k-a", "known")));
    await choose("B");
    expect(recordQuizAnswer).toHaveBeenCalledWith(expect.objectContaining({ choice: 0, state: "known" }));
    expect(live().textContent).toBe(t("quiz.correct"));
    await act(async () => button(t("quiz.next"))!.click());
    expect(document.activeElement?.tagName).toBe("H2");
    expect(document.activeElement?.textContent).toBe("Spørsmål 2 av 2");
    expect(container.textContent).toContain("Spørsmål B?");
    expect(options().map((b) => b.textContent)).toEqual(["A null", "B en", "C to", "D tre"]);
    expect(live().textContent).toBe("");
    expect(container.querySelector("blockquote")).toBeNull();
  });

  it("the answer that completes the Round: the control reads 'Se resultatet' and opens Resultat (Story 2.4)", async () => {
    render(withAnswer("k-a.qq1", 0));
    expect(container.textContent).toContain("Spørsmål B?");
    recordQuizAnswer.mockResolvedValue(
      saved(
        { ...withAnswer("k-a.qq1", 0), answers: [...withAnswer("k-a.qq1", 0).answers, { itemId: "k-b.qq1", choice: 1, answeredAt: T }], status: "complete", completedAt: T },
        row("k-b", "shaky"),
      ),
    );
    await choose("B");
    expect(button(t("quiz.next"))).toBeUndefined();
    await act(async () => button(t("quiz.result"))!.click());
    expect(replace).toHaveBeenCalledWith("/notat/h/runde/r-1/resultat");
    expect(push).not.toHaveBeenCalled();
  });

  it("while it saves every option is aria-disabled and a second choice is ignored", async () => {
    render();
    let resolve: (value: unknown) => void = () => {};
    recordQuizAnswer.mockReturnValue(new Promise((r) => (resolve = r)));
    await choose("A");
    expect(options().every((b) => b.getAttribute("aria-disabled") === "true")).toBe(true);
    await act(async () => option("B").click());
    expect(recordQuizAnswer).toHaveBeenCalledTimes(1);
    expect(live().textContent).toBe("");
    await act(async () => resolve(saved(withAnswer("k-a.qq1", 2), row("k-a", "shaky"))));
    expect(live().textContent).toBe("Feil. Rett svar er B.");
  });

  it("a failed save: no feedback, err.generation named by every option, the options work again", async () => {
    render();
    recordQuizAnswer.mockResolvedValue({ ok: false, code: "err.generation" });
    const chosen = await choose("C");
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(t("err.generation"));
    expect(options().every((b) => b.getAttribute("aria-describedby") === alert?.id)).toBe(true);
    expect(options().every((b) => !b.hasAttribute("aria-disabled"))).toBe(true);
    expect(document.activeElement).toBe(chosen);
    expect(live().textContent).toBe("");
    expect(container.querySelector("blockquote")).toBeNull();
    recordQuizAnswer.mockResolvedValue(saved(withAnswer("k-a.qq1", 3), row("k-a", "shaky")));
    await choose("C");
    expect(recordQuizAnswer).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(live().textContent).toBe("Feil. Rett svar er B.");
  });
});
