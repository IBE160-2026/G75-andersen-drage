// Story 2.1: the Round screen's pure helpers, and the Round route built by Notatoversikt.
import { describe, expect, it } from "vitest";
import { notePath, resultPath, roundPath } from "../NoteOverview/NoteOverview";
import { itemsResolve, roundFlashcards, roundPosition, roundQuizQuestions } from "./Round";

const ref = { passageId: "p1", quote: "q" };
const concept = (id: string, cards: number, quiz: number) => ({
  id,
  flashcards: Array.from({ length: cards }, (_, i) => ({ id: `${id}.fc${i + 1}`, front: `${id} ${i + 1}`, back: "B", ...ref })),
  quizQuestions: Array.from({ length: quiz }, (_, i) => ({
    id: `${id}.qq${i + 1}`,
    question: "Q",
    options: ["A", "B", "C", "D"],
    correctIndex: 0,
    ...ref,
  })),
});
const SET = { concepts: [concept("k-a", 2, 1), concept("k-b", 1, 1)].map((c) => ({ ...c, name: c.id, centralityRank: 1, covered: true })) };

describe("itemsResolve", () => {
  it("is true when every Item ID is in the Study Set", () => {
    expect(itemsResolve({ itemIds: ["k-b.fc1", "k-a.fc2", "k-a.qq1"] }, SET)).toBe(true);
  });

  it("is false when one Item ID is missing from an otherwise valid set", () => {
    expect(itemsResolve({ itemIds: ["k-a.fc1", "k-a.fc3"] }, SET)).toBe(false);
  });

  it("is true for empty itemIds", () => {
    expect(itemsResolve({ itemIds: [] }, SET)).toBe(true);
  });
});

describe("roundFlashcards", () => {
  it("returns the cards in Item order with their concept, skipping Quiz Question IDs", () => {
    const cards = roundFlashcards({ itemIds: ["k-b.fc1", "k-a.fc2", "k-a.fc1", "k-b.qq1", "k-a.qq1"] }, SET);
    expect(cards.map(({ card, conceptId }) => [card.id, conceptId])).toEqual([
      ["k-b.fc1", "k-b"],
      ["k-a.fc2", "k-a"],
      ["k-a.fc1", "k-a"],
    ]);
    expect(cards[0].card.front).toBe("k-b 1");
  });
});

describe("roundPath", () => {
  it("keeps the demo: prefix of the Note key", () => {
    expect(roundPath("demo:abc", "r-1")).toBe("/notat/demo:abc/runde/r-1");
    expect(roundPath("abc", "r-1")).toBe("/notat/abc/runde/r-1");
  });
});

describe("notePath / resultPath (Story 2.4)", () => {
  it("Resultat is the Round route + /resultat, keeping the demo: prefix", () => {
    expect(notePath("demo:abc")).toBe("/notat/demo:abc");
    expect(resultPath("demo:abc", "r-1")).toBe("/notat/demo:abc/runde/r-1/resultat");
    expect(resultPath("abc", "r-1")).toBe("/notat/abc/runde/r-1/resultat");
  });
});

describe("roundPosition (Story 2.2)", () => {
  it("is the Flashcard part until every card is answered, then the Quiz part, then done", () => {
    expect(roundPosition(0, 3, 2)).toEqual({ part: "cards", index: 0, total: 3 });
    expect(roundPosition(2, 3, 2)).toEqual({ part: "cards", index: 2, total: 3 });
    expect(roundPosition(3, 3, 2)).toEqual({ part: "quiz", index: 0, total: 2 });
    expect(roundPosition(5, 3, 2)).toEqual({ part: "done" });
    expect(roundPosition(0, 0, 1)).toEqual({ part: "quiz", index: 0, total: 1 });
    expect(roundPosition(2, 2, 0)).toEqual({ part: "done" });
  });
});

describe("roundQuizQuestions (Story 2.2)", () => {
  it("returns the Quiz Questions in Item order with their concept, skipping Flashcard IDs", () => {
    const questions = roundQuizQuestions({ itemIds: ["k-a.fc1", "k-b.qq1", "k-a.qq1"] }, SET);
    expect(questions.map(({ question, conceptId }) => [question.id, conceptId])).toEqual([
      ["k-b.qq1", "k-b"],
      ["k-a.qq1", "k-a"],
    ]);
  });
});
