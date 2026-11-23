// Extraction pipeline rules (AD-8), shared by every file type and by scripts/export-passages.ts:
// lines → paragraphs → Normalization → sentence split → Passages p1…pn. Pure; fixed by passages.test.ts.
// Any change to a rule or to PASSAGE_LIMIT changes Note Hashes: bump NORMALIZATION_VERSION with it.
import { normalize } from "./normalize";
import type { Passage } from "./types";

export const NORMALIZATION_VERSION = 1;
/** Paragraphs longer than this (in characters, after Normalization) are packed into several Passages. */
export const PASSAGE_LIMIT = 800;
/** FR-3 word limits, counted on the final Passages. */
export const MIN_WORDS = 150;
export const MAX_WORDS = 15_000;

const BLOCKQUOTE = /^\s*(?:>\s?)+/;
const HEADING = /^\s{0,3}#{1,6}(?:\s+|$)/;
/** Optional closing sequence of an ATX heading: `## Tittel ##`. */
const HEADING_CLOSE = /(?:^|\s+)#+\s*$/;
/** Thematic break or setext underline: `---`, `***`, `___`, `===`, `- - -`, `* * *`. */
const BREAK = /^\s*([-*_=])(?:\s*\1){2,}\s*$/;
const BULLET = /^\s*[-*+]\s+/;
const ORDERED = /^\s*\d+[.)]\s+/;
const TABLE_ROW = /^\s*\|/;
const TABLE_DELIMITER = /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-*:?\s*$/;

/**
 * Splits text into raw paragraphs. A blank line ends a paragraph; other lines join (with "\n",
 * so Normalization can rejoin hyphenated words). A list item, a table row or a heading starts a
 * new paragraph; a heading is a paragraph of its own. `#`, bullet and `>` markers are dropped;
 * ordered numbers and inline markup stay. Table delimiter rows (`|---|---|`) are dropped. A table row
 * is a paragraph of its own. Thematic breaks and setext underlines end the paragraph and are dropped.
 */
export function toParagraphs(text: string): string[] {
  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length) paragraphs.push(current.join("\n"));
    current = [];
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(BLOCKQUOTE, "");
    if (!line.trim()) {
      flush();
      continue;
    }
    if (HEADING.test(line)) {
      flush();
      current.push(line.replace(HEADING, "").replace(HEADING_CLOSE, ""));
      flush();
      continue;
    }
    if (TABLE_DELIMITER.test(line)) continue;
    if (BREAK.test(line)) {
      flush();
      continue;
    }
    if (TABLE_ROW.test(line)) {
      flush();
      current.push(line);
      flush();
      continue;
    }
    if (BULLET.test(line)) {
      flush();
      current.push(line.replace(BULLET, ""));
      continue;
    }
    if (ORDERED.test(line)) flush();
    current.push(line);
  }
  flush();
  return paragraphs;
}

/** Sentence boundary: after . ! ? … and a space, before an uppercase letter, a digit or a quote. */
const SENTENCE_BREAK = /(?<=[.!?…]) (?=[\p{Lu}\p{N}"'])/u;

/** Splits normalized text into sentences (regex only, so Node and every browser agree). */
export function splitSentences(text: string): string[] {
  return text.split(SENTENCE_BREAK).filter((s) => s !== "");
}

/** Greedy packing: as many whole sentences as fit in PASSAGE_LIMIT; an over-long sentence stays whole. */
function pack(paragraph: string): string[] {
  if (paragraph.length <= PASSAGE_LIMIT) return [paragraph];
  const chunks: string[] = [];
  let chunk = "";
  for (const sentence of splitSentences(paragraph)) {
    if (!chunk) chunk = sentence;
    else if (chunk.length + 1 + sentence.length <= PASSAGE_LIMIT) chunk += ` ${sentence}`;
    else {
      chunks.push(chunk);
      chunk = sentence;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

/** Normalizes raw paragraphs and turns them into Passages with IDs p1…pn. Paragraphs without a letter or digit are dropped. */
export function toPassages(paragraphs: readonly string[]): Passage[] {
  return paragraphs
    .map(normalize)
    .filter((p) => /[\p{L}\p{N}]/u.test(p))
    .flatMap(pack)
    .map((text, i) => ({ id: `p${i + 1}`, text }));
}

/** Words = whitespace-separated tokens that contain a letter or a digit. */
export function countWords(passages: readonly Passage[]): number {
  let words = 0;
  for (const { text } of passages) {
    for (const token of text.split(/\s+/)) if (/[\p{L}\p{N}]/u.test(token)) words++;
  }
  return words;
}
