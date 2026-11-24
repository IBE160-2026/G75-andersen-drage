// Story 1.8: AD-9 identity helpers.
import { describe, expect, it } from "vitest";
import { bareNoteHash, cacheKey, demoKey, flashcardId, keyConceptId, quizQuestionId, summaryPointId } from "./ids";

describe("keyConceptId", () => {
  it("builds k- + slug: lowercased, non-letter/digit runs → -, ends trimmed", () => {
    expect(keyConceptId("Fotosyntese i C4-planter")).toBe("k-fotosyntese-i-c4-planter");
    expect(keyConceptId("  Celle-ånding  ")).toBe("k-celle-ånding");
    expect(keyConceptId("(Mitose) – fase 2!")).toBe("k-mitose-fase-2");
  });

  it("gives colliding names the same ID", () => {
    expect(keyConceptId("Celle-ånding")).toBe(keyConceptId("celle ånding"));
  });

  it("normalizes first (NFKC): full-width letters and ligatures fold", () => {
    expect(keyConceptId("ＡＢＣ ﬁ")).toBe("k-abc-fi");
  });

  it("returns null for an empty slug", () => {
    expect(keyConceptId("???")).toBeNull();
    expect(keyConceptId("")).toBeNull();
    expect(keyConceptId(" - ")).toBeNull();
  });
});

describe("Item IDs and cache key", () => {
  it("builds .fc{n}, .qq{n}, sp{n}", () => {
    expect(flashcardId("k-a", 2)).toBe("k-a.fc2");
    expect(quizQuestionId("k-a", 1)).toBe("k-a.qq1");
    expect(summaryPointId(6)).toBe("sp6");
  });

  it("builds {noteHash}:{promptVersion}:{model}", () => {
    expect(cacheKey("abc", "v1", "anthropic/claude-haiku-5.5")).toBe("abc:v1:anthropic/claude-haiku-5.5");
  });
});

describe("demoKey / bareNoteHash (Story 1.14)", () => {
  const hash = "a".repeat(64);
  it("prefixes demo: to a Note Hash and to a cache key", () => {
    expect(demoKey(hash)).toBe(`demo:${hash}`);
    expect(demoKey(cacheKey(hash, "2", "anthropic/claude-haiku-5.5"))).toBe(`demo:${hash}:2:anthropic/claude-haiku-5.5`);
  });

  it("strips demo: back to the bare Note Hash; a live key is unchanged", () => {
    expect(bareNoteHash(demoKey(hash))).toBe(hash);
    expect(bareNoteHash(hash)).toBe(hash);
  });
});
