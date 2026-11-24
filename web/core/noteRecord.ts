// The Note record written with its first Study Set (AD-21, Story 1.9). Pure.
import { demoKey } from "./ids";
import type { ExtractedNote, Note, SourceType, VerifiedStudySet } from "./types";

export const TITLE_MAX_CODE_POINTS = 80;
export const DEFAULT_IMPORTANCE_LEVEL = 2;

/**
 * AD-21: the file name without its (last) extension, cut to 80 code points.
 * `Forelesning 7 – normalformer.final.pdf` → `Forelesning 7 – normalformer.final`.
 * A name that is only an extension (`.txt`) keeps the whole name.
 */
export function noteTitle(fileName: string): string {
  const stem = fileName.replace(/\.[^.]*$/, "").trim();
  const title = stem === "" ? fileName.trim() : stem;
  return [...title].slice(0, TITLE_MAX_CODE_POINTS).join("");
}

/** `extracted.sourceType` is `fileType(fileName)` from extract/, passed in so core/ does not import it. */
export function buildNoteRecord(
  extracted: ExtractedNote & { sourceType: SourceType },
  noteHash: string,
  set: VerifiedStudySet,
): Note {
  return {
    noteHash,
    title: noteTitle(extracted.fileName),
    sourceType: extracted.sourceType,
    wordCount: extracted.wordCount,
    passages: extracted.passages.map((p) => ({ id: p.id, text: p.text })),
    normalizationVersion: extracted.normalizationVersion,
    currentCacheKey: set.cacheKey,
    archived: false,
    importanceLevel: DEFAULT_IMPORTANCE_LEVEL,
    lastPractisedAt: null,
  };
}

/**
 * Story 1.14 (AD-9): a demo answer is stored apart from live records for the same Note. The Note key
 * becomes `demo:{noteHash}` (and so its route `/notat/demo:{noteHash}`), the cache key
 * `demo:{noteHash}:{promptVersion}:{model}`. A live answer is returned unchanged.
 */
export function recordsForMode(
  mode: "live" | "demo",
  note: Note,
  set: VerifiedStudySet,
): { note: Note; set: VerifiedStudySet } {
  if (mode === "live") return { note, set };
  const cacheKey = demoKey(set.cacheKey);
  return { note: { ...note, noteHash: demoKey(note.noteHash), currentCacheKey: cacheKey }, set: { ...set, cacheKey } };
}
