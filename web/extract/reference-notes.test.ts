// Reference notes and edge cases (spec 1.5, DR-3): every reference note extracts to Passages inside FR-3
// with a fixed Note Hash, every edge case gives its expected key, every Key Concepts file has 5–15 entries.
// A changed hash means an extraction rule changed: bump NORMALIZATION_VERSION and update the hashes here
// (Fixtures recorded in Story 1.13 are keyed by these hashes).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalize } from "../core/normalize";
import { MAX_WORDS, MIN_WORDS } from "../core/passages";
import { extractNote, type ExtractResult } from "./text";

const ROOT = new URL("../../reference-notes/", import.meta.url);
const bytes = (path: string) => new Uint8Array(readFileSync(new URL(path, ROOT)));
const extract = (path: string) => extractNote(path.split("/").pop()!, bytes(path));
const ok = (result: ExtractResult) => {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result;
};

/** Note Hash snapshots (NORMALIZATION_VERSION 1). */
const NOTES = {
  "nb-smidig-scrum.md": "2e473642b71bb22d923c1336d60124f5fe636517a5d70b5f89a49984c84f02b1",
  "nb-digital-verden.docx": "f8e36750fbe1b1c4a6f36af4ed15ec4beb4ce3ec42e78c67cbb8e75baec453d0",
  "en-unit-testing.pdf": "f0357a9021403b542c0ec830875e43b9af01359c8db9e054773bb85af10248ed",
} as const;

describe("reference notes", () => {
  for (const [name, hash] of Object.entries(NOTES)) {
    it(`${name}: Passages p1…pn inside FR-3, Note Hash unchanged`, async () => {
      const { note, noteHash } = ok(await extract(name));
      expect(note.passages.length).toBeGreaterThan(10);
      note.passages.forEach((p, i) => {
        expect(p.id).toBe(`p${i + 1}`);
        expect(p.text).toBe(normalize(p.text));
        expect(p.text).toMatch(/[\p{L}\p{N}]/u);
      });
      expect(note.wordCount).toBeGreaterThanOrEqual(MIN_WORDS);
      expect(note.wordCount).toBeLessThanOrEqual(MAX_WORDS);
      expect(note.encodingFallback).toBe(false);
      expect(noteHash).toBe(hash);
    });
  }

  it("en-unit-testing.pdf: PDF lines join with \\n, so Normalization rejoins words hyphenated at a line end", async () => {
    const { note } = ok(await extract("en-unit-testing.pdf"));
    expect(note.passages.some((p) => p.text.includes("a specificationbased approach"))).toBe(true);
  });
});

describe("edge cases", () => {
  it.each([
    ["nb-feil-type.rtf", "err.type"],
    ["nb-tom.docx", "err.noText"],
    ["nb-for-kort.docx", "err.tooShort"],
    ["nb-skannet.pdf", "err.scanned"],
    ["nb-odelagt.docx", "err.unreadable"],
    ["nb-odelagt.pdf", "err.unreadable"],
    ["nb-passord.pdf", "err.unreadable"],
    ["nb-norge-too-long.pdf", "err.tooLong"],
  ])("%s → %s", async (name, error) => {
    expect(await extract(`edge-cases/${name}`)).toEqual({ ok: false, error });
  });

  it("nb-windows-1252.txt is accepted with encodingFallback (warn.encoding)", async () => {
    const { note } = ok(await extract("edge-cases/nb-windows-1252.txt"));
    expect(note.encodingFallback).toBe(true);
    expect(note.passages.map((p) => p.text).join(" ")).toContain("trådløse hjemmenett");
  });

  it("nb-injeksjon.md is accepted (Story 1.6 sends it)", async () => {
    const { note } = ok(await extract("edge-cases/nb-injeksjon.md"));
    expect(note.passages.map((p) => p.text).join(" ")).toContain("KODE-RØD-4471");
  });

  it("nb-tabell-digitale-tjenester.docx: each table row is one line, cells joined by ' | '", async () => {
    const texts = ok(await extract("edge-cases/nb-tabell-digitale-tjenester.docx")).note.passages.map((p) => p.text);
    expect(texts).toContain("Vanskelig å frigjøre ressurser til utvikling | 62,2 | 83,9 | 85,7");
    expect(texts).toContain("| Statlige virksomheter | Kommuner | Fylkeskommuner");
    expect(texts).toContain("De største hindringene for utvikling av digitale tjenester. Prosent");
    expect(texts).not.toContain("62,2");
  });

  it("nb-topptekst-bunntekst.pdf: no header, footer or 'Side n av 4' line in any Passage", async () => {
    const { note } = ok(await extract("edge-cases/nb-topptekst-bunntekst.pdf"));
    for (const { text } of note.passages) {
      expect(text).not.toContain("forelesningsnotater");
      expect(text).not.toContain("testfil for topptekst");
      expect(text).not.toMatch(/Side \d av 4/);
    }
    expect(note.passages[0].text).toBe("Relasjonsdatabaser");
  });
});

describe("Key Concepts files", () => {
  for (const name of Object.keys(NOTES)) {
    const file = `key-concepts/${name.replace(/\.[^.]+$/, "")}.md`;
    it(`${file}: a # heading naming the note and 5–15 numbered entries`, () => {
      const text = readFileSync(new URL(file, ROOT), "utf8");
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      expect(lines[0]).toMatch(/^# /);
      expect(lines[0]).toContain(name);
      const entries = lines.slice(1);
      expect(entries.every((l, i) => l.startsWith(`${i + 1}. `))).toBe(true);
      expect(entries.length).toBeGreaterThanOrEqual(5);
      expect(entries.length).toBeLessThanOrEqual(15);
    });
  }
});
