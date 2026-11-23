// Extraction types and the file-type check (Stories 1.4, 1.5). Parser-free, so the main-thread client
// (client.ts) can import it without pulling mammoth, htmlparser2 or unpdf into the page bundle.
import type { ExtractedNote } from "../core/types";

/** Accepted file types (FR-1), by extension, case-insensitive. */
export const ACCEPTED_TYPES = ["txt", "md", "docx", "pdf"] as const;
export type FileType = (typeof ACCEPTED_TYPES)[number];

export type ExtractErrorKey =
  | "err.type"
  | "err.size"
  | "err.noText"
  | "err.scanned"
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
