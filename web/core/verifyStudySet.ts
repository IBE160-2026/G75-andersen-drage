// verifyStudySet (AD-3, AD-19): turns the Proxy's schema-valid StudySet into a VerifiedStudySet.
// Order: IDs + duplicate drop → Quote Check + option uniqueness → floors. Pure and never throws for
// schema-valid input; it does not re-validate the shape (callers pass contract data).
import { cacheKey, flashcardId, keyConceptId, quizQuestionId, summaryPointId } from "./ids";
import { checkLanguage } from "./language";
import { normalize } from "./normalize";
import { noteHash } from "./noteHash";
import type { Passage, RawStudySet, VerifiedKeyConcept, VerifiedStudySet } from "./types";

export const MIN_CONCEPTS = 5;
export const MIN_SUMMARY_POINTS = 5;
export const MIN_FLASHCARDS = 5;
export const MIN_QUIZ_QUESTIONS = 5;
export const QUOTE_MIN_LENGTH = 20;
export const QUOTE_MAX_LENGTH = 300;

export type VerifyResult =
  | { ok: true; set: VerifiedStudySet }
  | { ok: false; code: "err.generation" | "err.tooFewItems" };

/**
 * Quote Check (FR-9): the cited Passage exists, and the normalized Quote is 20–300 code points long
 * and an exact substring of that one Passage. Returns the normalized Quote, or null when it fails.
 * Passages are already normalized by the extraction pipeline.
 */
export function quoteCheck(
  passageId: string,
  quote: string,
  passagesById: ReadonlyMap<string, Passage>,
): string | null {
  const passage = passagesById.get(passageId);
  if (!passage) return null;
  const q = normalize(quote);
  const length = [...q].length;
  if (length < QUOTE_MIN_LENGTH || length > QUOTE_MAX_LENGTH) return null;
  return passage.text.includes(q) ? q : null;
}

/** Options are pairwise different after Normalization; the comparison is case-sensitive. */
function optionsUnique(options: readonly string[]): boolean {
  return new Set(options.map(normalize)).size === options.length;
}

export function verifyStudySet(raw: RawStudySet, passages: readonly Passage[]): VerifyResult {
  const passagesById = new Map(passages.map((p) => [p.id, p] as const));

  // 1. IDs from the raw order; drop empty slugs and later duplicates.
  const seen = new Set<string>();
  const withIds = raw.concepts.flatMap((concept) => {
    const id = keyConceptId(concept.name);
    if (id === null || seen.has(id)) return [];
    seen.add(id);
    return [{ id, concept }];
  });

  // 2. Quote Check and option uniqueness. Item IDs come from the raw position, so survivors keep theirs.
  const concepts: VerifiedKeyConcept[] = withIds.map(({ id, concept }) => {
    const flashcards = concept.flashcards.flatMap((fc, i) => {
      const quote = quoteCheck(fc.passageId, fc.quote, passagesById);
      return quote === null
        ? []
        : [{ id: flashcardId(id, i + 1), front: fc.front, back: fc.back, passageId: fc.passageId, quote }];
    });
    const quizQuestions = concept.quizQuestions.flatMap((qq, i) => {
      const quote = quoteCheck(qq.passageId, qq.quote, passagesById);
      if (quote === null || !optionsUnique(qq.options)) return [];
      return [
        {
          id: quizQuestionId(id, i + 1),
          question: qq.question,
          options: [...qq.options],
          correctIndex: qq.correctIndex,
          passageId: qq.passageId,
          quote,
        },
      ];
    });
    return {
      id,
      name: concept.name,
      centralityRank: concept.centralityRank,
      covered: flashcards.length + quizQuestions.length > 0,
      flashcards,
      quizQuestions,
    };
  });

  const summaryPoints = raw.summaryPoints.flatMap((sp, i) => {
    const quote = quoteCheck(sp.passageId, sp.quote, passagesById);
    return quote === null ? [] : [{ id: summaryPointId(i + 1), text: sp.text, passageId: sp.passageId, quote }];
  });

  // 3. Floors: err.generation is checked before err.tooFewItems.
  if (concepts.length < MIN_CONCEPTS || summaryPoints.length < MIN_SUMMARY_POINTS) {
    return { ok: false, code: "err.generation" };
  }
  const flashcardCount = concepts.reduce((n, c) => n + c.flashcards.length, 0);
  const quizQuestionCount = concepts.reduce((n, c) => n + c.quizQuestions.length, 0);
  if (flashcardCount < MIN_FLASHCARDS || quizQuestionCount < MIN_QUIZ_QUESTIONS) {
    return { ok: false, code: "err.tooFewItems" };
  }

  return {
    ok: true,
    set: {
      concepts,
      summaryPoints,
      model: raw.model,
      promptVersion: raw.promptVersion,
      language: checkLanguage(raw.language),
      cacheKey: cacheKey(noteHash(passages), raw.promptVersion, raw.model),
    },
  };
}
