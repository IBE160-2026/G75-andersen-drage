// Round composition (FR-18, AD-3, Story 2.1). Pure: the Round ID, the time and the random source are
// arguments. storage/db.ts › startRound writes the result in one transaction and assigns `number`.
import { sortConcepts } from "./overview";
import type { VerifiedKeyConcept } from "./types";

export type MasteryState = "new" | "shaky" | "known";

/** One `conceptProgress` row (AD-21). A missing row means `new`, never shown. */
export type ConceptProgress = {
  noteHash: string;
  keyConceptId: string;
  state: MasteryState;
  /** ISO 8601 UTC, or null before the concept is first shown in a Round. */
  lastShownAt: string | null;
  lastUsedQuizQuestionId: string | null;
};

export type RoundStatus = "active" | "complete" | "abandoned";

/**
 * One answered Item, in Item order. A Flashcard mark (Story 2.2): `knew` is 'Kunne det' (true) or
 * 'Kunne det ikke' (false). Story 2.3 adds the Quiz Question variant (the chosen original option index).
 */
export type FlashcardAnswer = { itemId: string; knew: boolean; answeredAt: string };
export type RoundAnswer = FlashcardAnswer;

/** One `rounds` record (AD-21). Composed once and never recomposed. */
export type Round = {
  roundId: string;
  /** The Note key, with its `demo:` prefix for a Demo Note. */
  noteHash: string;
  /** The Study Set the Round was composed from. */
  cacheKey: string;
  /** 1-based: the Note's Round count + 1 when it started. */
  number: number;
  /** True when no concept was shaky or new (`round.review`). */
  review: boolean;
  /** Shaky → new → known. */
  conceptIds: string[];
  /** Flashcards in concept order, then Quiz Questions in concept order. */
  itemIds: string[];
  /** Per Quiz Question ID: a permutation of the original option indices, in display order. */
  optionOrder: Record<string, number[]>;
  answers: RoundAnswer[];
  status: RoundStatus;
  startedAt: string;
  completedAt: string | null;
};

/** At most this many concepts per Round. */
export const ROUND_SIZE = 10;
/** At most this many shaky + new concepts per Round. */
export const MAX_SHAKY_AND_NEW = 8;
/** Share of known concepts added to a Round with shaky or new ones. */
export const KNOWN_SHARE = 0.2;

export type ComposeRoundInput = {
  roundId: string;
  noteHash: string;
  cacheKey: string;
  /** ISO 8601 UTC; becomes `startedAt` and the included concepts' `lastShownAt`. */
  now: string;
  /** Returns a number in [0, 1), like Math.random. */
  random: () => number;
  concepts: readonly VerifiedKeyConcept[];
  progress: readonly Pick<ConceptProgress, "keyConceptId" | "state" | "lastShownAt" | "lastUsedQuizQuestionId">[];
};

/** What startRound stores: the Round (without `number`) and the progress changes it implies. */
export type RoundComposition = {
  round: Omit<Round, "number">;
  /** Every covered concept; each gets a `conceptProgress` row (missing → new). */
  eligibleConceptIds: string[];
  /** Per included concept: the Quiz Question used this Round, or null when it has none. */
  usedQuizQuestionIds: Record<string, string | null>;
};

type Candidate = { concept: VerifiedKeyConcept; state: MasteryState; lastShownAt: string | null; lastUsed: string | null };

/** Least recently shown first, never shown before any; ties keep Centrality Rank order (input is rank-sorted). */
function byLeastRecentlyShown(list: Candidate[]): Candidate[] {
  return list
    .map((c, index) => ({ c, index }))
    .sort((a, b) => {
      const x = a.c.lastShownAt;
      const y = b.c.lastShownAt;
      if (x !== y) {
        if (x === null) return -1;
        if (y === null) return 1;
        return x < y ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(({ c }) => c);
}

/** The Quiz Question after `lastUsed` in Study Set order, wrapping; the first when none or stale. */
export function nextQuizQuestionId(concept: Pick<VerifiedKeyConcept, "quizQuestions">, lastUsed: string | null): string | null {
  const questions = concept.quizQuestions;
  if (questions.length === 0) return null;
  const index = lastUsed === null ? -1 : questions.findIndex((q) => q.id === lastUsed);
  return questions[index < 0 ? 0 : (index + 1) % questions.length].id;
}

/** A Fisher–Yates permutation of 0…n−1. */
export function shuffledIndices(n: number, random: () => number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * FR-18: ≤ 10 concepts, never *not covered*. Shaky then new, up to 8 (each least recently shown first,
 * ties by Centrality Rank), then `max(1, round(0.2 × n))` known (n = shaky + new included), least
 * recently shown first. With no shaky or new concept: up to 10 known, `review: true`.
 * Returns null when no concept is covered (no Round can start).
 */
export function composeRound(input: ComposeRoundInput): RoundComposition | null {
  const rows = new Map(input.progress.map((p) => [p.keyConceptId, p]));
  const eligible: Candidate[] = sortConcepts(input.concepts)
    .filter((concept) => concept.covered)
    .map((concept) => {
      const row = rows.get(concept.id);
      return {
        concept,
        state: row?.state ?? "new",
        lastShownAt: row?.lastShownAt ?? null,
        lastUsed: row?.lastUsedQuizQuestionId ?? null,
      };
    });
  if (eligible.length === 0) return null;

  const inState = (state: MasteryState) => byLeastRecentlyShown(eligible.filter((c) => c.state === state));
  const known = inState("known");
  const shakyAndNew = [...inState("shaky"), ...inState("new")].slice(0, MAX_SHAKY_AND_NEW);
  const review = shakyAndNew.length === 0;
  const included = review
    ? known.slice(0, ROUND_SIZE)
    : [...shakyAndNew, ...known.slice(0, Math.max(1, Math.round(KNOWN_SHARE * shakyAndNew.length)))];

  const flashcardIds: string[] = [];
  const quizQuestionIds: string[] = [];
  const optionOrder: Record<string, number[]> = {};
  const usedQuizQuestionIds: Record<string, string | null> = {};
  for (const { concept, lastUsed } of included) {
    for (const card of concept.flashcards) flashcardIds.push(card.id);
    const questionId = nextQuizQuestionId(concept, lastUsed);
    usedQuizQuestionIds[concept.id] = questionId;
    if (questionId === null) continue;
    quizQuestionIds.push(questionId);
    const question = concept.quizQuestions.find((q) => q.id === questionId)!;
    optionOrder[questionId] = shuffledIndices(question.options.length, input.random);
  }

  return {
    round: {
      roundId: input.roundId,
      noteHash: input.noteHash,
      cacheKey: input.cacheKey,
      review,
      conceptIds: included.map((c) => c.concept.id),
      itemIds: [...flashcardIds, ...quizQuestionIds],
      optionOrder,
      answers: [],
      status: "active",
      startedAt: input.now,
      completedAt: null,
    },
    eligibleConceptIds: eligible.map((c) => c.concept.id),
    usedQuizQuestionIds,
  };
}
