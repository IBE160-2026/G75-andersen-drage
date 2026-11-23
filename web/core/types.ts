// Browser-only types (AD-6). The Proxy contract lives in api/schema.d.ts.

/** One unit of the Note's text: `p1…pn`, the only text the app shows, cites or hashes (AD-8). */
export type Passage = { id: string; text: string };

/** The extraction pipeline's output for one file (Story 1.4). Stored with the Note from Story 1.9. */
export type ExtractedNote = {
  fileName: string;
  passages: Passage[];
  wordCount: number;
  normalizationVersion: number;
  /** True when the bytes were not valid UTF-8 and were decoded as windows-1252 (`warn.encoding`). */
  encodingFallback: boolean;
};
