// @vitest-environment happy-dom
// Story 2.2: Flashcard focus on the Round screen (UX-DR13): 'Snu kortet' focuses the answer; a saved mark
// shows the next card with focus on its h2; a failed save keeps the card revealed with err.generation.
// Storage and the router are stubbed; db.test.ts covers the transaction itself.
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pageTitle, t } from "../../i18n/messages";
import type { ConceptProgressRecord, FlashcardMark, NoteRecord, RoundRecord, StudySetRecord } from "../../storage/db";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const recordFlashcardMark = vi.fn();
vi.mock("../../storage/db", () => ({
  recordFlashcardMark: (mark: FlashcardMark) => recordFlashcardMark(mark),
  recordQuizAnswer: vi.fn(),
}));

const { RoundScreen } = await import("./Round");

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
const SET: StudySetRecord = {
  schemaVersion: 1,
  noteHash: "h",
  cacheKey: "h:2:m",
  model: "m",
  promptVersion: "2",
  language: "nb",
  summaryPoints: [],
  concepts: [
    {
      id: "k-a",
      name: "Begrep A",
      centralityRank: 1,
      covered: true,
      flashcards: [
        { id: "k-a.fc1", front: "Forside 1", back: "Svar 1", ...ref },
        { id: "k-a.fc2", front: "Forside 2", back: "Svar 2", ...ref },
      ],
      quizQuestions: [],
    },
  ],
};
const ROUND: RoundRecord = {
  schemaVersion: 1,
  roundId: "r-1",
  noteHash: "h",
  cacheKey: "h:2:m",
  number: 1,
  review: false,
  conceptIds: ["k-a"],
  itemIds: ["k-a.fc1", "k-a.fc2"],
  optionOrder: {},
  answers: [],
  status: "active",
  startedAt: T,
  completedAt: null,
};
const ROW: ConceptProgressRecord = { schemaVersion: 1, noteHash: "h", keyConceptId: "k-a", state: "new", lastShownAt: T, lastUsedQuizQuestionId: null };

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  recordFlashcardMark.mockReset();
  push.mockReset();
  act(() => root.render(<RoundScreen note={NOTE} studySet={SET} round={ROUND} progress={[ROW]} wide />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const button = (name: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === name) as HTMLButtonElement;

async function click(name: string) {
  await act(async () => {
    button(name).click();
  });
}

describe("RoundScreen mount", () => {
  it("in Strict Mode (effects run twice) the h1 keeps focus, not the Item h2", () => {
    act(() => root.unmount());
    root = createRoot(container);
    act(() =>
      root.render(
        <StrictMode>
          <RoundScreen note={NOTE} studySet={SET} round={ROUND} progress={[ROW]} wide />
        </StrictMode>,
      ),
    );
    expect(document.activeElement?.tagName).toBe("H1");
  });
});

describe("RoundScreen Flashcards", () => {
  it("'Snu kortet' shows the answer and focuses it", async () => {
    expect(container.textContent).not.toContain("Svar 1");
    await click(t("card.reveal"));
    expect(document.activeElement?.textContent).toBe("Svar 1");
  });

  it("a saved mark shows the next card with focus on its h2 and the updated chip", async () => {
    recordFlashcardMark.mockResolvedValue({
      ok: true,
      value: { round: { ...ROUND, answers: [{ itemId: "k-a.fc1", knew: true, answeredAt: T }] }, progress: { ...ROW, state: "known" } },
    });
    await click(t("card.reveal"));
    await click(t("card.known"));
    expect(recordFlashcardMark).toHaveBeenCalledWith(
      expect.objectContaining({ roundId: "r-1", itemId: "k-a.fc1", keyConceptId: "k-a", knew: true, state: "known" }),
    );
    expect(document.activeElement?.tagName).toBe("H2");
    expect(document.activeElement?.textContent).toBe("Kort 2 av 2");
    expect(container.textContent).toContain("Forside 2");
    expect(container.textContent).not.toContain("Svar 2");
    expect(container.querySelector("[data-state]")?.textContent).toBe(t("mastery.known"));
  });

  it("a failed save keeps the card revealed with err.generation, named by both marks", async () => {
    recordFlashcardMark.mockResolvedValue({ ok: false, code: "err.generation" });
    await click(t("card.reveal"));
    await click(t("card.unknown"));
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(t("err.generation"));
    expect(button(t("card.known")).getAttribute("aria-describedby")).toBe(alert?.id);
    expect(container.textContent).toContain("Svar 1");
  });

  it("the mark that completes the Round goes back to Notatoversikt", async () => {
    recordFlashcardMark.mockResolvedValue({
      ok: true,
      value: { round: { ...ROUND, status: "complete", completedAt: T, answers: [] }, progress: ROW },
    });
    await click(t("card.reveal"));
    await click(t("card.known"));
    expect(push).toHaveBeenCalledWith("/notat/h");
  });
});

describe("RoundScreen, last card to the Quiz part (Story 2.3)", () => {
  it("the last mark shows the first question with focus on 'Spørsmål 1 av 1' and the page title 'Runde 1, quiz'", async () => {
    const set: StudySetRecord = {
      ...SET,
      concepts: [
        {
          ...SET.concepts[0],
          quizQuestions: [{ id: "k-a.qq1", question: "Stammen?", options: ["a", "b", "c", "d"], correctIndex: 0, ...ref }],
        },
      ],
    };
    const round: RoundRecord = {
      ...ROUND,
      itemIds: ["k-a.fc1", "k-a.fc2", "k-a.qq1"],
      optionOrder: { "k-a.qq1": [0, 1, 2, 3] },
      answers: [{ itemId: "k-a.fc1", knew: true, answeredAt: T }],
    };
    act(() => root.render(<RoundScreen note={NOTE} studySet={set} round={round} progress={[ROW]} wide />));
    expect(document.title).toBe(pageTitle({ key: "round.title", vars: { n: "1" } }, "Notat"));
    recordFlashcardMark.mockResolvedValue({
      ok: true,
      value: { round: { ...round, answers: [...round.answers, { itemId: "k-a.fc2", knew: false, answeredAt: T }] }, progress: ROW },
    });
    await click(t("card.reveal"));
    await click(t("card.unknown"));
    expect(document.activeElement?.tagName).toBe("H2");
    expect(document.activeElement?.textContent).toBe("Spørsmål 1 av 1");
    expect(document.title).toBe(pageTitle({ key: "round.title.quiz", vars: { n: "1" } }, "Notat"));
    expect(container.textContent).toContain("Stammen?");
  });
});
