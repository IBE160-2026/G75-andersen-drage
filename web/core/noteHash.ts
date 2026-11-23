// Note Hash (AD-9): SHA-256, lowercase hex, of the Passage texts joined by a blank line.
// Depends only on the Passages, so the file name never changes it.
import { sha256Hex } from "./sha256";
import type { Passage } from "./types";

export const PASSAGE_SEPARATOR = "\n\n";

export function noteHash(passages: readonly Passage[]): string {
  return sha256Hex(new TextEncoder().encode(passages.map((p) => p.text).join(PASSAGE_SEPARATOR)));
}
