// Browser-only types (AD-6). The Proxy contract lives in api/schema.d.ts.

/** One unit of the Note's text: `p1…pn`, the only text the app shows, cites or hashes (AD-8). */
export type Passage = { id: string; text: string };

/** The extraction pipeline's output for one file (Story 1.4). Stored with the Note from Story 1.9. */
export type ExtractedNote = {
  fileName: string;
  passages: Passage[];
  wordCount: number;
  normalizationVersion: number;
  /** True when the bytes were not valid UTF-8 and were decoded as windows-1252 (`warn.encoding`). */
  encodingFallback: boolean;
};

// Study Set shapes (Story 1.8). `RawStudySet` is structural, like `GateStatus` in gate.ts, so core/
// does not import api/; verifyStudySet.test.ts checks that the contract's StudySet is assignable to it.

export type RawFlashcard = { front: string; back: string; passageId: string; quote: string };
export type RawQuizQuestion = {
  question: string;
  options: readonly string[];
  correctIndex: number;
  passageId: string;
  quote: string;
};
export type RawSummaryPoint = { text: string; passageId: string; quote: string };
export type RawKeyConcept = {
  name: string;
  centralityRank: number;
  flashcards: readonly RawFlashcard[];
  quizQuestions: readonly RawQuizQuestion[];
};
/** The Proxy's schema-valid StudySet, before IDs, Quote Check and floors. Never stored or rendered. */
export type RawStudySet = {
  concepts: readonly RawKeyConcept[];
  summaryPoints: readonly RawSummaryPoint[];
  language: string;
  model: string;
  promptVersion: string;
};

/** `quote` is always the normalized Quote, an exact substring of the cited Passage's text. */
export type VerifiedFlashcard = { id: string; front: string; back: string; passageId: string; quote: string };
export type VerifiedQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  passageId: string;
  quote: string;
};
export type VerifiedSummaryPoint = { id: string; text: string; passageId: string; quote: string };
export type VerifiedKeyConcept = {
  id: string;
  name: string;
  centralityRank: number;
  /** False when no Flashcard or Quiz Question survived the Quote Check (*not covered*). */
  covered: boolean;
  flashcards: VerifiedFlashcard[];
  quizQuestions: VerifiedQuizQuestion[];
};
/** The only Study Set shape that is stored or rendered (AD-3, AD-19). */
export type VerifiedStudySet = {
  concepts: VerifiedKeyConcept[];
  summaryPoints: VerifiedSummaryPoint[];
  model: string;
  promptVersion: string;
  /** Primary language subtag from the allow-list, or `und` (core/language.ts). */
  language: string;
  /** `{noteHash}:{promptVersion}:{model}` (AD-9). */
  cacheKey: string;
};
