// Story 1.11: Notatoversikt with summary, Key Concepts and source panel (spec I/O & Edge-Case Matrix;
// FR-6, FR-10–12, NFR-6, NFR-7). Story 1.12's reference jump (FR-12, UX-DR10, UX-DR11) is at the end. Records are seeded straight into IndexedDB; the only POST ('Prøv igjen'
// after err.noConcepts) is stubbed, so nothing reaches the provider.
import { createHash } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { seedConsent, seedNoteRecords, type SeedNote, type SeedPassage, type SeedStudySet } from "./seed";

const MODEL = "anthropic/claude-haiku-5.5";
const PROMPT_VERSION = "2";
const BRAND = "Torsas læringsassistent";
const TITLE = "Forelesning 7 – normalformer";
const FILE_NAME = `${TITLE}.md`;
const MSG = {
  summary: "Sammendrag",
  concepts: "Nøkkelbegreper",
  notCovered: "ingen verifiserte elementer",
  start: "Start runde",
  startHint: "Usikre begreper kommer først.",
  noConcepts: "Fant ingen nøkkelbegreper med verifisert kilde, så runden kan ikke starte.",
  retry: "Prøv igjen",
  generating: "Lager kort og quiz",
  missing: "Fant ikke notatet",
  study: "Studier",
  source: "Kilde",
};

const PASSAGES: SeedPassage[] = [
  "Normalisering er en metode for å organisere tabeller i en relasjonsdatabase slik at data ikke lagres dobbelt.",
  "Første normalform krever at hver celle i tabellen inneholder én enkelt verdi og at det ikke finnes gjentatte grupper.",
  "Andre normalform krever første normalform og at alle ikke-nøkkelattributter avhenger av hele primærnøkkelen.",
  "Tredje normalform fjerner transitive avhengigheter, slik at ikke-nøkkelattributter bare avhenger av nøkkelen.",
  "En funksjonell avhengighet betyr at verdien av ett attributt bestemmer verdien av et annet attributt entydig.",
  "Denormalisering brukes noen ganger bevisst for å gjøre spørringer raskere, på bekostning av mer redundans.",
  "Boyce-Codd normalform er en strengere variant av tredje normalform der hver determinant må være en kandidatnøkkel.",
].map((text, i) => ({ id: `p${i + 1}`, text }));

const NOTE_HASH = createHash("sha256")
  .update(PASSAGES.map((p) => p.text).join("\n\n"), "utf8")
  .digest("hex");
const CACHE_KEY = `${NOTE_HASH}:${PROMPT_VERSION}:${MODEL}`;
const quote = (p: SeedPassage) => p.text.slice(0, 60);

const NOTE: SeedNote = {
  noteHash: NOTE_HASH,
  title: TITLE,
  sourceType: "md",
  wordCount: 120,
  passages: PASSAGES,
  normalizationVersion: 1,
  currentCacheKey: CACHE_KEY,
  archived: false,
  importanceLevel: 2,
  lastPractisedAt: null,
};

/** Stored order is deliberately not rank order; "Denormalisering" (rank 4) is not covered. */
const CONCEPTS = [
  { name: "Tredje normalform", rank: 3, passage: 3 },
  { name: "Normalisering", rank: 1, passage: 0 },
  { name: "Første normalform", rank: 2, passage: 1 },
  { name: "Funksjonell avhengighet", rank: 5, passage: 4 },
  { name: "Denormalisering", rank: 4, passage: 5 },
];
const RANK_ORDER = [...CONCEPTS].sort((a, b) => a.rank - b.rank).map((c) => c.name);

function studySet({ language = "nb", covered = (name: string) => name !== "Denormalisering" } = {}): SeedStudySet {
  return {
    cacheKey: CACHE_KEY,
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    language,
    summaryPoints: PASSAGES.slice(0, 5).map((p, i) => ({
      id: `sp${i + 1}`,
      text: `Sammendragspunkt ${i + 1}.`,
      passageId: p.id,
      quote: quote(p),
    })),
    concepts: CONCEPTS.map((c, i) => {
      const id = `k-${i + 1}`;
      const p = PASSAGES[c.passage];
      const isCovered = covered(c.name);
      return {
        id,
        name: c.name,
        centralityRank: c.rank,
        covered: isCovered,
        flashcards: isCovered ? [{ id: `${id}.fc1`, front: "Hva?", back: "Se kilden.", passageId: p.id, quote: quote(p) }] : [],
        quizQuestions: isCovered
          ? [{ id: `${id}.qq1`, question: "Hva?", options: ["A", "B", "C", "D"], correctIndex: 0, passageId: p.id, quote: quote(p) }]
          : [],
      };
    }),
  };
}

/** A raw Proxy StudySet whose Quotes pass the Quote Check (as in generate.spec.ts). */
function rawStudySetFor(passages: SeedPassage[]) {
  const usable = passages.slice(0, 6);
  return {
    concepts: usable.slice(0, 5).map((p, i) => ({
      name: `Begrep ${i + 1}`,
      centralityRank: i + 1,
      flashcards: [{ front: `Hva er begrep ${i + 1}?`, back: "Se kilden.", passageId: p.id, quote: quote(p) }],
      quizQuestions: [
        {
          question: `Hva gjelder begrep ${i + 1}?`,
          options: ["Alternativ A", "Alternativ B", "Alternativ C", "Alternativ D"],
          correctIndex: 0,
          passageId: p.id,
          quote: quote(p),
        },
      ],
    })),
    summaryPoints: usable.slice(0, 5).map((p, i) => ({ text: `Punkt ${i + 1}.`, passageId: p.id, quote: quote(p) })),
    language: "nb",
    model: MODEL,
    promptVersion: PROMPT_VERSION,
  };
}

async function axeBlocking(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

async function openOverview(page: Page, set: SeedStudySet | null = studySet(), width = 1280) {
  await page.setViewportSize({ width, height: 800 });
  await seedConsent(page, "accepted");
  await page.goto("/innstillinger");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await seedNoteRecords(page, NOTE, set);
  await page.goto(`/notat/${NOTE_HASH}`);
}

const h1 = (page: Page) => page.getByRole("heading", { level: 1, name: TITLE });
const region = (page: Page) => page.getByRole("region", { name: `Kilde · ${FILE_NAME}` });
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("desktop: title, study panel and source panel side by side, source on the left, DOM main → aside", async ({ page }) => {
  await openOverview(page);
  await expect(h1(page)).toBeFocused();
  await expect(page).toHaveTitle(`${TITLE} · ${BRAND}`);
  await expect(page.getByRole("banner")).toContainText(TITLE);

  // Landmarks: header → main → aside, and the aside is a sibling of main.
  const dom = await page.evaluate(() => {
    const main = document.querySelector("main")!;
    const aside = document.querySelector("aside")!;
    return {
      order: [...document.body.querySelectorAll("header, main, aside")].map((el) => el.tagName.toLowerCase()),
      siblings: main.parentElement === aside.parentElement && main.nextElementSibling === aside,
    };
  });
  expect(dom).toEqual({ order: ["header", "main", "aside"], siblings: true });
  const aside = page.getByRole("complementary", { name: `Kilde: ${FILE_NAME}` });
  await expect(aside).toBeVisible();
  await expect(aside).toContainText(`Kilde · ${FILE_NAME}`);

  // Visual order: source panel left, study panel right, about 1 : 1.15.
  const mainBox = (await page.locator("main").boundingBox())!;
  const asideBox = (await aside.boundingBox())!;
  expect(asideBox.x + asideBox.width).toBeLessThanOrEqual(mainBox.x + 1);
  expect(mainBox.width / asideBox.width).toBeGreaterThan(1.1);
  expect(mainBox.width / asideBox.width).toBeLessThan(1.2);

  // Study panel: summary with Quote blocks and source references, then concepts by Centrality Rank.
  const main = page.locator("main");
  await expect(main.getByRole("heading", { level: 2 })).toHaveText([MSG.summary, MSG.concepts]);
  await expect(main.locator("figure")).toHaveCount(5);
  await expect(main.locator("figure blockquote").first()).toHaveText(quote(PASSAGES[0]));
  await expect(main.locator("figure figcaption").first()).toHaveText("Kilde: P1");
  await expect(main.getByRole("link", { name: /Kilde/ })).toHaveCount(0);
  const concepts = main.locator("section").nth(1).getByRole("listitem");
  await expect(concepts).toHaveCount(5);
  for (const [i, name] of RANK_ORDER.entries()) await expect(concepts.nth(i)).toContainText(name);
  await expect(concepts.filter({ hasText: "Denormalisering" })).toContainText(MSG.notCovered);
  await expect(concepts.filter({ hasText: "Denormalisering" }).getByText("ny", { exact: true })).toHaveCount(0);
  await expect(main.getByText("ny", { exact: true })).toHaveCount(4);

  // 'Start runde' at the end, aria-disabled, with its hint.
  const start = page.getByRole("button", { name: MSG.start });
  await expect(start).toHaveAttribute("aria-disabled", "true");
  await expect(start).toHaveAccessibleDescription(MSG.startHint);

  // Generated content and Passage text carry the Study Set language; UI text stays bokmål.
  await expect(main.locator("blockquote p[lang]").first()).toHaveAttribute("lang", "nb");
  await expect(region(page).locator("p[lang=nb]")).toHaveCount(PASSAGES.length);

  // Source panel: one Passage per stored Passage, P-labels, programmatically focusable only.
  const passages = region(page).getByRole("listitem");
  await expect(passages).toHaveCount(PASSAGES.length);
  await expect(passages.first()).toHaveAttribute("tabindex", "-1");
  await expect(passages.first()).toHaveAttribute("id", "passage-p1");
  await expect(passages.nth(6)).toContainText("P7");
  const scroll = await region(page).evaluate((el) => getComputedStyle(el).overflowY);
  expect(scroll).toBe("auto");

  expect(await axeBlocking(page)).toEqual([]);
});

test("desktop Tab order: from the h1 the study panel comes first, then the source region as one Tab stop", async ({ page }) => {
  await openOverview(page);
  await expect(h1(page)).toBeFocused();
  // The first Tab on a screen goes to the skip link (Screen); start again from the h1.
  await page.keyboard.press("Tab");
  await h1(page).focus();
  // Story 1.12: each Summary Point's "Kilde: Pn" is a button, in reading order.
  for (let i = 1; i <= 5; i++) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: `Kilde: P${i}` })).toBeFocused();
  }
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: MSG.start })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(region(page)).toBeFocused();
  await page.keyboard.press("Tab");
  const inAside = await page.evaluate(() => !!document.activeElement?.closest("aside"));
  expect(inAside).toBe(false);
});

test("mobile 390 px: tabs 'Studier' / 'Kilde' with manual activation; the inactive panel is hidden from AT", async ({ page }) => {
  await openOverview(page, studySet(), 390);
  await expect(h1(page)).toBeFocused();
  const studyTab = page.getByRole("tab", { name: MSG.study });
  const sourceTab = page.getByRole("tab", { name: MSG.source });
  await expect(studyTab).toHaveAttribute("aria-selected", "true");
  await expect(sourceTab).toHaveAttribute("aria-selected", "false");
  await expect(page.getByRole("banner")).toContainText(TITLE);

  // Status strip with the Note name at the top of 'Studier'.
  const studyPanel = page.getByRole("tabpanel", { name: MSG.study });
  await expect(studyPanel.locator("p").first()).toHaveText(TITLE);
  await expect(region(page)).toHaveCount(0);
  await expect(page.getByRole("complementary")).toHaveCount(0);
  expect(await axeBlocking(page)).toEqual([]);

  // Arrow keys move focus only; nothing is activated.
  await studyTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(sourceTab).toBeFocused();
  await expect(studyTab).toHaveAttribute("aria-selected", "true");
  await expect(studyPanel).toBeVisible();
  await expect(region(page)).toHaveCount(0);

  await page.keyboard.press("Enter");
  await expect(sourceTab).toHaveAttribute("aria-selected", "true");
  await expect(region(page)).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: MSG.study })).toHaveCount(0);
  await expect(page.getByRole("button", { name: MSG.start })).toHaveCount(0);
  expect(await axeBlocking(page)).toEqual([]);

  await page.keyboard.press("ArrowLeft");
  await expect(studyTab).toBeFocused();
  await page.keyboard.press("Space");
  await expect(studyTab).toHaveAttribute("aria-selected", "true");
  await expect(region(page)).toHaveCount(0);
});

for (const width of [320, 640]) {
  test(`no horizontal scroll at ${width} px${width === 640 ? " (1280 px at 200 % zoom)" : ""}, on both tabs`, async ({ page }) => {
    await openOverview(page, studySet(), width);
    await expect(h1(page)).toBeFocused();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await page.getByRole("tab", { name: MSG.source }).click();
    await expect(region(page)).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
}

test("none covered: err.noConcepts with 'Prøv igjen' instead of 'Start runde'; retry sends 1 POST and reloads the overview", async ({ page }) => {
  const posts: unknown[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/study-set")) posts.push(req.postDataJSON());
  });
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { keyConfigured: true, model: MODEL, provider: "OpenRouter", promptVersion: PROMPT_VERSION } }),
  );
  await page.route("**/api/study-set", (route) => route.fulfill({ json: rawStudySetFor(PASSAGES) }));
  const status = page.waitForResponse("**/api/status");
  await openOverview(page, studySet({ covered: () => false }));
  await status;
  await expect(h1(page)).toBeFocused();

  const alert = page.locator('main [role="alert"]');
  await expect(alert).toContainText(`Feil: ${MSG.noConcepts}`);
  await expect(alert.getByRole("button", { name: MSG.retry })).toBeVisible();
  await expect(page.getByRole("button", { name: MSG.start })).toHaveCount(0);
  await expect(page.getByText(MSG.notCovered)).toHaveCount(5);
  expect(await axeBlocking(page)).toEqual([]);

  await alert.getByRole("button", { name: MSG.retry }).click();
  // Genererer runs in place, from the stored Passages; then the overview reloads its records.
  await expect(page.getByRole("button", { name: MSG.start })).toBeVisible();
  await expect(h1(page)).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`/notat/${NOTE_HASH}$`));
  await expect(alert).toHaveCount(0);
  await expect(page.locator("main section").nth(1).getByRole("listitem").first()).toContainText("Begrep 1");
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ mode: "live", noteHash: NOTE_HASH, passages: PASSAGES });
});

test("demo Note, none covered: 'Prøv igjen' sends the bare Note Hash as mode demo and reloads /notat/demo:{hash}", async ({ page }) => {
  const DEMO_NOTE = `demo:${NOTE_HASH}`;
  const DEMO_CACHE_KEY = `demo:${CACHE_KEY}`;
  const posts: unknown[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/study-set")) posts.push(req.postDataJSON());
  });
  await page.route("**/api/study-set", (route) => route.fulfill({ json: rawStudySetFor(PASSAGES) }));
  await page.addInitScript(() => {
    if (sessionStorage.getItem("e2e-seeded")) return;
    sessionStorage.setItem("e2e-seeded", "1");
    localStorage.setItem("torsa.settings", JSON.stringify({ schemaVersion: 1, consent: "declined", demoMode: true }));
  });
  await page.goto("/innstillinger");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await seedNoteRecords(
    page,
    { ...NOTE, noteHash: DEMO_NOTE, currentCacheKey: DEMO_CACHE_KEY },
    { ...studySet({ covered: () => false }), cacheKey: DEMO_CACHE_KEY },
  );
  await page.goto(`/notat/${DEMO_NOTE}`);
  const alert = page.locator('main [role="alert"]');
  await expect(alert).toContainText(`Feil: ${MSG.noConcepts}`);

  await alert.getByRole("button", { name: MSG.retry }).click();
  await expect(page.getByRole("button", { name: MSG.start })).toBeVisible();
  await expect(h1(page)).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`/notat/demo(:|%3A)${NOTE_HASH}$`));
  await expect(alert).toHaveCount(0);
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ mode: "demo", noteHash: NOTE_HASH, passages: PASSAGES });
  expect(NOTE_HASH).toMatch(/^[0-9a-f]{64}$/);
});

test("Study Set missing: Note stored without its Study Set shows note.missing", async ({ page }) => {
  await openOverview(page, null);
  await expect(page.getByRole("heading", { level: 1, name: MSG.missing })).toBeFocused();
  await expect(page.getByRole("complementary")).toHaveCount(0);
});

test("Study Set invalid: a record that fails validation shows note.missing", async ({ page }) => {
  const { concepts: _dropped, ...invalid } = studySet();
  void _dropped;
  await openOverview(page, invalid as SeedStudySet);
  await expect(page.getByRole("heading", { level: 1, name: MSG.missing })).toBeFocused();
});

test("language und: generated content and Passages get lang=\"\", axe stays clean", async ({ page }) => {
  await openOverview(page, studySet({ language: "und" }));
  await expect(h1(page)).toBeFocused();
  const langs = await page.evaluate(() =>
    [...document.querySelectorAll("main [lang], aside [lang]")].map((el) => el.getAttribute("lang")),
  );
  expect(langs.length).toBeGreaterThan(PASSAGES.length);
  expect(new Set(langs)).toEqual(new Set([""]));
  expect(await axeBlocking(page)).toEqual([]);
});

test("leaving the overview: 'Innstillinger' shows a banner without the Note title, no aside and no split layout", async ({ page }) => {
  await openOverview(page);
  await expect(h1(page)).toBeFocused();
  await expect(page.getByRole("banner")).toContainText(TITLE);

  await page.getByRole("link", { name: "Innstillinger" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Innstillinger" })).toBeFocused();
  await expect(page.getByRole("banner")).not.toContainText(TITLE);
  await expect(page.locator("aside")).toHaveCount(0);
  // main is centred with its 40rem max width again, as on the other single-column screens.
  const layout = await page.evaluate(() => {
    const main = document.querySelector("main")!;
    const box = main.getBoundingClientRect();
    return {
      display: getComputedStyle(main.parentElement!).display,
      left: Math.round(box.left),
      right: Math.round(document.documentElement.clientWidth - box.right),
      width: Math.round(box.width),
    };
  });
  expect(layout.display).not.toBe("grid");
  expect(layout.width).toBe(640);
  expect(Math.abs(layout.left - layout.right)).toBeLessThanOrEqual(1);
});

test("resizing: 1280 px shows the aside, 390 px switches to tabs, back to 1280 px shows the aside again", async ({ page }) => {
  await openOverview(page);
  await expect(h1(page)).toBeFocused();
  const aside = page.getByRole("complementary", { name: `Kilde: ${FILE_NAME}` });
  await expect(aside).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(page.getByRole("tab", { name: MSG.study })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: MSG.source })).toBeVisible();
  await expect(aside).toHaveCount(0);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(aside).toBeVisible();
  await expect(region(page)).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);
});

// ---- Story 1.12: reference jump ----

const RETURN_ACTION = "Tilbake til sammendraget";
const RETURN_HINT = "Trykk Esc for å gå tilbake.";
const ref = (page: Page, n: number) => page.getByRole("button", { name: `Kilde: P${n}` });
const passage = (page: Page, n: number) => page.locator(`#passage-p${n}`);
const returnAction = (page: Page) => page.getByRole("button", { name: RETURN_ACTION });

/** The jump's result for Passage n: one mark (the Quote), active rule, focus, hint and the return control. */
async function expectJumpedTo(page: Page, n: number) {
  const target = passage(page, n);
  const q = quote(PASSAGES[n - 1]);
  await expect(page.locator("mark")).toHaveCount(1);
  await expect(target.locator("mark")).toHaveText(q);
  await expect(target).toBeFocused();
  await expect(target).toHaveAttribute("data-active", "true");
  await expect(target).toHaveAccessibleDescription(RETURN_HINT);
  await expect(page.locator("[data-active]")).toHaveCount(1);
  // Screen-reader order: "Sitat start", the Quote, "Sitat slutt"; the Passage ID stays outside the mark.
  const text = (await target.textContent()) ?? "";
  expect(text.indexOf("Sitat start")).toBeGreaterThan(-1);
  expect(text.indexOf("Sitat start")).toBeLessThan(text.indexOf(q));
  expect(text.indexOf(q)).toBeLessThan(text.indexOf("Sitat slutt"));
  await expect(target.locator("mark")).not.toContainText(`P${n}`);
  await expect(page.getByText(`Viser P${n} fra sammendraget`)).toBeVisible();
  await expect(returnAction(page)).toBeVisible();
  const style = await target.evaluate((el) => {
    const mark = getComputedStyle(el.querySelector("mark")!);
    return { rule: getComputedStyle(el).borderLeftWidth, outline: mark.outlineWidth, outlineStyle: mark.outlineStyle };
  });
  expect(style).toEqual({ rule: "3px", outline: "2px", outlineStyle: "solid" });
}

test("jump, desktop: click 'Kilde: P2' highlights the Quote, focuses P2 and shows the return control", async ({ page }) => {
  await openOverview(page);
  await expect(page.locator("mark")).toHaveCount(0);
  await expect(returnAction(page)).toHaveCount(0);
  await ref(page, 2).click();
  await expectJumpedTo(page, 2);
  // The return control sits at the top of the source panel, above the scroll region.
  const control = (await returnAction(page).boundingBox())!;
  const regionBox = (await region(page).boundingBox())!;
  expect(control.y).toBeLessThan(regionBox.y);
  expect(await axeBlocking(page)).toEqual([]);
});

test("return: Enter jumps, Esc in the source panel returns to the exact reference; highlight and control stay", async ({ page }) => {
  await openOverview(page);
  await ref(page, 3).focus();
  await page.keyboard.press("Enter");
  await expectJumpedTo(page, 3);
  await page.keyboard.press("Escape");
  await expect(ref(page, 3)).toBeFocused();
  await expect(page.locator("mark")).toHaveCount(1);
  await expect(returnAction(page)).toBeVisible();

  // Esc outside the source panel does nothing.
  await h1(page).focus();
  await page.keyboard.press("Escape");
  await expect(h1(page)).toBeFocused();

  // The return control does the same as Esc.
  await ref(page, 1).click();
  await expectJumpedTo(page, 1);
  await returnAction(page).click();
  await expect(ref(page, 1)).toBeFocused();
});

test("second jump: only one highlight and one active Passage at a time", async ({ page }) => {
  await openOverview(page);
  await ref(page, 2).click();
  await expectJumpedTo(page, 2);
  await ref(page, 4).click();
  await expectJumpedTo(page, 4);
  await expect(passage(page, 2).locator("mark")).toHaveCount(0);
  await expect(passage(page, 2)).not.toHaveAttribute("data-active");
  await expect(passage(page, 2)).not.toHaveAttribute("aria-describedby");
  await expect(page.getByText("Viser P2 fra sammendraget")).toHaveCount(0);
});

test("mobile 390 px: the jump switches to 'Kilde'; returning switches to 'Studier' and focuses the reference", async ({ page }) => {
  await openOverview(page, studySet(), 390);
  const studyTab = page.getByRole("tab", { name: MSG.study });
  const sourceTab = page.getByRole("tab", { name: MSG.source });
  await ref(page, 3).click();
  await expect(sourceTab).toHaveAttribute("aria-selected", "true");
  await expectJumpedTo(page, 3);
  await expect(passage(page, 3)).toBeInViewport();
  expect(await axeBlocking(page)).toEqual([]);

  await returnAction(page).click();
  await expect(studyTab).toHaveAttribute("aria-selected", "true");
  await expect(ref(page, 3)).toBeFocused();
  await expect(ref(page, 3)).toBeInViewport();

  // Esc returns the same way.
  await ref(page, 5).click();
  await expect(sourceTab).toHaveAttribute("aria-selected", "true");
  await expectJumpedTo(page, 5);
  await page.keyboard.press("Escape");
  await expect(studyTab).toHaveAttribute("aria-selected", "true");
  await expect(ref(page, 5)).toBeFocused();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test("reduced motion: the source region scrolls to the Passage instantly", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openOverview(page);
  await expect(h1(page)).toBeFocused();
  // Low enough that the region scrolls whatever the fonts (CI's differ from local), and polled because
  // the resize lays out asynchronously.
  await page.setViewportSize({ width: 1280, height: 240 });
  await expect
    .poll(() => region(page).evaluate((el) => el.scrollHeight - el.clientHeight))
    .toBeGreaterThan(100);
  // Start with the region scrolled to the bottom, so P1 is out of view and the jump must scroll up.
  await region(page).evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const inRegion = () =>
    page.evaluate(() => {
      const area = document.querySelector<HTMLElement>("[role=region]")!.getBoundingClientRect();
      const target = document.querySelector<HTMLElement>("#passage-p1 mark, #passage-p1")!.getBoundingClientRect();
      return target.top >= area.top && target.bottom <= area.bottom;
    });
  expect(await inRegion()).toBe(false);
  await ref(page, 1).click();
  // One frame after the click: a smooth scroll would still be under way.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
  expect(await inRegion()).toBe(true);
  await expectJumpedTo(page, 1);
  await expect(returnAction(page)).toBeInViewport();
});

test("forced colors: the highlight uses Mark / MarkText with a CanvasText outline", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await openOverview(page);
  await ref(page, 1).click();
  await expectJumpedTo(page, 1);
  const colors = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.forcedColorAdjust = "none";
    document.body.append(probe);
    const system = (value: string) => {
      probe.style.color = value;
      return getComputedStyle(probe).color;
    };
    const expected = { bg: system("Mark"), fg: system("MarkText"), outline: system("CanvasText") };
    probe.remove();
    const mark = getComputedStyle(document.querySelector("mark")!);
    return { expected, actual: { bg: mark.backgroundColor, fg: mark.color, outline: mark.outlineColor } };
  });
  expect(colors.actual).toEqual(colors.expected);
});

test("a jump survives crossing 768 px, and activating a Passage moves none of its text", async ({ page }) => {
  await openOverview(page);
  await expect(h1(page)).toBeFocused();
  const textBox = () => passage(page, 2).locator("p").boundingBox();
  const before = (await textBox())!;
  await ref(page, 2).click();
  await expectJumpedTo(page, 2);
  const after = (await textBox())!;
  expect(after.x).toBeCloseTo(before.x, 0);
  expect(after.width).toBeCloseTo(before.width, 0);

  await page.setViewportSize({ width: 390, height: 800 });
  await page.getByRole("tab", { name: MSG.source }).click();
  await expect(page.locator("mark")).toHaveCount(1);
  await expect(passage(page, 2).locator("mark")).toHaveText(quote(PASSAGES[1]));
  await returnAction(page).click();
  await expect(page.getByRole("tab", { name: MSG.study })).toHaveAttribute("aria-selected", "true");
  await expect(ref(page, 2)).toBeFocused();
});
