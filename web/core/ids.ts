// Identity (AD-9): the one place Key Concept IDs, Item IDs and the cache key are built.
// The Note Hash itself lives in noteHash.ts.
import { normalize } from "./normalize";

/** `k-` + slug of the name, or null when the slug is empty (the concept is then dropped). */
export function keyConceptId(name: string): string | null {
  const slug = normalize(name)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? null : `k-${slug}`;
}

/** `n` is the 1-based position in the raw list, assigned before any drop. */
export function flashcardId(keyConceptId: string, n: number): string {
  return `${keyConceptId}.fc${n}`;
}

export function quizQuestionId(keyConceptId: string, n: number): string {
  return `${keyConceptId}.qq${n}`;
}

export function summaryPointId(n: number): string {
  return `sp${n}`;
}

export function cacheKey(noteHash: string, promptVersion: string, model: string): string {
  return `${noteHash}:${promptVersion}:${model}`;
}

const DEMO_PREFIX = "demo:";

/**
 * AD-9, Story 1.14: Demo records are separate from live ones for the same Note. Applied to the Note
 * Hash (Note key and route `/notat/demo:{noteHash}`) and to the cache key (`demo:{noteHash}:{pv}:{model}`).
 */
export function demoKey(key: string): string {
  return `${DEMO_PREFIX}${key}`;
}

/** The bare Note Hash of a Note key (live or `demo:`), as sent in a POST. */
export function bareNoteHash(noteKey: string): string {
  return noteKey.startsWith(DEMO_PREFIX) ? noteKey.slice(DEMO_PREFIX.length) : noteKey;
}

/**
 * Story 2.1: a version 4 UUID from 16 random bytes (RFC 9562), for `roundId` where `crypto.randomUUID`
 * is missing: browsers expose it only in a secure context, and the app may be opened over plain http
 * on another host name (the e2e run uses http://web-test:3000). Does not mutate `bytes`.
 */
export function uuidFromBytes(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw new RangeError("uuidFromBytes needs 16 bytes");
  const b = Uint8Array.from(bytes);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
