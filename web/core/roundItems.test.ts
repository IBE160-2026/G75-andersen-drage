// The read-side Round selectors (Stories 2.1–2.4): Items per part, position, Resultat readiness and the
// option display order.
import { describe, expect, it } from "vitest";
import type { Round } from "./round";
import {
  displayOrder,
  itemsResolve,
  resultReady,
  roundFlashcards,
  roundPosition,
  roundQuizQuestions,
} from "./roundItems";

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

describe("resultReady (Story 2.4)", () => {
  const ROUND: Pick<Round, "noteHash" | "status" | "itemIds"> = {
    noteHash: "h",
    status: "complete",
    itemIds: ["k-a.fc1", "k-b.fc1", "k-a.qq1", "k-b.qq1"],
  };

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

describe("displayOrder (Story 2.3)", () => {
  it("is the stored permutation, or the Study Set order when it is missing or not a permutation", () => {
    expect(displayOrder([2, 0, 3, 1], 4)).toEqual([2, 0, 3, 1]);
    expect(displayOrder(undefined, 4)).toEqual([0, 1, 2, 3]);
    expect(displayOrder([0, 1, 2], 4)).toEqual([0, 1, 2, 3]);
    expect(displayOrder([0, 0, 2, 3], 4)).toEqual([0, 1, 2, 3]);
  });
});
