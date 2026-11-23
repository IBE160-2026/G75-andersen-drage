// Normalization rules (AD-8, spec 1.4 Design Notes). Story 1.8's Quote Check reuses normalize().
import { describe, expect, it } from "vitest";
import { normalize } from "./normalize";

describe("normalize", () => {
  it("applies NFKC (ligatures, full-width forms, non-breaking spaces)", () => {
    expect(normalize("ﬁnne")).toBe("finne");
    expect(normalize("ＡＢＣ１")).toBe("ABC1");
    expect(normalize("15 000")).toBe("15 000");
    // Composed and decomposed å are the same text.
    expect(normalize("å")).toBe("å");
  });

  it("rejoins a word hyphenated across a line break before a lowercase letter", () => {
    expect(normalize("arbeids-\nmåte")).toBe("arbeidsmåte");
    expect(normalize("arbeids-  \n  måte er")).toBe("arbeidsmåte er");
  });

  it("keeps the hyphen before og/eller/and/or", () => {
    expect(normalize("fotball-\nog håndball")).toBe("fotball- og håndball");
    expect(normalize("vår-\neller høstsemester")).toBe("vår- eller høstsemester");
    expect(normalize("pre-\nand post")).toBe("pre- and post");
    expect(normalize("full-\nor part-time")).toBe("full- or part-time");
    // Only the whole word counts: "ordning" starts with "or" but is joined.
    expect(normalize("arbeids-\nordning")).toBe("arbeidsordning");
  });

  it("does not rejoin before an uppercase letter or a digit, or without a letter before the hyphen", () => {
    expect(normalize("Nord-\nNorge")).toBe("Nord- Norge");
    expect(normalize("side-\n2")).toBe("side- 2");
    expect(normalize("2-\nveis")).toBe("2- veis");
    expect(normalize("ord - \nneste")).toBe("ord - neste");
  });

  it("collapses all whitespace to single spaces and trims", () => {
    expect(normalize("  en\t\tto\n\ntre\r\n fire  ")).toBe("en to tre fire");
  });

  it("unifies double and single quotes", () => {
    expect(normalize("“a” „b‟ «c» ″d″")).toBe('"a" "b" "c" "d"');
    expect(normalize("‘a’ ‚b‛ ′c′")).toBe("'a' 'b' 'c'");
  });

  it("removes soft hyphens, zero-width characters, word joiners and BOMs", () => {
    expect(normalize("ar­beids​må‌te‍ ⁠ok﻿")).toBe("arbeidsmåte ok");
  });

  it("rejoins a U+2010 hyphen at a line end like -", () => {
    expect(normalize("arbeids‐\nmåte")).toBe("arbeidsmåte");
    expect(normalize("fotball‐\nog håndball")).toBe("fotball‐ og håndball");
  });

  it("maps ‴ ‶ ‷ to a single \" before NFKC can expand them", () => {
    expect(normalize("‴a‴ ‶b‷")).toBe('"a" "b"');
  });

  it("keeps inline markup", () => {
    expect(normalize("**fet** og *kursiv* og `kode`")).toBe("**fet** og *kursiv* og `kode`");
  });

  it("is idempotent", () => {
    const once = normalize("“Smidig” arbeids-\nmåte  ﬁnnes");
    expect(normalize(once)).toBe(once);
  });
});
