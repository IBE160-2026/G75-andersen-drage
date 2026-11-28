// The read-side Round selectors (Stories 2.1–2.4, AD-3): which stored Round Items resolve to which Study
// Set Items, where a Round stands, whether it has a Resultat, and a question's option display order.
// Pure; composition itself is core/round.ts.
import type { Round } from "./round";
import type { VerifiedFlashcard, VerifiedQuizQuestion, VerifiedStudySet } from "./types";

/** The Round's Flashcards in Item order, each with its concept. Unknown Item IDs are left out. */
export function roundFlashcards(
  round: Pick<Round, "itemIds">,
  studySet: Pick<VerifiedStudySet, "concepts">,
): { card: VerifiedFlashcard; conceptId: string }[] {
  const byId = new Map(
    studySet.concepts.flatMap((concept) => concept.flashcards.map((card) => [card.id, { card, conceptId: concept.id }] as const)),
  );
  return round.itemIds.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });
}

/** The Round's Quiz Questions in Item order, each with its concept. Unknown Item IDs are left out. */
export function roundQuizQuestions(
  round: Pick<Round, "itemIds">,
  studySet: Pick<VerifiedStudySet, "concepts">,
): { question: VerifiedQuizQuestion; conceptId: string }[] {
  const byId = new Map(
    studySet.concepts.flatMap((concept) =>
      concept.quizQuestions.map((question) => [question.id, { question, conceptId: concept.id }] as const),
    ),
  );
  return round.itemIds.flatMap((id) => {
    const entry = byId.get(id);
    return entry ? [entry] : [];
  });
}

/**
 * Where the Round stands: the Flashcard part (`index` into the cards) until every card is answered, then
 * the Quiz part (`index` into the Quiz Questions). Answers are stored in Item order, Flashcards first.
 * `done` when every Item is answered.
 */
export type RoundPosition =
  | { part: "cards"; index: number; total: number }
  | { part: "quiz"; index: number; total: number }
  | { part: "done" };

export function roundPosition(answered: number, cards: number, questions: number): RoundPosition {
  if (answered < cards) return { part: "cards", index: answered, total: cards };
  if (answered - cards < questions) return { part: "quiz", index: answered - cards, total: questions };
  return { part: "done" };
}

/** True when every Item ID of the Round is in the Study Set (otherwise the set has changed or gone). */
export function itemsResolve(round: Pick<Round, "itemIds">, studySet: Pick<VerifiedStudySet, "concepts">): boolean {
  const ids = new Set(studySet.concepts.flatMap((c) => [...c.flashcards, ...c.quizQuestions].map((item) => item.id)));
  return round.itemIds.every((id) => ids.has(id));
}

/**
 * True when the Round can show Resultat (Story 2.4): it belongs to `noteHash`, is `complete`, every Item
 * is still in the Study Set it was composed from, and it has at least one Quiz Question. A Round without
 * Quiz Questions has no Resultat (its last mark returns to Notatoversikt).
 */
export function resultReady(
  round: Pick<Round, "noteHash" | "status" | "itemIds">,
  noteHash: string,
  studySet: Pick<VerifiedStudySet, "concepts">,
): boolean {
  return (
    round.noteHash === noteHash &&
    round.status === "complete" &&
    itemsResolve(round, studySet) &&
    roundQuizQuestions(round, studySet).length > 0
  );
}

/**
 * The display order of a question's options: the Round's stored `optionOrder` permutation, or the Study
 * Set order when the stored one is missing or not a permutation of the options. `composeRound` always
 * stores a permutation; `recordQuizAnswer` only rejects an answer when the question has no `optionOrder`
 * entry or `choice` is not an integer in `0 … optionOrder[itemId].length − 1`.
 */
export function displayOrder(order: readonly number[] | undefined, optionCount: number): number[] {
  const identity = Array.from({ length: optionCount }, (_, i) => i);
  if (!order || order.length !== optionCount) return identity;
  const sorted = [...order].sort((a, b) => a - b);
  return sorted.every((value, i) => value === i) ? [...order] : identity;
}
