// Normalization (AD-8): the one text clean-up every Passage and every Quote goes through.
// Pure and deterministic. Order: NFKC → hyphen rejoin → collapse whitespace → unify quotes.
// Story 1.8's Quote Check normalizes Quotes with this same function.

// Invisible characters are removed first: soft hyphen, zero-width space/non-joiner/joiner, word joiner, BOM.
const INVISIBLE = /[­​-‍⁠﻿]/g;

// NFKC would expand ″ ‴ (double/triple prime) and ‶ ‷ (reversed primes) into several primes, so they
// are mapped to " first (spec 1.4, Implementation Notes).
const MULTI_PRIME = /[″‴‶‷]/g;

// `letter-` (or U+2010 hyphen) at a line end + a lowercase letter on the next line → one word
// ("arbeids-\nmåte" → "arbeidsmåte"), except when the next word is og/eller/and/or
// ("fotball-\nog håndball" keeps its hyphen).
const HYPHEN_BREAK = /(\p{L})[-‐][^\S\n]*\n[^\S\n]*(?!(?:og|eller|and|or)(?![\p{L}\p{N}]))(?=\p{Ll})/gu;

// “ ” „ ‟ « » ″ ‴ ‶ ‷
const DOUBLE_QUOTES = /[“”„‟«»″‴‶‷]/g;
// ‘ ’ ‚ ‛ ′
const SINGLE_QUOTES = /[‘’‚‛′]/g;

export function normalize(text: string): string {
  return text
    .replace(INVISIBLE, "")
    .replace(MULTI_PRIME, '"')
    .normalize("NFKC")
    .replace(HYPHEN_BREAK, "$1")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(DOUBLE_QUOTES, '"')
    .replace(SINGLE_QUOTES, "'");
}
