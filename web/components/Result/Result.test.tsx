// @vitest-environment happy-dom
// Story 2.4: Resultat (FR-12, FR-14, UX-DR11, UX-DR17, UX-DR19): focus on the h1, the score, one row per
// Quiz Question in Round order with "Ditt svar:" / "Rett svar:" (letters per optionOrder, marks
// aria-hidden), the reference jump returning to the row's reference, and resultReady. The router is
// stubbed; nothing is stored here.
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pageTitle, t } from "../../i18n/messages";
import type { NoteRecord, RoundRecord, StudySetRecord } from "../../storage/db";
import { AsideSlotContext } from "../AppShell/asideSlot";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { ResultScreen, resultReady } = await import("./Result");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const T = "2026-11-25T10:00:00.000Z";
const NOTE: NoteRecord = {
  schemaVersion: 1,
  noteHash: "h",
  title: "Notat",
  sourceType: "md",
  wordCount: 6,
  passages: [
    { id: "p1", text: "Første sitat." },
    { id: "p2", text: "Andre sitat." },
  ],
  normalizationVersion: 1,
  currentCacheKey: "h:2:m",
  archived: false,
  importanceLevel: 2,
  lastPractisedAt: null,
};
const question = (id: string, stem: string, passageId: string, quote: string) => ({
  id,
  question: stem,
  options: ["null", "en", "to", "tre"],
  correctIndex: 0,
  passageId,
  quote,
});
const concept = (id: string, rank: number, passageId: string, quote: string) => ({
  id,
  name: id,
  centralityRank: rank,
  covered: true,
  flashcards: [{ id: `${id}.fc1`, front: "F", back: "B", passageId, quote }],
  quizQuestions: [question(`${id}.qq1`, `Spørsmål om ${id}?`, passageId, quote)],
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
    concept("k-a", 1, "p1", "Første sitat."),
    concept("k-b", 2, "p2", "Andre sitat."),
    concept("k-c", 3, "p1", "Første sitat."),
    concept("k-d", 4, "p2", "Andre sitat."),
  ],
};
// Display orders: k-a.qq1 A = "to", B = "null" (correct), C = "tre", D = "en"; the others A = "null" … D = "tre".
const ROUND: RoundRecord = {
  schemaVersion: 1,
  roundId: "r-1",
  noteHash: "h",
  cacheKey: "h:2:m",
  number: 1,
  review: false,
  conceptIds: ["k-a", "k-b", "k-c", "k-d"],
  itemIds: ["k-a.fc1", "k-b.fc1", "k-a.qq1", "k-b.qq1", "k-c.qq1", "k-d.qq1"],
  optionOrder: {
    "k-a.qq1": [2, 0, 3, 1],
    "k-b.qq1": [0, 1, 2, 3],
    "k-c.qq1": [0, 1, 2, 3],
    "k-d.qq1": [0, 1, 2, 3],
  },
  answers: [
    { itemId: "k-a.fc1", knew: false, answeredAt: T },
    { itemId: "k-b.fc1", knew: true, answeredAt: T },
    { itemId: "k-a.qq1", choice: 0, answeredAt: T }, // right: B. null
    { itemId: "k-b.qq1", choice: 3, answeredAt: T }, // wrong: D. tre; right A. null
    { itemId: "k-c.qq1", choice: 0, answeredAt: T }, // right
    { itemId: "k-d.qq1", choice: 1, answeredAt: T }, // wrong: B. en
  ],
  status: "complete",
  startedAt: T,
  completedAt: T,
};

let container: HTMLDivElement;
let slot: HTMLDivElement;
let root: Root;

function render(round: RoundRecord = ROUND) {
  act(() =>
    root.render(
      <AsideSlotContext.Provider value={slot}>
        <ResultScreen note={NOTE} studySet={SET} round={round} wide />
      </AsideSlotContext.Provider>,
    ),
  );
}

beforeEach(() => {
  container = document.createElement("div");
  slot = document.createElement("div");
  document.body.append(container, slot);
  root = createRoot(container);
  push.mockReset();
  render();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  slot.remove();
});

const rows = () => [...container.querySelectorAll("section")];
/** Text without the aria-hidden marks: what a screen reader reads. */
const spoken = (el: Element) => {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
  return copy.textContent?.replace(/\s+/g, " ").trim();
};
const button = (name: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === name) as HTMLButtonElement | undefined;

describe("ResultScreen", () => {
  it("focuses the h1 'Resultat', sets the page title, and shows the score before the button and the rows", () => {
    const h1 = container.querySelector("h1");
    expect(h1?.textContent).toBe(t("result.title"));
    expect(document.activeElement).toBe(h1);
    expect(document.title).toBe(pageTitle("result.title", "Notat"));
    const score = [...container.querySelectorAll("p")].find((p) => p.textContent === "2 av 4 riktige");
    expect(score).toBeDefined();
    expect(h1?.getAttribute("aria-describedby")).toBe(score!.id);
    const back = button(t("result.back"))!;
    expect(back.getAttribute("data-variant")).toBe("primary");
    const order = [h1!, score!, back, rows()[0]];
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("one section per Quiz Question in Round order, labelled by its h2 'Spørsmål {x}', no Flashcard rows", () => {
    expect(rows()).toHaveLength(4);
    rows().forEach((row, i) => {
      const h2 = row.querySelector("h2")!;
      expect(h2.textContent).toBe(`Spørsmål ${i + 1}`);
      expect(row.getAttribute("aria-labelledby")).toBe(h2.id);
    });
    expect(rows().map((row) => row.querySelector("h2 + p")?.textContent)).toEqual([
      "Spørsmål om k-a?",
      "Spørsmål om k-b?",
      "Spørsmål om k-c?",
      "Spørsmål om k-d?",
    ]);
  });

  it("a right answer: '✓ Ditt svar: B. null' (letter per optionOrder), no 'Rett svar:'", () => {
    const row = rows()[0];
    const lines = [...row.querySelectorAll("p")].filter((p) => p.textContent?.includes(":"));
    expect(lines.map((p) => p.textContent?.replace(/\s+/g, " ").trim())).toEqual(["✓ Ditt svar: B. null"]);
    expect(row.textContent).not.toContain(t("result.correct"));
  });

  it("a miss: '✗ Ditt svar:' then '✓ Rett svar:'; the marks are aria-hidden", () => {
    const row = rows()[1];
    const lines = [...row.querySelectorAll("p")].filter((p) => p.textContent?.includes(":"));
    expect(lines.map((p) => p.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "✗ Ditt svar: D. tre",
      "✓ Rett svar: A. null",
    ]);
    expect(lines.map(spoken)).toEqual(["Ditt svar: D. tre", "Rett svar: A. null"]);
    for (const mark of row.querySelectorAll('[aria-hidden="true"]')) expect(["✓", "✗"]).toContain(mark.textContent?.trim());
    expect(container.textContent?.split(t("result.correct")).length).toBe(3); // only on the 2 misses
  });

  it("each row has its Quote block and a unique 'Kilde: Pn' reference", () => {
    const refs = rows().map((row) => row.querySelector("figcaption button")!);
    expect(refs.map((r) => r.textContent)).toEqual(["Kilde: P1", "Kilde: P2", "Kilde: P1", "Kilde: P2"]);
    expect(new Set(refs.map((r) => r.id)).size).toBe(4);
    expect(rows()[1].querySelector("blockquote")?.textContent).toBe("Andre sitat.");
  });

  it("the jump says 'Viser P2 fra resultatet'; 'Tilbake til resultatet' returns focus to that reference", async () => {
    const ref = rows()[3].querySelector<HTMLButtonElement>("figcaption button")!;
    await act(async () => ref.click());
    await vi.waitFor(() => expect(document.activeElement?.id).toBe("passage-p2"));
    expect(slot.textContent).toContain("Viser P2 fra resultatet");
    await act(async () => button(t("return.result"))!.click());
    await vi.waitFor(() => expect(document.activeElement).toBe(ref));
  });

  it("'Tilbake til oversikten' goes to Notatoversikt", async () => {
    await act(async () => button(t("result.back"))!.click());
    expect(push).toHaveBeenCalledWith("/notat/h");
  });

  it("an unanswered question counts as wrong and shows 'Rett svar:'", () => {
    render({ ...ROUND, answers: ROUND.answers.filter((a) => a.itemId !== "k-c.qq1") });
    expect(container.textContent).toContain("1 av 4 riktige");
    const lines = [...rows()[2].querySelectorAll("p")].filter((p) => p.textContent?.includes(":")).map(spoken);
    expect(lines).toEqual(["Ditt svar:", "Rett svar: A. null"]);
  });
});

describe("resultReady", () => {
  it("is true for a complete Round of the Note with Quiz Questions whose Items resolve", () => {
    expect(resultReady(ROUND, "h", SET)).toBe(true);
  });

  it("is false for an active or abandoned Round", () => {
    expect(resultReady({ ...ROUND, status: "active" }, "h", SET)).toBe(false);
    expect(resultReady({ ...ROUND, status: "abandoned" }, "h", SET)).toBe(false);
  });

  it("is false for another Note's Round", () => {
    expect(resultReady(ROUND, "other", SET)).toBe(false);
  });

  it("is false when an Item is no longer in the Study Set", () => {
    expect(resultReady({ ...ROUND, itemIds: [...ROUND.itemIds, "k-x.qq1"] }, "h", SET)).toBe(false);
  });

  it("is false for a Round without Quiz Questions", () => {
    expect(resultReady({ ...ROUND, itemIds: ["k-a.fc1", "k-b.fc1"] }, "h", SET)).toBe(false);
  });
});
