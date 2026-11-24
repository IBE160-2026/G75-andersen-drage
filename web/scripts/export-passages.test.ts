// export-passages.ts (Story 1.13, I/O matrix "Export"): an extraction error stops the export and names the file.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exportNotes } from "./export-passages";

const ROOT = new URL("../../reference-notes/", import.meta.url);
const read = (path: string) => new Uint8Array(readFileSync(new URL(path, ROOT)));

describe("exportNotes", () => {
  it("returns {note, noteHash, passages} per reference note", async () => {
    const result = await exportNotes(["nb-smidig-scrum.md"], read);
    expect(result.ok && result.entries.map((e) => [e.note, e.noteHash])).toEqual([
      ["nb-smidig-scrum.md", "2e473642b71bb22d923c1336d60124f5fe636517a5d70b5f89a49984c84f02b1"],
    ]);
  });

  it("names the note that fails extraction", async () => {
    const result = await exportNotes(["nb-smidig-scrum.md", "edge-cases/nb-odelagt.docx"], read);
    expect(result).toEqual({ ok: false, note: "edge-cases/nb-odelagt.docx", error: "err.unreadable" });
  });
});
