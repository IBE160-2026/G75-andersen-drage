// Story 1.11: pure Notatoversikt helpers (concept sort, fileName rebuild, lang mapping).
import { describe, expect, it } from "vitest";
import {
  contentLang,
  extractedFromNote,
  hasCoveredConcept,
  noteFileName,
  passageLabel,
  sortConcepts,
} from "./overview";
import type { Note } from "./types";

describe("sortConcepts", () => {
  it("orders by centralityRank, keeps stored order on ties, and does not mutate", () => {
    const input = [
      { id: "c", centralityRank: 3 },
      { id: "a", centralityRank: 1 },
      { id: "b1", centralityRank: 2 },
      { id: "b2", centralityRank: 2 },
    ];
    const copy = [...input];
    expect(sortConcepts(input).map((c) => c.id)).toEqual(["a", "b1", "b2", "c"]);
    expect(input).toEqual(copy);
  });
});

describe("hasCoveredConcept", () => {
  it("is false only when no concept is covered", () => {
    expect(hasCoveredConcept([{ covered: false }, { covered: true }])).toBe(true);
    expect(hasCoveredConcept([{ covered: false }, { covered: false }])).toBe(false);
    expect(hasCoveredConcept([])).toBe(false);
  });
});

describe("extractedFromNote", () => {
  const note: Note = {
    noteHash: "a".repeat(64),
    title: "Forelesning 7.final",
    sourceType: "pdf",
    wordCount: 321,
    passages: [{ id: "p1", text: "Første avsnitt." }],
    normalizationVersion: 1,
    currentCacheKey: "k",
    archived: false,
    importanceLevel: 2,
    lastPractisedAt: null,
  };

  it("rebuilds fileName as {title}.{sourceType} with no encoding fallback", () => {
    expect(noteFileName(note)).toBe("Forelesning 7.final.pdf");
    expect(extractedFromNote(note)).toEqual({
      fileName: "Forelesning 7.final.pdf",
      passages: [{ id: "p1", text: "Første avsnitt." }],
      wordCount: 321,
      normalizationVersion: 1,
      encodingFallback: false,
    });
  });

  it("copies the Passages", () => {
    expect(extractedFromNote(note).passages[0]).not.toBe(note.passages[0]);
  });
});

describe("contentLang", () => {
  it("maps und to an empty lang and keeps allow-listed languages", () => {
    expect(contentLang("und")).toBe("");
    expect(contentLang("nb")).toBe("nb");
    expect(contentLang("en")).toBe("en");
    expect(contentLang("xx")).toBe("");
  });
});

describe("passageLabel", () => {
  it("shows p4 as P4", () => {
    expect(passageLabel("p4")).toBe("P4");
    expect(passageLabel("p12")).toBe("P12");
  });
});
