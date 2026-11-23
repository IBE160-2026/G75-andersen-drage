// Text extraction (Story 1.4): bytes of an accepted file → ExtractedNote + Note Hash, or a Microcopy error key.
// Runs inside the extraction Web Worker; pure apart from TextDecoder, so Vitest runs it in Node.
import { noteHash } from "../core/noteHash";
import { countWords, MAX_WORDS, MIN_WORDS, NORMALIZATION_VERSION, toParagraphs, toPassages } from "../core/passages";
import type { ExtractedNote } from "../core/types";

/** Accepted file types (FR-1), by extension, case-insensitive. `.docx` and `.pdf` are parsed from Story 1.5. */
export const ACCEPTED_TYPES = ["txt", "md", "docx", "pdf"] as const;
export type FileType = (typeof ACCEPTED_TYPES)[number];

export type ExtractErrorKey =
  | "err.type"
  | "err.size"
  | "err.noText"
  | "err.unreadable"
  | "err.tooShort"
  | "err.tooLong";

export type ExtractResult =
  | { ok: true; note: ExtractedNote; noteHash: string }
  | { ok: false; error: ExtractErrorKey };

/** The accepted type of `fileName` by its extension, or null (no extension, `.doc`, `.rtf`, …). */
export function fileType(fileName: string): FileType | null {
  const match = /\.([^.]+)$/.exec(fileName);
  const ext = match ? match[1].toLowerCase() : "";
  return (ACCEPTED_TYPES as readonly string[]).includes(ext) ? (ext as FileType) : null;
}

const UTF8_BOM = [0xef, 0xbb, 0xbf];

/**
 * UTF-16 LE/BE when the file starts with its BOM; otherwise strict UTF-8 (BOM stripped). Bytes that
 * are not valid UTF-8 are decoded as windows-1252 and flagged. Every BOM is stripped.
 */
export function decodeText(bytes: Uint8Array): { text: string; encodingFallback: boolean } {
  const utf16 = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : null;
  if (utf16) return { text: new TextDecoder(utf16, { ignoreBOM: true }).decode(bytes.subarray(2)), encodingFallback: false };
  const body = UTF8_BOM.every((b, i) => bytes[i] === b) ? bytes.subarray(3) : bytes;
  try {
    return { text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(body), encodingFallback: false };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(body), encodingFallback: true };
  }
}

/** Runs the AD-8 pipeline on one file's bytes. Never throws: every failure is an error key. */
export async function extractNote(fileName: string, bytes: Uint8Array): Promise<ExtractResult> {
  try {
    const type = fileType(fileName);
    if (!type) return { ok: false, error: "err.type" };
    // .docx and PDF extraction arrive in Story 1.5.
    if (type === "docx" || type === "pdf") return { ok: false, error: "err.unreadable" };

    const { text, encodingFallback } = decodeText(bytes);
    const passages = toPassages(toParagraphs(text));
    const wordCount = countWords(passages);
    if (wordCount === 0) return { ok: false, error: "err.noText" };
    if (wordCount < MIN_WORDS) return { ok: false, error: "err.tooShort" };
    if (wordCount > MAX_WORDS) return { ok: false, error: "err.tooLong" };

    const note: ExtractedNote = {
      fileName,
      passages,
      wordCount,
      normalizationVersion: NORMALIZATION_VERSION,
      encodingFallback,
    };
    return { ok: true, note, noteHash: noteHash(passages) };
  } catch {
    return { ok: false, error: "err.unreadable" };
  }
}
