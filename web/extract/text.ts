// Text extraction (Stories 1.4, 1.5): bytes of an accepted file → ExtractedNote + Note Hash, or a Microcopy error key.
// Runs inside the extraction Web Worker; .txt/.md is pure apart from TextDecoder, .docx/PDF use their parsers,
// and Vitest runs all of it in Node.
import { noteHash } from "../core/noteHash";
import { countWords, MAX_WORDS, MIN_WORDS, NORMALIZATION_VERSION, toParagraphs, toPassages } from "../core/passages";
import type { ExtractedNote, Passage } from "../core/types";
import { fileType, type ExtractErrorKey, type ExtractResult, type FileType } from "./types";

export { ACCEPTED_TYPES, fileType, type ExtractErrorKey, type ExtractResult, type FileType } from "./types";

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

type Parsed = { passages: Passage[]; encodingFallback: boolean } | { error: ExtractErrorKey };

/** Passages of one accepted file. A parser throw is caught by extractNote (→ `err.unreadable`). */
async function parse(type: FileType, bytes: Uint8Array): Promise<Parsed> {
  // The parsers load only for their own type, so a .txt/.md never pulls them in.
  if (type === "docx") {
    const { docxParagraphs } = await import("./docx");
    return { passages: toPassages(await docxParagraphs(bytes)), encodingFallback: false };
  }
  if (type === "pdf") {
    const pdf = await import("./pdf");
    let pages;
    try {
      pages = await pdf.pdfPages(bytes);
    } catch {
      return { error: "err.unreadable" };
    }
    if (!pages.length) return { error: "err.unreadable" };
    if (pdf.textCharsPerPage(pages) < pdf.MIN_CHARS_PER_PAGE) return { error: "err.scanned" };
    const paragraphs = pdf.toPdfParagraphs(pdf.removeRepeatedLines(pages.map(pdf.pageLines)));
    return { passages: toPassages(paragraphs), encodingFallback: false };
  }
  const { text, encodingFallback } = decodeText(bytes);
  return { passages: toPassages(toParagraphs(text)), encodingFallback };
}

/**
 * Runs the AD-8 pipeline on one file's bytes. Never throws: every failure is an error key, in this order:
 * type → parse failure or a PDF with 0 pages (`err.unreadable`) → scanned PDF → noText → tooShort → tooLong.
 */
export async function extractNote(fileName: string, bytes: Uint8Array): Promise<ExtractResult> {
  try {
    const type = fileType(fileName);
    if (!type) return { ok: false, error: "err.type" };

    const parsed = await parse(type, bytes);
    if ("error" in parsed) return { ok: false, error: parsed.error };
    const { passages, encodingFallback } = parsed;
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
