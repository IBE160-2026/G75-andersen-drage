// Story 1.8: StudySet.language allow-list (spec 1.8, Design Notes).
import { describe, expect, it } from "vitest";
import { checkLanguage, LANGUAGE_ALLOW_LIST } from "./language";

describe("checkLanguage", () => {
  it.each([
    ["nb", "nb"],
    ["NB-no", "nb"],
    ["en_US", "en"],
    ["xx", "und"],
    ["", "und"],
    ["  sv-SE ", "sv"],
    ["-nb", "und"],
  ])("%j → %s", (tag, expected) => {
    expect(checkLanguage(tag)).toBe(expected);
  });

  it("accepts every allow-listed primary subtag", () => {
    for (const lang of LANGUAGE_ALLOW_LIST) expect(checkLanguage(lang.toUpperCase())).toBe(lang);
  });
});
