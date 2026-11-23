// Text extraction (spec 1.4 and 1.5 I/O & Edge-Case Matrix): decoding, routing, every rejection and hash identity.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { NORMALIZATION_VERSION } from "../core/passages";
import { pdfPages, type PdfItem } from "./pdf";
import { decodeText, extractNote, fileType } from "./text";

// pdfPages stays real unless a test stubs one call (0 pages, the scanned threshold).
vi.mock("./pdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./pdf")>();
  return { ...actual, pdfPages: vi.fn(actual.pdfPages) };
});
/** One page holding `chars` non-whitespace characters. */
const pageOf = (chars: number): PdfItem[] => [{ str: "x".repeat(chars), transform: [10, 0, 0, 10, 0, 700], width: chars * 5, height: 10 }];

const utf8 = (s: string) => new TextEncoder().encode(s);
const edge = (name: string) => new Uint8Array(readFileSync(new URL(`../../reference-notes/edge-cases/${name}`, import.meta.url)));
const words = (n: number, word = "ord") => Array.from({ length: n }, () => word).join(" ");
/** windows-1252 bytes for Latin-1 text (code points < 256 map one to one, except 0x80–0x9F). */
const cp1252 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

/** UTF-16 bytes with a BOM, little or big endian. */
const utf16 = (s: string, order: "le" | "be") => {
  const bytes = new Uint8Array(2 + s.length * 2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0xfeff, order === "le");
  for (let i = 0; i < s.length; i++) view.setUint16(2 + i * 2, s.charCodeAt(i), order === "le");
  return bytes;
};

describe("fileType", () => {
  it.each([
    ["notat.txt", "txt"],
    ["NOTAT.TXT", "txt"],
    ["a.MD", "md"],
    ["rapport.Docx", "docx"],
    ["x.pdf", "pdf"],
    ["arkiv.tar.md", "md"],
  ])("%s → %s", (name, type) => {
    expect(fileType(name)).toBe(type);
  });

  it.each(["gammel.doc", "tekst.rtf", "uten-endelse", "punktum.", ".txt.bak", "md"])("%s → null", (name) => {
    expect(fileType(name)).toBeNull();
  });
});

describe("decodeText", () => {
  it("decodes UTF-8", () => {
    expect(decodeText(utf8("Æ, ø og å"))).toEqual({ text: "Æ, ø og å", encodingFallback: false });
  });

  it("strips a UTF-8 BOM", () => {
    expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8("hei")]))).toEqual({ text: "hei", encodingFallback: false });
  });

  it("decodes UTF-16 LE and BE by their BOM and strips it", () => {
    expect(decodeText(utf16("Æ, ø og å", "le"))).toEqual({ text: "Æ, ø og å", encodingFallback: false });
    expect(decodeText(utf16("Æ, ø og å", "be"))).toEqual({ text: "Æ, ø og å", encodingFallback: false });
  });

  it("falls back to windows-1252 for bytes that are not UTF-8, and flags it", () => {
    expect(decodeText(cp1252("Blåbær og ørret"))).toEqual({ text: "Blåbær og ørret", encodingFallback: true });
    expect(decodeText(new Uint8Array([0x93, 0x61, 0x94, 0x80]))).toEqual({ text: "“a”€", encodingFallback: true });
  });
});

describe("extractNote", () => {
  const valid = `# Overskrift\n\n${words(200)}.`;

  it("returns Passages, word count, version and Note Hash for a valid .txt", async () => {
    const result = await extractNote("notat.txt", utf8(valid));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.note).toEqual({
      fileName: "notat.txt",
      passages: [
        { id: "p1", text: "Overskrift" },
        { id: "p2", text: `${words(200)}.` },
      ],
      wordCount: 201,
      normalizationVersion: NORMALIZATION_VERSION,
      encodingFallback: false,
    });
    expect(result.noteHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gives a.txt and b.md with the same bytes the same Passages and Note Hash", async () => {
    const a = await extractNote("a.txt", utf8(valid));
    const b = await extractNote("b.md", utf8(valid));
    const upper = await extractNote("NOTAT.TXT", utf8(valid));
    if (!a.ok || !b.ok || !upper.ok) throw new Error("expected ok");
    expect(b.noteHash).toBe(a.noteHash);
    expect(upper.noteHash).toBe(a.noteHash);
    expect(b.note.passages).toEqual(a.note.passages);
  });

  it("gives the same Note Hash with and without a BOM, and with \\r\\n line endings", async () => {
    const plain = await extractNote("a.txt", utf8(valid));
    const bom = await extractNote("a.txt", new Uint8Array([0xef, 0xbb, 0xbf, ...utf8(valid)]));
    const crlf = await extractNote("a.txt", utf8(valid.replace(/\n/g, "\r\n")));
    if (!plain.ok || !bom.ok || !crlf.ok) throw new Error("expected ok");
    expect(bom.noteHash).toBe(plain.noteHash);
    expect(crlf.noteHash).toBe(plain.noteHash);
  });

  it("decodes windows-1252 and sets encodingFallback; the hash matches the UTF-8 file", async () => {
    const text = `${words(160, "blåbær")}.`;
    const legacy = await extractNote("gammel.txt", cp1252(text));
    const modern = await extractNote("ny.txt", utf8(text));
    if (!legacy.ok || !modern.ok) throw new Error("expected ok");
    expect(legacy.note.encodingFallback).toBe(true);
    expect(legacy.note.passages[0].text.startsWith("blåbær")).toBe(true);
    expect(legacy.noteHash).toBe(modern.noteHash);
  });

  it.each(["gammel.doc", "tekst.rtf", "uten-endelse"])("rejects %s with err.type", async (name) => {
    expect(await extractNote(name, utf8(valid))).toEqual({ ok: false, error: "err.type" });
  });

  it.each(["rapport.docx", "notat.pdf"])("rejects text bytes misnamed %s with err.unreadable", async (name) => {
    expect(await extractNote(name, utf8(valid))).toEqual({ ok: false, error: "err.unreadable" });
  });

  it.each(["rapport.docx", "notat.pdf"])("rejects empty bytes named %s with err.unreadable", async (name) => {
    expect(await extractNote(name, new Uint8Array())).toEqual({ ok: false, error: "err.unreadable" });
  });

  it("checks the type before parsing: a PDF named .doc is err.type", async () => {
    expect(await extractNote("notat.doc", edge("nb-topptekst-bunntekst.pdf"))).toEqual({ ok: false, error: "err.type" });
  });

  it("routes .docx and .pdf by extension, case-insensitive, with encodingFallback false", async () => {
    for (const [name, file] of [
      ["Tabell.DOCX", "nb-tabell-digitale-tjenester.docx"],
      ["Topp.PDF", "nb-topptekst-bunntekst.pdf"],
    ]) {
      const result = await extractNote(name, edge(file));
      if (!result.ok) throw new Error(`${name}: ${result.error}`);
      expect(result.note.fileName).toBe(name);
      expect(result.note.encodingFallback).toBe(false);
      expect(result.note.normalizationVersion).toBe(NORMALIZATION_VERSION);
    }
  });

  it("does not detach or change the caller's bytes", async () => {
    const bytes = edge("nb-topptekst-bunntekst.pdf");
    const copy = bytes.slice();
    await extractNote("a.pdf", bytes);
    await extractNote("b.docx", bytes);
    expect(bytes).toEqual(copy);
  });

  it("a PDF with 0 pages is err.unreadable", async () => {
    vi.mocked(pdfPages).mockResolvedValueOnce([]);
    expect(await extractNote("tom.pdf", utf8("x"))).toEqual({ ok: false, error: "err.unreadable" });
  });

  it("scanned threshold: an average of exactly 100 characters per page is not err.scanned, 99 is", async () => {
    vi.mocked(pdfPages).mockResolvedValueOnce([pageOf(150), pageOf(50)]);
    // Two long "words": past the scanned check, stopped by the word count.
    expect(await extractNote("grense.pdf", utf8("x"))).toEqual({ ok: false, error: "err.tooShort" });
    vi.mocked(pdfPages).mockResolvedValueOnce([pageOf(150), pageOf(48)]);
    expect(await extractNote("grense.pdf", utf8("x"))).toEqual({ ok: false, error: "err.scanned" });
  });

  it("checks scanned before word count: an image-only PDF is err.scanned, not err.noText", async () => {
    expect(await extractNote("skannet.pdf", edge("nb-skannet.pdf"))).toEqual({ ok: false, error: "err.scanned" });
  });

  it("rejects an empty file with err.noText", async () => {
    expect(await extractNote("tom.txt", new Uint8Array())).toEqual({ ok: false, error: "err.noText" });
  });

  it("rejects whitespace only, a BOM only and markers only with err.noText", async () => {
    expect(await extractNote("tom.md", utf8(" \n\t\r\n  "))).toEqual({ ok: false, error: "err.noText" });
    expect(await extractNote("tom.md", new Uint8Array([0xef, 0xbb, 0xbf]))).toEqual({ ok: false, error: "err.noText" });
    expect(await extractNote("tom.md", utf8("#\n\n- \n> \n---\n"))).toEqual({ ok: false, error: "err.noText" });
  });

  it("rejects fewer than 150 words with err.tooShort; 150 is accepted", async () => {
    expect(await extractNote("kort.txt", utf8(words(149)))).toEqual({ ok: false, error: "err.tooShort" });
    expect((await extractNote("kort.txt", utf8(words(150)))).ok).toBe(true);
  });

  it("rejects more than 15 000 words with err.tooLong; 15 000 is accepted", async () => {
    expect(await extractNote("lang.txt", utf8(words(15_001)))).toEqual({ ok: false, error: "err.tooLong" });
    expect((await extractNote("lang.txt", utf8(words(15_000)))).ok).toBe(true);
  });

  it("counts words on the final Passages (markers do not count)", async () => {
    const result = await extractNote("liste.md", utf8(`${Array.from({ length: 150 }, () => "- ord").join("\n")}\n- - -`));
    if (!result.ok) throw new Error("expected ok");
    expect(result.note.wordCount).toBe(150);
    expect(result.note.passages.filter((p) => !/[\p{L}\p{N}]/u.test(p.text))).toEqual([]);
  });

  it("decodes UTF-16 LE and BE with a BOM: same Note Hash as UTF-8, no fallback flag", async () => {
    const modern = await extractNote("ny.txt", utf8(valid));
    const le = await extractNote("le.txt", utf16(valid, "le"));
    const be = await extractNote("be.txt", utf16(valid, "be"));
    if (!modern.ok || !le.ok || !be.ok) throw new Error("expected ok");
    expect(le.noteHash).toBe(modern.noteHash);
    expect(be.noteHash).toBe(modern.noteHash);
    expect(le.note.encodingFallback).toBe(false);
    expect(be.note.encodingFallback).toBe(false);
  });
});
