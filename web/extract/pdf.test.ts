// PDF extraction (spec 1.5 Design Notes): line building, repeated-line removal, paragraphs and the
// scanned check on synthetic text items; pdfPages on real files is covered by reference-notes.test.ts.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadPdfjs,
  MIN_CHARS_PER_PAGE,
  pageLines,
  pdfPages,
  removeRepeatedLines,
  textCharsPerPage,
  toPdfParagraphs,
  type PdfItem,
  type PdfLine,
} from "./pdf";

/** A text item at (x, y) of font size `size`; width defaults to 0.5 × size per character. */
const item = (str: string, x: number, y: number, { size = 10, width, height }: { size?: number; width?: number; height?: number } = {}): PdfItem => ({
  str,
  transform: [size, 0, 0, size, x, y],
  width: width ?? str.length * size * 0.5,
  height: height ?? size,
});
const texts = (lines: PdfLine[]) => lines.map((l) => l.text);
const line = (text: string, y: number, h = 10): PdfLine => ({ text, y, h });

describe("pageLines", () => {
  it("orders lines top to bottom and items in a line by x", () => {
    const items = [item("andre", 50, 700), item("linje", 80, 700), item("første", 50, 712), item("Neste", 0, 688)];
    expect(texts(pageLines(items))).toEqual(["første", "andre linje", "Neste"]);
  });

  it("adds a space only at a gap over 0.15 h and keeps explicit space items", () => {
    const items = [item("tett", 0, 700, { width: 20 }), item("på", 21, 700, { width: 10 }), item("luft", 40, 700, { width: 20 })];
    expect(texts(pageLines(items))).toEqual(["tettpå luft"]);
    const spaced = [item("a", 0, 500, { width: 5 }), item(" ", 5, 500, { width: 3, height: 0 }), item("b", 8, 500, { width: 5 })];
    expect(texts(pageLines(spaced))).toEqual(["a b"]);
  });

  it("joins an item within half a height (a superscript) and splits at more", () => {
    const items = [item("tekst.", 0, 700, { size: 12, width: 30 }), item("[1]", 30, 704.8, { size: 9.6, width: 10 }), item("lavere", 0, 693, { size: 12 })];
    const lines = pageLines(items);
    expect(texts(lines)).toEqual(["tekst.[1]", "lavere"]);
    expect(lines[0]).toMatchObject({ y: 700, h: 12 });
  });

  it("starts a new line at a gap over 2 h (side column)", () => {
    const items = [item("Overskrift", 0, 700, { width: 60 }), item("Brødtekst", 100, 700, { width: 50 })];
    expect(texts(pageLines(items))).toEqual(["Overskrift", "Brødtekst"]);
  });

  it("drops empty items and rotated items", () => {
    const rotated: PdfItem = { str: "UTKAST", transform: [0, 10, -10, 0, 300, 400], width: 60, height: 10 };
    const items = [item("", 0, 700, { width: 0, height: 0 }), item("tekst", 0, 700), rotated];
    expect(texts(pageLines(items))).toEqual(["tekst"]);
  });

  it("uses hypot(c, d) when height is 0, else the page median", () => {
    const zero: PdfItem = { str: "b", transform: [0, 0, 0, 0, 100, 704], width: 5, height: 0 };
    const lines = pageLines([item("a", 0, 700, { height: 0 }), zero]);
    // a: h = hypot(0, 10) = 10; b: no height at all → page median 10, so 4 < 5 joins and the gap 95 > 20 splits.
    expect(texts(lines)).toEqual(["a", "b"]);
    expect(lines.map((l) => l.h)).toEqual([10, 10]);
  });

  it("keeps a sheared (synthetic italic) item; only a rotated baseline counts as rotated", () => {
    const italic: PdfItem = { str: "skrått", transform: [10, 0, 2.1, 10, 40, 700], width: 30, height: 10 };
    const noise: PdfItem = { str: "støy", transform: [10, 1e-7, 0, 10, 75, 700], width: 20, height: 10 };
    expect(texts(pageLines([item("rett", 0, 700, { width: 38 }), italic, noise]))).toEqual(["rett skrått støy"]);
  });

  it("returns no lines for an empty page", () => {
    expect(pageLines([])).toEqual([]);
  });

  it("reads two columns each top to bottom, left column first; full-width lines end the block", () => {
    const left = (t: string, y: number) => item(t, 50, y, { width: 200 });
    const right = (t: string, y: number) => item(t, 320, y, { width: 200 });
    const items = [
      item("Tittel over begge spaltene", 50, 760, { width: 470 }),
      left("V1", 700), right("H1", 700),
      left("V2", 688), right("H2", 688),
      left("V3", 676), right("H3", 676),
      item("Bunntekst over hele bredden", 50, 600, { width: 470 }),
    ];
    const lines = pageLines(items);
    expect(texts(lines)).toEqual(["Tittel over begge spaltene", "V1", "V2", "V3", "H1", "H2", "H3", "Bunntekst over hele bredden"]);
    expect(lines.filter((l) => l.colStart).map((l) => l.text)).toEqual(["H1"]);
    expect(lines.some((l) => l.alone)).toBe(false);
  });

  it("makes a side-column heading its own line beside the body column", () => {
    const items = [
      item("Kostnad", 20, 700, { width: 40 }),
      item("Brødtekst en", 150, 700, { width: 300 }),
      item("Brødtekst to", 150, 688, { width: 300 }),
      item("Brødtekst tre.", 150, 676, { width: 300 }),
    ];
    const lines = pageLines(items);
    expect(texts(lines)).toEqual(["Kostnad", "Brødtekst en", "Brødtekst to", "Brødtekst tre."]);
    expect(lines[0].alone).toBe(true);
    expect(toPdfParagraphs([lines])).toEqual(["Kostnad", "Brødtekst en\nBrødtekst to\nBrødtekst tre."]);
  });

  it("two columns: a column start continues an unfinished sentence and ends a finished one", () => {
    const col = (x: number, a: string, b: string) => [item(a, x, 700, { width: 200 }), item(b, x, 688, { width: 200 })];
    const open = pageLines([...col(50, "venstre en", "venstre fortsetter"), ...col(320, "i høyre.", "Høyre to")]);
    expect(toPdfParagraphs([open])).toEqual(["venstre en\nvenstre fortsetter\ni høyre.\nHøyre to"]);
    const closed = pageLines([...col(50, "venstre en", "venstre slutt."), ...col(320, "Høyre en", "Høyre to")]);
    expect(toPdfParagraphs([closed])).toEqual(["venstre en\nvenstre slutt.", "Høyre en\nHøyre to"]);
  });
});

describe("removeRepeatedLines", () => {
  const page = (n: number, body: string[]) => [
    line("Databaser – forelesningsnotater", 800, 9),
    ...body.map((t, i) => line(t, 700 - i * 12)),
    line("Torsas læringsassistent", 46, 9),
    line(`Side ${n} av 4`, 34, 9),
  ];

  it("removes a header and a two-line footer with page numbers on every page", () => {
    const body = (n: number) => ["alfa", "beta", "gamma", "delta"].map((w) => `${w} på side ${"I".repeat(n)}`);
    const pages = [1, 2, 3, 4].map((n) => page(n, body(n)));
    expect(removeRepeatedLines(pages).map(texts)).toEqual([1, 2, 3, 4].map(body));
  });

  it("keeps a line repeated on fewer than half the pages, or on one page only", () => {
    const pages = [
      [line("Tittel", 800), line("a", 700), line("b", 690), line("c", 680), line("d", 670)],
      [line("x", 800), line("e", 700), line("f", 690), line("g", 680), line("h", 670)],
      [line("y", 800), line("i", 700), line("j", 690), line("k", 680), line("l", 670)],
    ];
    expect(removeRepeatedLines(pages)).toEqual(pages);
    const single = [[line("Side 1 av 1", 800), line("tekst", 700)]];
    expect(removeRepeatedLines(single)).toEqual(single);
  });

  it("ignores repeats in the middle of a page", () => {
    const body = (n: number) => [line(`topp ${"a".repeat(n)}`, 800), line(`t2 ${"b".repeat(n)}`, 790), line("Samme midt", 700), line(`b2 ${"c".repeat(n)}`, 60), line(`bunn ${"d".repeat(n)}`, 50)];
    const pages = [body(1), body(2)];
    expect(removeRepeatedLines(pages).map(texts).flat()).toContain("Samme midt");
  });

  it("counts a key once per page", () => {
    const pages = [
      [line("Gjentatt", 800), line("Gjentatt", 790), line("a", 700)],
      [line("b", 800), line("c", 790), line("d", 700), line("e", 690), line("f", 680)],
      [line("g", 800), line("h", 790), line("i", 700), line("j", 690), line("k", 680)],
    ];
    expect(removeRepeatedLines(pages)).toEqual(pages);
  });

  it("needs at least half the pages: on 6 pages an edge line on 2 is kept, one on 3 is removed", () => {
    const pages = Array.from({ length: 6 }, (_, p) => [
      line(p < 2 ? "To sider" : `topp ${"x".repeat(p)}`, 800),
      line(`a ${"y".repeat(p)}`, 700),
      line(`b ${"z".repeat(p)}`, 690),
      line(`c ${"w".repeat(p)}`, 680),
      line(p < 3 ? "Tre sider" : `bunn ${"v".repeat(p)}`, 50),
    ]);
    const out = removeRepeatedLines(pages).map(texts);
    expect(out.slice(0, 2).every((t) => t[0] === "To sider")).toBe(true);
    expect(out.flat()).not.toContain("Tre sider");
    expect(out.slice(3).every((t) => t.length === 5)).toBe(true);
  });
});

describe("toPdfParagraphs", () => {
  it("breaks at a gap of at least 1.3 × the median line spacing; lines join with \\n", () => {
    const page = [line("en", 700), line("to.", 688), line("tre", 670), line("fire", 658), line("fem", 646)];
    expect(toPdfParagraphs([page])).toEqual(["en\nto.", "tre\nfire\nfem"]);
  });

  it("continues a paragraph over a page break when the page ends without . ! ? :", () => {
    const p1 = [line("Første", 700), line("setning fortsetter", 688)];
    const p2 = [line("på neste side.", 800), line("Mer", 788)];
    expect(toPdfParagraphs([p1, p2])).toEqual(["Første\nsetning fortsetter\npå neste side.\nMer"]);
  });

  it("ends the paragraph at a page break after . ! ? or :", () => {
    for (const end of [".", "!", "?", ":"]) {
      const p1 = [line("a", 700), line(`slutt${end}`, 688)];
      const p2 = [line("ny", 800), line("side", 788)];
      expect(toPdfParagraphs([p1, p2])).toEqual([`a\nslutt${end}`, "ny\nside"]);
    }
  });

  it("uses the document median on a page with fewer than 2 lines, and skips empty pages", () => {
    const p1 = [line("a", 700), line("b.", 688), line("c", 676)];
    expect(toPdfParagraphs([p1, [], [line("alene", 500)]])).toEqual(["a\nb.\nc\nalene"]);
  });

  it("returns nothing for no lines", () => {
    expect(toPdfParagraphs([])).toEqual([]);
    expect(toPdfParagraphs([[], []])).toEqual([]);
  });
});

describe("textCharsPerPage", () => {
  it("counts non-whitespace characters of all items, rotated included, per page", () => {
    const rotated: PdfItem = { str: "abcd", transform: [0, 1, -1, 0, 0, 0], width: 4, height: 1 };
    expect(textCharsPerPage([[item("ab c", 0, 0), item(" \n", 0, 0)], [rotated]])).toBe(3.5);
  });

  it("is 0 for no pages and image-only pages", () => {
    expect(textCharsPerPage([])).toBe(0);
    expect(textCharsPerPage([[], []])).toBe(0);
  });

  it("the threshold is 100", () => {
    expect(MIN_CHARS_PER_PAGE).toBe(100);
  });
});

describe("pdfPages", () => {
  it("throws on bytes that are not a PDF", async () => {
    await expect(pdfPages(new TextEncoder().encode("ikke en pdf"))).rejects.toThrow();
  });
});

describe("loadPdfjs (PDF.js must not see a worker scope while it loads)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restores an own postMessage with its original descriptor", async () => {
    const post = () => {};
    const scope: Record<string, unknown> = {};
    Object.defineProperty(scope, "postMessage", { value: post, writable: true, enumerable: true, configurable: true });
    const before = Object.getOwnPropertyDescriptor(scope, "postMessage");
    vi.stubGlobal("self", scope);
    const pdfjs = await loadPdfjs();
    expect(typeof pdfjs.getDocument).toBe("function");
    expect(Object.getOwnPropertyDescriptor(scope, "postMessage")).toEqual(before);
  });

  it("deletes the shadow again when postMessage came from the prototype", async () => {
    const post = () => {};
    const scope = Object.create({ postMessage: post }) as Record<string, unknown>;
    vi.stubGlobal("self", scope);
    await loadPdfjs();
    expect(Object.hasOwn(scope, "postMessage")).toBe(false);
    expect(scope.postMessage).toBe(post);
  });

  it("hides postMessage while the module loads", async () => {
    const scope: Record<string, unknown> = { postMessage: () => {} };
    vi.stubGlobal("self", scope);
    const pending = loadPdfjs();
    expect(scope.postMessage).toBeUndefined();
    await pending;
    expect(typeof scope.postMessage).toBe("function");
  });
});
