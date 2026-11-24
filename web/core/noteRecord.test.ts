// Story 1.9: the Note record (AD-21) and its title (spec I/O matrix, row "title").
import { describe, expect, it } from "vitest";
import { buildNoteRecord, noteTitle, TITLE_MAX_CODE_POINTS } from "./noteRecord";
import type { ExtractedNote, VerifiedStudySet } from "./types";

describe("noteTitle", () => {
  it("drops only the last extension", () => {
    expect(noteTitle("Forelesning 7 – normalformer.final.pdf")).toBe("Forelesning 7 – normalformer.final");
    expect(noteTitle("notat.txt")).toBe("notat");
    expect(noteTitle("NOTAT.MD")).toBe("NOTAT");
  });

  it("cuts a long name to 80 code points, not UTF-16 units", () => {
    const long = `${"æ".repeat(79)}😀😀😀.docx`;
    const title = noteTitle(long);
    expect([...title]).toHaveLength(TITLE_MAX_CODE_POINTS);
    expect(title).toBe(`${"æ".repeat(79)}😀`);
    expect(noteTitle(`${"a".repeat(80)}.txt`)).toBe("a".repeat(80));
  });

  it("keeps a name that is only an extension", () => {
    expect(noteTitle(".txt")).toBe(".txt");
  });
});

describe("buildNoteRecord", () => {
  const extracted: ExtractedNote & { sourceType: "pdf" } = {
    fileName: "Forelesning 7.pdf",
    passages: [{ id: "p1", text: "Første avsnitt." }],
    wordCount: 2,
    normalizationVersion: 1,
    encodingFallback: false,
    sourceType: "pdf",
  };
  const set = { cacheKey: "abc:2:m/x" } as VerifiedStudySet;

  it("has the AD-21 fields and defaults", () => {
    expect(buildNoteRecord(extracted, "abc", set)).toEqual({
      noteHash: "abc",
      title: "Forelesning 7",
      sourceType: "pdf",
      wordCount: 2,
      passages: [{ id: "p1", text: "Første avsnitt." }],
      normalizationVersion: 1,
      currentCacheKey: "abc:2:m/x",
      archived: false,
      importanceLevel: 2,
      lastPractisedAt: null,
    });
  });

  it("does not store the extraction-only fields", () => {
    const record = buildNoteRecord(extracted, "abc", set);
    expect(record).not.toHaveProperty("fileName");
    expect(record).not.toHaveProperty("encodingFallback");
  });
});
