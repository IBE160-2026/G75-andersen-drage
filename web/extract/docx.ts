// .docx extraction (Story 1.5, AD-8): mammoth turns the Word file into HTML, htmlparser2 walks it into
// raw paragraphs for toPassages (core/passages.ts). Runs inside the extraction Web Worker.
// Any change to a rule here changes Note Hashes: bump NORMALIZATION_VERSION with it
// (the Note Hash snapshots in reference-notes.test.ts catch it).
// Not extracted in v1: Word equations (OMML) and Word headers/footers (mammoth drops both).
import { Parser } from "htmlparser2";
import mammoth from "mammoth";

const BLOCKS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li"]);
/** Opening one of these ends the current paragraph (an `li` ends at a nested list, a `p` or a table). */
const BREAKS_BEFORE = new Set([...BLOCKS, "ul", "ol", "table"]);
/** Footnote and endnote back-links ("↑") that mammoth adds after each note. */
const BACK_LINK = /^#(?:footnote|endnote)-ref/;

type Cell = { blocks: string[]; buf: string };
type Table = { row: string[] | null; cell: Cell | null };

/**
 * Splits mammoth's HTML into raw paragraphs: one per `p`, `h1`–`h6`, `li` and table row. A row is its
 * cells' texts joined by " | " (blocks in a cell joined by a space, an empty cell is ""; a merged cell
 * appears once, as mammoth writes it). `br` becomes "\n"; text outside any block joins the current
 * paragraph; footnote back-links are dropped, the `[n]` markers stay; images give nothing. Pure.
 */
export function htmlToParagraphs(html: string): string[] {
  const paragraphs: string[] = [];
  const tables: Table[] = [];
  let buf = "";
  /** Depth of open back-link `a` elements whose text is dropped. */
  let skip = 0;
  /** Depth of `a` elements opened inside a back-link, so its own `</a>` is found. */
  const anchors: boolean[] = [];

  const cellOf = () => tables[tables.length - 1]?.cell ?? null;
  const endBlock = () => {
    const cell = cellOf();
    if (cell) {
      if (cell.buf.trim()) cell.blocks.push(cell.buf.trim());
      cell.buf = "";
    } else {
      if (buf.trim()) paragraphs.push(buf);
      buf = "";
    }
  };
  const write = (text: string) => {
    const cell = cellOf();
    if (cell) cell.buf += text;
    else buf += text;
  };

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        if (name === "a") {
          const back = BACK_LINK.test(attribs.href ?? "");
          anchors.push(back);
          if (back) skip++;
          return;
        }
        if (name === "br") {
          write("\n");
          return;
        }
        if (BREAKS_BEFORE.has(name)) endBlock();
        if (name === "table") tables.push({ row: null, cell: null });
        const table = tables[tables.length - 1];
        if (!table) return;
        if (name === "tr") table.row = [];
        else if (name === "td" || name === "th") table.cell = { blocks: [], buf: "" };
      },
      ontext(text) {
        if (!skip) write(text);
      },
      onclosetag(name) {
        if (name === "a") {
          if (anchors.pop()) skip--;
          return;
        }
        if (BLOCKS.has(name)) {
          endBlock();
          return;
        }
        const table = tables[tables.length - 1];
        if (!table) return;
        if (name === "td" || name === "th") {
          if (table.cell) {
            endBlock();
            table.row?.push(table.cell.blocks.join(" "));
            table.cell = null;
          }
        } else if (name === "tr") {
          if (table.row) {
            const text = table.row.join(" | ");
            table.row = null;
            // A row of a nested table is one block of the outer cell.
            const outer = tables.length > 1 ? tables[tables.length - 2].cell : null;
            if (outer) outer.blocks.push(text);
            else paragraphs.push(text);
          }
        } else if (name === "table") {
          tables.pop();
        }
      },
    },
    { decodeEntities: true },
  );
  parser.write(html);
  parser.end();
  endBlock();
  return paragraphs;
}

/** Raw paragraphs of a .docx file. Throws on a corrupt or non-Word file (extractNote maps it to err.unreadable). */
export async function docxParagraphs(bytes: Uint8Array): Promise<string[]> {
  // Copy, so the parser never sees (or detaches) the caller's buffer.
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  // The browser build reads `arrayBuffer`, the Node build (Vitest) reads `buffer`; both accept an ArrayBuffer.
  const input = { arrayBuffer: copy, buffer: copy } as unknown as { arrayBuffer: ArrayBuffer };
  const { value } = await mammoth.convertToHtml(input);
  return htmlToParagraphs(value);
}
