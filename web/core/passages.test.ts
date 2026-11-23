// Extraction pipeline rules (AD-8, spec 1.4 Design Notes): paragraphs, Passages, word count.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalize } from "./normalize";
import {
  countWords,
  MAX_WORDS,
  MIN_WORDS,
  NORMALIZATION_VERSION,
  PASSAGE_LIMIT,
  splitSentences,
  toParagraphs,
  toPassages,
} from "./passages";

const texts = (text: string) => toPassages(toParagraphs(text)).map((p) => p.text);

describe("constants", () => {
  it("fixes version, Passage limit and word limits", () => {
    expect(NORMALIZATION_VERSION).toBe(1);
    expect(PASSAGE_LIMIT).toBe(800);
    expect(MIN_WORDS).toBe(150);
    expect(MAX_WORDS).toBe(15_000);
  });
});

describe("toParagraphs", () => {
  it("splits lines on \\n and \\r\\n; a blank line ends a paragraph; other lines join", () => {
    expect(texts("en\nto\r\ntre\n\nfire\r\n   \r\nfem")).toEqual(["en to tre", "fire", "fem"]);
  });

  it("starts a new paragraph at each list item and drops bullet markers", () => {
    expect(texts("Intro\n- en\n* to\n+ tre\nfortsatt tre")).toEqual(["Intro", "en", "to", "tre fortsatt tre"]);
  });

  it("starts a new paragraph at ordered items and keeps their numbers", () => {
    expect(texts("Liste:\n1. en\n2) to")).toEqual(["Liste:", "1. en", "2) to"]);
  });

  it("makes a heading its own paragraph and drops the # markers", () => {
    expect(texts("# Tittel\nTekst\n## Under\n### 3.1 Roller")).toEqual(["Tittel", "Tekst", "Under", "3.1 Roller"]);
  });

  it("drops > markers and joins quoted lines", () => {
    expect(texts("> Som student\n> vil jeg\n>\n> > nestet")).toEqual(["Som student vil jeg", "nestet"]);
  });

  it("keeps inline markup and does not treat *emphasis* or #tags as markers", () => {
    expect(texts("*kursiv* start\n**fet** neste\n#emneknagg")).toEqual(["*kursiv* start **fet** neste #emneknagg"]);
  });

  it("makes each table row its own paragraph and drops delimiter rows", () => {
    expect(texts("| | Scrum | Kanban |\n|---|---|---|\n| Rytme | Sprinter | Flyt |")).toEqual([
      "| | Scrum | Kanban |",
      "| Rytme | Sprinter | Flyt |",
    ]);
  });

  it("keeps a line after a table row as its own paragraph", () => {
    expect(texts("| a | b |\nTekst\nmer")).toEqual(["| a | b |", "Tekst mer"]);
  });

  it.each(["---", "***", "___", "===", "- - -", "* * *", "  ----  "])(
    "drops the break line %j and ends the paragraph there",
    (rule) => {
      expect(texts(`Før\nlinje\n${rule}\nEtter`)).toEqual(["Før linje", "Etter"]);
    },
  );

  it("strips the closing #s of a heading", () => {
    expect(texts("## Tittel ##\n# C# #\n### Bare #")).toEqual(["Tittel", "C#", "Bare"]);
  });

  it("drops Passages without a letter or digit", () => {
    expect(texts("Tekst\n\n- -\n\n** --\n\n…")).toEqual(["Tekst"]);
  });

  it("rejoins a hyphenated word across joined lines", () => {
    expect(texts("en arbeids-\nmåte som\nvirker")).toEqual(["en arbeidsmåte som virker"]);
  });

  it("returns nothing for empty or whitespace-only text", () => {
    expect(texts("")).toEqual([]);
    expect(texts(" \n\t\n \r\n")).toEqual([]);
  });
});

describe("splitSentences", () => {
  it("splits after . ! ? … before an uppercase letter, a digit or a quote", () => {
    expect(splitSentences(`Én. To! Tre? Fire… 5 er tall. "Sitat" her. 'Enkelt' her.`)).toEqual([
      "Én.",
      "To!",
      "Tre?",
      "Fire…",
      "5 er tall.",
      `"Sitat" her.`,
      `'Enkelt' her.`,
    ]);
  });

  it("does not split before a lowercase letter", () => {
    expect(splitSentences("Ca. tre ganger, dvs. ofte.")).toEqual(["Ca. tre ganger, dvs. ofte."]);
  });

  it("splits after f.eks. before an uppercase word (accepted)", () => {
    expect(splitSentences("Bruk f.eks. Scrum her.")).toEqual(["Bruk f.eks.", "Scrum her."]);
  });
});

describe("toPassages", () => {
  /** A sentence of exactly `len` characters. */
  const sentence = (n: number, len: number) => {
    const head = `Setning ${n} `;
    return `${head}${"x".repeat(len - head.length - 1)}.`;
  };

  it("numbers Passages p1…pn", () => {
    expect(toPassages(["a", "b", "c"]).map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("normalizes each paragraph and drops empty ones", () => {
    expect(toPassages(["  “a”  ", " ", "b"])).toEqual([
      { id: "p1", text: '"a"' },
      { id: "p2", text: "b" },
    ]);
  });

  it("keeps a paragraph of exactly PASSAGE_LIMIT characters whole", () => {
    const p = [sentence(1, 399), sentence(2, 400)].join(" ");
    expect(p.length).toBe(PASSAGE_LIMIT);
    expect(toPassages([p]).map((x) => x.text)).toEqual([p]);
  });

  it("packs a longer paragraph greedily by sentence, each Passage ≤ PASSAGE_LIMIT", () => {
    const sentences = Array.from({ length: 10 }, (_, i) => sentence(i, 300));
    const passages = toPassages([sentences.join(" ")]);
    expect(passages.map((p) => p.text)).toEqual([0, 2, 4, 6, 8].map((i) => sentences.slice(i, i + 2).join(" ")));
    for (const p of passages) expect(p.text.length).toBeLessThanOrEqual(PASSAGE_LIMIT);
  });

  it("fills a Passage up to exactly PASSAGE_LIMIT before starting the next", () => {
    const [a, b, c] = [sentence(1, 399), sentence(2, 400), sentence(3, 20)];
    expect(toPassages([[a, b, c].join(" ")]).map((p) => p.text)).toEqual([`${a} ${b}`, c]);
  });

  it("keeps an over-long sentence whole", () => {
    const long = sentence(1, 1200);
    const passages = toPassages([`Kort. ${long} Slutt.`]);
    expect(passages.map((p) => p.text)).toEqual(["Kort.", long, "Slutt."]);
  });

  it("never lets a Passage span paragraphs", () => {
    expect(toPassages(["Én.", "To."]).map((p) => p.text)).toEqual(["Én.", "To."]);
  });
});

describe("countWords", () => {
  it("counts whitespace tokens that contain a letter or a digit", () => {
    expect(countWords(toPassages(["Én to – tre · 4 ... ** æøå", "| Rytme | Flyt |"]))).toBe(7);
  });

  it("is 0 for no Passages", () => {
    expect(countWords([])).toBe(0);
  });
});

describe("reference note nb-smidig-scrum.md (smoke test)", () => {
  const md = readFileSync(new URL("../../reference-notes/nb-smidig-scrum.md", import.meta.url), "utf8");
  const passages = toPassages(toParagraphs(md));

  it("gives normalized Passages without Markdown markers and a word count inside FR-3", () => {
    expect(passages.length).toBeGreaterThan(10);
    expect(passages[0]).toEqual({ id: "p1", text: "Smidig utvikling og Scrum – mine notater" });
    for (const p of passages) {
      expect(p.text).toBe(normalize(p.text));
      expect(p.text).not.toMatch(/^(#|[-*+] |>)/);
      expect(p.text.length).toBeLessThanOrEqual(PASSAGE_LIMIT);
    }
    const words = countWords(passages);
    expect(words).toBeGreaterThanOrEqual(MIN_WORDS);
    expect(words).toBeLessThanOrEqual(MAX_WORDS);
  });

  it("is the same with \\r\\n line endings", () => {
    expect(toPassages(toParagraphs(md.replace(/\r?\n/g, "\r\n")))).toEqual(passages);
  });
});
