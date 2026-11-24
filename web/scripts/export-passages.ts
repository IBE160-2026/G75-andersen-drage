// Story 1.13, step 1 of the recording (AD-8, AD-12): runs the real extraction pipeline (extract/ + core/)
// on every reference note and writes proxy/recordings/passages.json = [{note, noteHash, passages}].
// proxy/scripts/record_fixtures.py reads only this file; Python never splits or normalizes Note text.
// Usage: `npm run export-passages` (from web/). Prints only counts.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Passage } from "../core/types";
import { extractNote } from "../extract/text";
import { isMain } from "./isMain";

const NOTES_DIR = new URL("../../reference-notes/", import.meta.url);
const OUT_DIR = new URL("../../proxy/recordings/", import.meta.url);

export type ExportEntry = { note: string; noteHash: string; passages: Passage[]; wordCount: number };
export type ExportResult = { ok: true; entries: ExportEntry[] } | { ok: false; note: string; error: string };

/** Extracts each note in order; stops at the first extraction error and names that note. */
export async function exportNotes(names: readonly string[], read: (note: string) => Uint8Array): Promise<ExportResult> {
  const entries: ExportEntry[] = [];
  for (const note of names) {
    const result = await extractNote(note, read(note));
    if (!result.ok) return { ok: false, note, error: result.error };
    entries.push({ note, noteHash: result.noteHash, passages: result.note.passages, wordCount: result.note.wordCount });
  }
  return { ok: true, entries };
}

/** The reference notes: top-level files in reference-notes/ except its README. */
function referenceNoteNames(): string[] {
  return readdirSync(NOTES_DIR)
    .filter((name) => name !== "README.md" && statSync(new URL(name, NOTES_DIR)).isFile())
    .sort();
}

async function main(): Promise<number> {
  const result = await exportNotes(referenceNoteNames(), (note) => new Uint8Array(readFileSync(new URL(note, NOTES_DIR))));
  if (!result.ok) {
    console.error(`${result.note}: extraction failed (${result.error})`);
    return 1;
  }
  for (const { note, passages, wordCount } of result.entries) {
    console.log(`${note}: ${passages.length} Passages, ${wordCount} words`);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const out = new URL("passages.json", OUT_DIR);
  const entries = result.entries.map(({ note, noteHash, passages }) => ({ note, noteHash, passages }));
  writeFileSync(out, JSON.stringify(entries, null, 2) + "\n", "utf8");
  console.log(`wrote ${fileURLToPath(out)} (${entries.length} notes)`);
  return 0;
}

// Runs only when executed directly (`npm run export-passages`), not when a test imports the module.
if (isMain(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    () => {
      console.error("export-passages: unexpected failure");
      process.exit(1);
    },
  );
}
