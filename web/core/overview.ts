// Pure helpers for Notatoversikt (Story 1.11).
import { checkLanguage } from "./language";
import type { ExtractedNote, Note, VerifiedKeyConcept } from "./types";

/** Key Concepts by Centrality Rank (1 first); equal ranks keep their stored order. Does not mutate. */
export function sortConcepts<T extends Pick<VerifiedKeyConcept, "centralityRank">>(concepts: readonly T[]): T[] {
  return concepts
    .map((concept, index) => ({ concept, index }))
    .sort((a, b) => a.concept.centralityRank - b.concept.centralityRank || a.index - b.index)
    .map(({ concept }) => concept);
}

/** True when at least one Key Concept is covered, so a Round can start. */
export function hasCoveredConcept(concepts: readonly Pick<VerifiedKeyConcept, "covered">[]): boolean {
  return concepts.some((c) => c.covered);
}

/** The Note's file name as shown in the source panel: `{title}.{sourceType}`. */
export function noteFileName(note: Pick<Note, "title" | "sourceType">): string {
  return `${note.title}.${note.sourceType}`;
}

/**
 * The stored Note rebuilt as extraction output, for 'Prøv igjen' after `err.noConcepts`.
 * The stored Passages are the only text (AD-8); the original bytes are gone, so no encoding fallback.
 */
export function extractedFromNote(note: Note): ExtractedNote {
  return {
    fileName: noteFileName(note),
    passages: note.passages.map((p) => ({ id: p.id, text: p.text })),
    wordCount: note.wordCount,
    normalizationVersion: note.normalizationVersion,
    encodingFallback: false,
  };
}

/** `lang` for generated content and Passage text: the checked language, or "" for `und` (unknown, not bokmål). */
export function contentLang(language: string): string {
  const checked = checkLanguage(language);
  return checked === "und" ? "" : checked;
}

/** The visible Passage label: `p4` → `P4`. */
export function passageLabel(passageId: string): string {
  return passageId.replace(/^p/, "P");
}
