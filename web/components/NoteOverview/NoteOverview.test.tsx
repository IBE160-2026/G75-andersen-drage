// @vitest-environment happy-dom
// Story 2.4: Notatoversikt's Mastery chips from conceptProgress: the stored state for covered concepts,
// 'ny' without a row (or when the read failed, which the page passes as no rows), and the not-covered
// text unchanged. D-25: the start block comes before the summary. Storage and the router are stubbed.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../../i18n/messages";
import type { ConceptProgressRecord, NoteRecord, StudySetRecord } from "../../storage/db";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../../storage/db", () => ({ readConceptProgress: vi.fn(), startRound: vi.fn() }));

const { NoteOverview } = await import("./NoteOverview");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ref = { passageId: "p1", quote: "Sitatet." };
const NOTE: NoteRecord = {
  schemaVersion: 1,
  noteHash: "h",
  title: "Notat",
  sourceType: "md",
  wordCount: 1,
  passages: [{ id: "p1", text: "Sitatet." }],
  normalizationVersion: 1,
  currentCacheKey: "h:2:m",
  archived: false,
  importanceLevel: 2,
  lastPractisedAt: null,
};
const concept = (id: string, rank: number, covered = true) => ({
  id,
  name: `Begrep ${id}`,
  centralityRank: rank,
  covered,
  flashcards: covered ? [{ id: `${id}.fc1`, front: "F", back: "B", ...ref }] : [],
  quizQuestions: [],
});
const SET: StudySetRecord = {
  schemaVersion: 1,
  noteHash: "h",
  cacheKey: "h:2:m",
  model: "m",
  promptVersion: "2",
  language: "nb",
  summaryPoints: [],
  concepts: [concept("k-a", 1), concept("k-b", 2), concept("k-c", 3), concept("k-d", 4), concept("k-x", 5, false)],
};
const row = (keyConceptId: string, state: ConceptProgressRecord["state"]): ConceptProgressRecord => ({
  schemaVersion: 1,
  noteHash: "h",
  keyConceptId,
  state,
  lastShownAt: null,
  lastUsedQuizQuestionId: null,
});

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(progress: ConceptProgressRecord[], studySet: StudySetRecord = SET) {
  act(() => root.render(<NoteOverview note={NOTE} studySet={studySet} progress={progress} wide onRetry={() => {}} />));
}

/** Each concept's name and what follows it: the chip text, or the not-covered text. */
const chips = () =>
  [...container.querySelectorAll("li")]
    .filter((li) => li.textContent?.startsWith("Begrep"))
    .map((li) => [li.firstElementChild?.textContent, li.lastElementChild?.textContent]);

describe("NoteOverview chips (Story 2.4)", () => {
  it("show the stored state for covered concepts, 'ny' without a row, not covered unchanged", () => {
    render([row("k-a", "known"), row("k-b", "shaky"), row("k-c", "new"), row("k-x", "known")]);
    expect(chips()).toEqual([
      ["Begrep k-a", t("mastery.known")],
      ["Begrep k-b", t("mastery.shaky")],
      ["Begrep k-c", t("mastery.new")],
      ["Begrep k-d", t("mastery.new")],
      ["Begrep k-x", t("overview.notCovered")],
    ]);
  });

  it("no rows (a failed read): every covered chip is 'ny', never an error", () => {
    render([]);
    expect(chips().slice(0, 4).every(([, chip]) => chip === t("mastery.new"))).toBe(true);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});

/** True when `a` comes before `b` in document order. */
const precedes = (a: Element | null, b: Element | null) =>
  !!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe("NoteOverview start block (D-25)", () => {
  it("'Start runde' and its hint lead the study panel, before the 'Sammendrag' heading", () => {
    render([]);
    const start = [...container.querySelectorAll("button")].find((b) => b.textContent === t("overview.start"));
    const hint = container.querySelector("#start-hint");
    const summary = container.querySelector("#overview-summary");
    const block = start?.closest("div");
    expect(block?.parentElement?.firstElementChild).toBe(block);
    expect(block?.contains(hint)).toBe(true);
    expect(precedes(hint, summary)).toBe(true);
  });

  it("with no covered concept, err.noConcepts and 'Prøv igjen' take that place, before 'Sammendrag'", () => {
    render([], { ...SET, concepts: [concept("k-x", 1, false)] });
    const error = container.querySelector("#no-concepts-error");
    expect(error?.textContent).toContain(t("err.noConcepts"));
    expect(precedes(error, container.querySelector("#overview-summary"))).toBe(true);
    expect([...container.querySelectorAll("button")].some((b) => b.textContent === t("overview.start"))).toBe(false);
  });
});
