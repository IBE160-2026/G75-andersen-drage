// PDF extraction (Story 1.5, AD-8): unpdf (serverless PDF.js) gives positioned text items per page;
// the pure functions below turn them into lines, drop repeated headers/footers and build raw
// paragraphs for toPassages (core/passages.ts). Runs inside the extraction Web Worker.
// Any change to a rule here changes Note Hashes: bump NORMALIZATION_VERSION with it
// (the Note Hash snapshots in reference-notes.test.ts catch it).
import { definePDFJSModule, getDocumentProxy } from "unpdf";

/**
 * PDF.js registers itself as a PDF.js worker when its module is evaluated inside any Web Worker scope
 * (`self.postMessage` + `onmessage`), and then posts its own "ready" message to the main thread, which the
 * extraction client would take as a malformed answer. The serverless build runs in-thread and needs no
 * worker, so `postMessage` is hidden while the lazy module loads, then restored.
 */
export async function loadPdfjs() {
  const scope = typeof self === "undefined" ? null : (self as unknown as Record<string, unknown>);
  // On a worker global, postMessage is an own property (WebIDL [Global]), so its descriptor is put back as it was.
  const original = scope ? Object.getOwnPropertyDescriptor(scope, "postMessage") : undefined;
  if (scope) Object.defineProperty(scope, "postMessage", { value: undefined, configurable: true, writable: true });
  try {
    return await import("unpdf/pdfjs");
  } finally {
    if (scope) {
      if (original) Object.defineProperty(scope, "postMessage", original);
      else delete scope.postMessage;
    }
  }
}
definePDFJSModule(loadPdfjs);

/** The fields of a PDF.js text item that extraction uses. `transform` is [a, b, c, d, x, y]. */
export type PdfItem = { str: string; transform: number[]; width: number; height: number };
/**
 * One text line on a page: the baseline y and height of its tallest item, and its text. On a page with
 * columns, `colStart` marks the first line of each column after the first in a block, and `alone` a
 * side-column heading (the only line of its column beside a column of several lines).
 */
export type PdfLine = { text: string; y: number; h: number; colStart?: true; alone?: true };

/** FR-3: a PDF averaging fewer Extracted Text characters per page than this is treated as scanned. */
export const MIN_CHARS_PER_PAGE = 100;

/** Rotated baseline: the x axis has a clear y component. Shear (synthetic italic sets c) is not rotation. */
const isRotated = (t: number[]) => Math.abs(t[1]) > 1e-3 * Math.hypot(t[0], t[1]);

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Lines of one page, top to bottom. Empty and rotated items are dropped. An item's height is its
 * `height`, else the length of its vertical vector, else the page median. An item joins a line when its
 * y is within half a height of the line's first item; inside a line, items are ordered by x with a
 * space at a gap over 0.15 h, and a gap over 2 h starts a new segment (columns).
 *
 * A page without such a split gives its lines top to bottom. On a page with splits, the split segments'
 * start x positions are clustered into column bands (a new band more than 2 h right of the previous start).
 * Each segment goes to the band it starts in; a segment that reaches into the next band is full width and
 * ends the block above it. Within a block each column is read top to bottom, left to right; a column with
 * a single line beside a column with several is a side-column heading (`alone`).
 */
export function pageLines(items: readonly PdfItem[]): PdfLine[] {
  const kept = items.filter((it) => it.str !== "" && !isRotated(it.transform));
  const raw = kept.map((it) => it.height || Math.hypot(it.transform[2], it.transform[3]));
  const fallback = median(raw.filter((h) => h > 0)) || 1;
  const placed = kept
    .map((it, i) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: raw[i] || fallback }))
    .sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: (typeof placed)[] = [];
  for (const item of placed) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - item.y) <= 0.5 * Math.max(row[0].h, item.h)) row.push(item);
    else rows.push([item]);
  }

  type Segment = { text: string; y: number; h: number; x: number; end: number };
  const segRows: Segment[][] = rows.map((row) => {
    // The line's y and h are its tallest item's, so a superscript that sorts first does not shift it.
    const { y, h } = row.reduce((a, b) => (b.h > a.h ? b : a));
    row.sort((a, b) => a.x - b.x);
    const segments: Segment[] = [];
    let seg: Segment | null = null;
    for (const item of row) {
      if (seg && item.x - seg.end > 2 * h) {
        segments.push(seg);
        seg = null;
      }
      if (!seg) seg = { text: item.str, y, h, x: item.x, end: item.x + item.w };
      else {
        if (item.x - seg.end > 0.15 * h) seg.text += " ";
        seg.text += item.str;
        seg.end = Math.max(seg.end, item.x + item.w);
      }
    }
    if (seg) segments.push(seg);
    return segments;
  });
  const toLine = ({ text, y, h }: Segment): PdfLine => ({ text, y, h });
  // Single column: lines top to bottom, as before columns were handled.
  if (segRows.every((r) => r.length < 2)) return segRows.flat().map(toLine);

  const tol = 2 * (median(segRows.flat().map((s) => s.h)) || 1);
  const starts = segRows
    .filter((r) => r.length > 1)
    .flatMap((r) => r.map((s) => s.x))
    .sort((a, b) => a - b);
  const bands: number[] = [];
  for (const x of starts) if (!bands.length || x - bands[bands.length - 1] > tol) bands.push(x);
  const bandOf = (x: number) => {
    let band = 0;
    bands.forEach((start, i) => {
      if (start <= x + tol) band = i;
    });
    return band;
  };

  const lines: PdfLine[] = [];
  let columns: Segment[][] = bands.map(() => []);
  const flushBlock = () => {
    const filled = columns.filter((c) => c.length);
    const tall = filled.some((c) => c.length > 1);
    filled.forEach((column, i) => {
      column.forEach((seg, j) => {
        const line = toLine(seg);
        if (i > 0 && j === 0) line.colStart = true;
        if (column.length === 1 && tall) line.alone = true;
        lines.push(line);
      });
    });
    columns = bands.map(() => []);
  };
  for (const row of segRows) {
    for (const seg of row) {
      const band = bandOf(seg.x);
      if (band + 1 < bands.length && seg.end > bands[band + 1]) {
        // Full width: ends the block of columns above it.
        flushBlock();
        lines.push(toLine(seg));
      } else columns[band].push(seg);
    }
  }
  flushBlock();
  return lines;
}

/** Repetition key: trimmed, lowercase, every digit run → "#" (so "Side 3 av 4" matches every page). */
const lineKey = (line: PdfLine) => line.text.trim().toLowerCase().replace(/\d+/g, "#");
const EDGE = 2;

/**
 * Removes running headers and footers: among the top 2 and bottom 2 lines of each page, a line whose key
 * occurs (once per page) on at least 2 pages and on at least half of all pages is dropped. Repeats until
 * nothing changes, so a two-line footer goes too. Numbered running heads are removed as well (accepted).
 */
export function removeRepeatedLines(pages: readonly PdfLine[][]): PdfLine[][] {
  let current = pages.map((lines) => [...lines]);
  for (;;) {
    const edgeKeys = current.map((lines) => {
      const keys = new Set<string>();
      lines.forEach((line, i) => {
        if (i < EDGE || i >= lines.length - EDGE) keys.add(lineKey(line));
      });
      return keys;
    });
    const counts = new Map<string, number>();
    for (const keys of edgeKeys) for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
    const repeated = new Set([...counts].filter(([, n]) => n >= 2 && n * 2 >= current.length).map(([key]) => key));
    if (!repeated.size) return current;
    current = current.map((lines) =>
      lines.filter((line, i) => !((i < EDGE || i >= lines.length - EDGE) && repeated.has(lineKey(line)))),
    );
  }
}

/** Spacing between consecutive lines of a page (same-y splits from side columns excluded). */
function spacings(lines: readonly PdfLine[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1].y - lines[i].y;
    if (gap > 0) gaps.push(gap);
  }
  return gaps;
}

/**
 * Raw paragraphs from the pages' lines. A paragraph breaks at a line gap of at least 1.3 × the page's
 * median line spacing (the document's when the page has fewer than 2 lines). A page break ends the
 * paragraph unless the page's last line lacks a final . ! ? or :; the start of a new column works the
 * same way. A side-column heading (`alone`) is a paragraph of its own. Lines join with "\n".
 */
export function toPdfParagraphs(pages: readonly PdfLine[][]): string[] {
  const docMedian = median(pages.flatMap(spacings));
  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length) paragraphs.push(current.join("\n"));
    current = [];
  };
  const endsSentence = () => current.length > 0 && /[.!?:]\s*$/.test(current[current.length - 1]);
  for (const lines of pages) {
    if (!lines.length) continue;
    const pageMedian = lines.length < 2 ? docMedian : median(spacings(lines)) || docMedian;
    if (endsSentence()) flush();
    lines.forEach((line, i) => {
      if (line.alone) {
        flush();
        current.push(line.text);
        flush();
        return;
      }
      if (line.colStart) {
        if (endsSentence()) flush();
      } else if (i > 0 && pageMedian > 0 && lines[i - 1].y - line.y >= 1.3 * pageMedian) flush();
      current.push(line.text);
    });
  }
  flush();
  return paragraphs;
}

/** Non-whitespace characters of all text items (rotated ones included), divided by the number of pages. */
export function textCharsPerPage(pages: readonly PdfItem[][]): number {
  if (!pages.length) return 0;
  let chars = 0;
  for (const items of pages) for (const { str } of items) chars += str.replace(/\s+/gu, "").length;
  return chars / pages.length;
}

/** Text items of every page. Throws on a corrupt or password-protected PDF (extractNote maps it to err.unreadable). */
export async function pdfPages(bytes: Uint8Array): Promise<PdfItem[][]> {
  // Copy: PDF.js may transfer (detach) the buffer it is given.
  const copy = new Uint8Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const pdf = await getDocumentProxy(copy);
  try {
    const pages: PdfItem[][] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      pages.push(
        content.items.flatMap((item) =>
          "str" in item ? [{ str: item.str, transform: item.transform, width: item.width, height: item.height }] : [],
        ),
      );
      page.cleanup();
    }
    return pages;
  } finally {
    pdf.loadingTask.destroy().catch(() => {});
  }
}
