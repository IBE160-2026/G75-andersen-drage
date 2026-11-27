// Story 2.1: start a Round from Notatoversikt (FR-18, AD-3, AD-11, AD-21, NFR-6, NFR-7, UX-DR7, UX-DR8,
// UX-DR15, UX-DR19). Story 2.2: review Flashcards and mark them (FR-13, FR-17, UX-DR11, UX-DR13, UX-DR21).
// Story 2.3: answer Quiz Questions (FR-12, FR-14, FR-17, AD-11, AD-21, NFR-6, UX-DR11, UX-DR12, UX-DR14, UX-DR15).
// Story 2.4: Resultat with score and sources (FR-12, FR-14, AD-3, AD-21, NFR-6, UX-DR11, UX-DR17, UX-DR19).
// Story 2.5: the next Round from Resultat ('Ny runde') targets the weak spots (FR-18, AD-11, AD-21, UX-DR15).
// Records are seeded straight into IndexedDB; nothing is POSTed, so nothing reaches
// the provider.
import { createHash } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  readStore,
  seedConsent,
  seedNoteRecords,
  type SeedConceptProgress,
  type SeedNote,
  type SeedPassage,
  type SeedStudySet,
} from "./seed";

const MODEL = "anthropic/claude-haiku-5.5";
const PROMPT_VERSION = "2";
const BRAND = "Torsas læringsassistent";
const TITLE = "Forelesning 7 – normalformer";
const MSG = {
  start: "Start runde",
  review: "Du kan alle nøkkelbegrepene. Dette er en repetisjonsrunde.",
  error: "Feil: Det gikk ikke å lage kort og quiz nå.",
  missing: "Fant ikke notatet",
  study: "Studier",
  source: "Kilde",
  reveal: "Snu kortet",
  unknown: "Kunne det ikke",
  known: "Kunne det",
  back: "Tilbake til kortet",
  backToQuestion: "Tilbake til spørsmålet",
  next: "Neste spørsmål",
  result: "Se resultatet",
  correct: "Riktig.",
  resultH1: "Resultat",
  backToOverview: "Tilbake til oversikten",
  backToResult: "Tilbake til resultatet",
  yours: "Ditt svar:",
  right: "Rett svar:",
  nextRound: "Ny runde",
};

const PASSAGES: SeedPassage[] = [
  "Normalisering er en metode for å organisere tabeller i en relasjonsdatabase slik at data ikke lagres dobbelt.",
  "Første normalform krever at hver celle i tabellen inneholder én enkelt verdi og at det ikke finnes gjentatte grupper.",
  "Andre normalform krever første normalform og at alle ikke-nøkkelattributter avhenger av hele primærnøkkelen.",
  "Tredje normalform fjerner transitive avhengigheter, slik at ikke-nøkkelattributter bare avhenger av nøkkelen.",
  "En funksjonell avhengighet betyr at verdien av ett attributt bestemmer verdien av et annet attributt entydig.",
  "Denormalisering brukes noen ganger bevisst for å gjøre spørringer raskere, på bekostning av mer redundans.",
].map((text, i) => ({ id: `p${i + 1}`, text }));

const BARE_HASH = createHash("sha256")
  .update(PASSAGES.map((p) => p.text).join("\n\n"), "utf8")
  .digest("hex");
const quote = (p: SeedPassage) => p.text.slice(0, 60);

/** Stored order is not rank order; "Denormalisering" is not covered; "Normalisering" has two Flashcards. */
const CONCEPTS = [
  { id: "k-tredje", name: "Tredje normalform", rank: 3, passage: 3, cards: 1 },
  { id: "k-normalisering", name: "Normalisering", rank: 1, passage: 0, cards: 2 },
  { id: "k-forste", name: "Første normalform", rank: 2, passage: 1, cards: 1 },
  { id: "k-funksjonell", name: "Funksjonell avhengighet", rank: 5, passage: 4, cards: 1 },
  { id: "k-denormalisering", name: "Denormalisering", rank: 4, passage: 5, cards: 0 },
];
const COVERED = CONCEPTS.filter((c) => c.cards > 0);
const CARD_COUNT = COVERED.reduce((sum, c) => sum + c.cards, 0);
const front = (id: string, n = 1) => `Hva sier notatet om ${id}, kort ${n}?`;

/** Every Quiz Question's options; the right one is index CORRECT (the display order is random per Round). */
const OPTIONS = ["Svar null", "Svar en", "Svar to", "Svar tre"];
const CORRECT = 1;
const stem = (id: string) => `Hva er riktig om ${id}?`;

/** `cards: false`: the covered concepts have only Quiz Questions (a quiz-only Round). */
/** A wrong option that must wrap at 320 px: a long sentence plus one long unbroken word. */
const LONG_OPTION =
  "Når alle tabellene i databasen er slått sammen til én stor tabell slik at ingen opplysninger lagres i mer enn én rad " +
  "relasjonsdatabasenormaliseringsprosessgjennomgangsrapport";

/**
 * `cards: false`: the covered concepts have only Quiz Questions (a quiz-only Round). `longOption`: the
 * first question (k-normalisering) gets LONG_OPTION as a wrong option.
 */
function records(noteKey: string, { quiz = true, cards = true, longOption = false } = {}) {
  const cacheKey = `${noteKey}:${PROMPT_VERSION}:${MODEL}`;
  const note: SeedNote = {
    noteHash: noteKey,
    title: TITLE,
    sourceType: "md",
    wordCount: 120,
    passages: PASSAGES,
    normalizationVersion: 1,
    currentCacheKey: cacheKey,
    archived: false,
    importanceLevel: 2,
    lastPractisedAt: null,
  };
  const studySet: SeedStudySet = {
    cacheKey,
    model: MODEL,
    promptVersion: PROMPT_VERSION,
    language: "nb",
    summaryPoints: PASSAGES.slice(0, 5).map((p, i) => ({ id: `sp${i + 1}`, text: `Punkt ${i + 1}.`, passageId: p.id, quote: quote(p) })),
    concepts: CONCEPTS.map((c) => {
      const p = PASSAGES[c.passage];
      return {
        id: c.id,
        name: c.name,
        centralityRank: c.rank,
        covered: c.cards > 0,
        flashcards: Array.from({ length: cards ? c.cards : 0 }, (_, i) => ({
          id: `${c.id}.fc${i + 1}`,
          front: front(c.id, i + 1),
          back: "Se kilden.",
          passageId: p.id,
          quote: quote(p),
        })),
        quizQuestions:
          quiz && c.cards > 0
            ? [{ id: `${c.id}.qq1`, question: stem(c.id), options: longOption && c.id === "k-normalisering" ? [LONG_OPTION, ...OPTIONS.slice(1)] : OPTIONS, correctIndex: CORRECT, passageId: p.id, quote: quote(p) }]
            : [],
      };
    }),
  };
  return { note, studySet };
}

async function axeBlocking(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

async function openOverview(
  page: Page,
  { width = 1280, progress = [] as SeedConceptProgress[], noteKey = BARE_HASH, quiz = true, cards = true, longOption = false } = {},
) {
  await page.setViewportSize({ width, height: 800 });
  await seedConsent(page, "accepted");
  await page.goto("/innstillinger");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const { note, studySet } = records(noteKey, { quiz, cards, longOption });
  await seedNoteRecords(page, note, studySet, progress);
  await page.goto(`/notat/${noteKey}`);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
}

const startButton = (page: Page) => page.getByRole("button", { name: MSG.start });
const roundH1 = (page: Page, n = 1) => page.getByRole("heading", { level: 1, name: `Runde ${n}` });
const cardHeading = (page: Page, x = 1) => page.getByRole("heading", { level: 2, name: `Kort ${x} av ${CARD_COUNT}` });
const cardRegion = (page: Page, x = 1) => page.getByRole("region", { name: `Kort ${x} av ${CARD_COUNT}` });
const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/**
 * Keep every transaction that puts a Round open after the put: a chain of requests on the same store holds
 * it until `releaseRoundPuts`, so the storage call has not resolved yet.
 */
async function holdRoundPuts(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { e2eHold: boolean };
    w.e2eHold = true;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
      const request = put.apply(this, args);
      if (this.name === "rounds" && w.e2eHold) {
        const spin = () => {
          if (w.e2eHold) this.count().onsuccess = spin;
        };
        spin();
      }
      return request;
    };
  });
}

async function releaseRoundPuts(page: Page) {
  await page.evaluate(() => {
    (window as unknown as { e2eHold: boolean }).e2eHold = false;
  });
}

const roundUrl = (noteKey: string) => new RegExp(`/notat/${noteKey}/runde/[0-9a-f-]{36}$`);

test("keyboard start: records stored in one go, focus on h1 'Runde 1', first card front, axe clean; reload shows the same", async ({ page }) => {
  await openOverview(page);
  await startButton(page).focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(roundUrl(BARE_HASH));
  await expect(roundH1(page)).toBeFocused();
  await expect(page).toHaveTitle(`Runde 1 · ${TITLE} · ${BRAND}`);
  await expect(cardHeading(page)).toHaveAttribute("tabindex", "-1");

  // First card: the rank-1 new concept. Front = question + "Kilde: P1" + 'Snu kortet'; no Quote (Story 2.2).
  const region = cardRegion(page);
  await expect(region).toContainText(front("k-normalisering"));
  await expect(region.getByRole("button")).toHaveText(["Kilde: P1", MSG.reveal]);
  await expect(region.locator("blockquote")).toHaveCount(0);
  await expect(region).not.toContainText(quote(PASSAGES[0]));
  await expect(page.locator("main").getByText("ny", { exact: true })).toHaveCount(1);
  await expect(page.getByText(MSG.review)).toHaveCount(0);
  await expect(page.locator('main [aria-hidden="true"] > div')).toHaveCount(1);
  await expect(page.getByRole("complementary", { name: `Kilde: ${TITLE}.md` })).toBeVisible();

  const rounds = await readStore(page, "rounds");
  expect(rounds).toHaveLength(1);
  const round = rounds[0];
  expect(round).toMatchObject({
    noteHash: BARE_HASH,
    cacheKey: `${BARE_HASH}:${PROMPT_VERSION}:${MODEL}`,
    number: 1,
    review: false,
    conceptIds: ["k-normalisering", "k-forste", "k-tredje", "k-funksjonell"],
    answers: [],
    status: "active",
    completedAt: null,
    schemaVersion: 1,
  });
  expect(round.itemIds).toEqual([
    "k-normalisering.fc1",
    "k-normalisering.fc2",
    "k-forste.fc1",
    "k-tredje.fc1",
    "k-funksjonell.fc1",
    "k-normalisering.qq1",
    "k-forste.qq1",
    "k-tredje.qq1",
    "k-funksjonell.qq1",
  ]);
  expect(page.url()).toContain(String(round.roundId));
  const progress = await readStore(page, "conceptProgress");
  expect(progress.map((p) => p.keyConceptId).sort()).toEqual(COVERED.map((c) => c.id).sort());
  for (const row of progress) {
    expect(row).toMatchObject({ state: "new", lastShownAt: round.startedAt, lastUsedQuizQuestionId: `${row.keyConceptId}.qq1` });
  }
  expect(await axeBlocking(page)).toEqual([]);

  // Reload: rendered from the stored Round, not recomposed.
  await page.reload();
  await expect(roundH1(page)).toBeFocused();
  await expect(cardRegion(page)).toContainText(front("k-normalisering"));
  await expect(page.locator("main").getByText("ny", { exact: true })).toHaveCount(1);
  expect(await readStore(page, "rounds")).toEqual(rounds);
});

test("a second start: 'Runde 2', the first Round becomes abandoned and its URL shows note.missing", async ({ page }) => {
  await openOverview(page);
  await startButton(page).click();
  await expect(roundH1(page)).toBeFocused();
  const firstUrl = page.url();

  await page.goto(`/notat/${BARE_HASH}`);
  await startButton(page).click();
  await expect(roundH1(page, 2)).toBeFocused();
  expect(page.url()).not.toBe(firstUrl);
  await expect(page).toHaveTitle(`Runde 2 · ${TITLE} · ${BRAND}`);
  const rounds = await readStore(page, "rounds");
  expect(rounds.map((r) => [r.number, r.status]).sort()).toEqual([
    [1, "abandoned"],
    [2, "active"],
  ]);

  // Browser back to the abandoned Round: never rendered as live (later marks must not land on it).
  await page.goto(firstUrl);
  await expect(page.getByRole("heading", { level: 1, name: MSG.missing })).toBeFocused();
});

test("shaky first: the shaky concept's card opens the Round, its chip reads 'usikker'", async ({ page }) => {
  await openOverview(page, {
    progress: [{ keyConceptId: "k-funksjonell", state: "shaky", lastShownAt: "2026-11-20T08:00:00.000Z", lastUsedQuizQuestionId: null }],
  });
  await startButton(page).click();
  await expect(roundH1(page)).toBeFocused();
  await expect(cardRegion(page)).toContainText(front("k-funksjonell"));
  await expect(cardRegion(page)).toContainText("Kilde: P5");
  await expect(page.locator("main").getByText("usikker", { exact: true })).toBeVisible();
});

test("review: all covered concepts known → round.review and the 'kan' chip", async ({ page }) => {
  const progress = COVERED.map((c, i) => ({
    keyConceptId: c.id,
    state: "known" as const,
    lastShownAt: `2026-11-2${i}T08:00:00.000Z`,
    lastUsedQuizQuestionId: `${c.id}.qq1`,
  }));
  await openOverview(page, { progress });
  await startButton(page).click();
  await expect(roundH1(page)).toBeFocused();
  await expect(page.getByText(MSG.review)).toBeVisible();
  await expect(page.locator("main").getByText("kan", { exact: true })).toBeVisible();
  // Least recently shown first: k-tredje (stored first, day 20).
  await expect(cardRegion(page)).toContainText(front("k-tredje"));
  const [round] = await readStore(page, "rounds");
  expect(round).toMatchObject({ review: true, conceptIds: COVERED.map((c) => c.id) });
  expect(await axeBlocking(page)).toEqual([]);
});

test("demo Note: the route and the records keep the demo: prefix", async ({ page }) => {
  const demoKey = `demo:${BARE_HASH}`;
  await openOverview(page, { noteKey: demoKey });
  await startButton(page).click();
  await expect(page).toHaveURL(roundUrl(demoKey));
  await expect(roundH1(page)).toBeFocused();
  const [round] = await readStore(page, "rounds");
  expect(round).toMatchObject({ noteHash: demoKey, cacheKey: `${demoKey}:${PROMPT_VERSION}:${MODEL}` });
  const progress = await readStore(page, "conceptProgress");
  expect(new Set(progress.map((p) => p.noteHash))).toEqual(new Set([demoKey]));
});

test("320 px: no horizontal scroll, tabs work by keyboard, axe clean on both tabs", async ({ page }) => {
  await openOverview(page, { width: 320 });
  await startButton(page).click();
  await expect(roundH1(page)).toBeFocused();
  await expect(cardRegion(page)).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await axeBlocking(page)).toEqual([]);

  const studyTab = page.getByRole("tab", { name: MSG.study });
  const sourceTab = page.getByRole("tab", { name: MSG.source });
  await expect(studyTab).toHaveAttribute("aria-selected", "true");
  await studyTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(sourceTab).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(sourceTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: `Kilde · ${TITLE}.md` })).toBeVisible();
  await expect(cardRegion(page)).toHaveCount(0);
  // The progress line stays above the tabs.
  await expect(roundH1(page)).toBeVisible();
  await expect(cardHeading(page)).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await axeBlocking(page)).toEqual([]);

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  await expect(studyTab).toHaveAttribute("aria-selected", "true");
  await expect(cardRegion(page)).toBeVisible();
});

test("while the start is pending, 'Start runde' is aria-disabled", async ({ page }) => {
  await openOverview(page);
  // Keep the start transaction open after the Round's put, so startRound has not resolved yet.
  await holdRoundPuts(page);
  await startButton(page).click();
  await expect(startButton(page)).toHaveAttribute("aria-disabled", "true");
  await expect(startButton(page)).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`/notat/${BARE_HASH}$`));
  await releaseRoundPuts(page);
  await expect(roundH1(page)).toBeFocused();
  expect(await readStore(page, "rounds")).toHaveLength(1);
});

test("a pending start pressed again stores one Round", async ({ page }) => {
  await openOverview(page);
  await startButton(page).dblclick();
  await expect(roundH1(page)).toBeFocused();
  expect(await readStore(page, "rounds")).toHaveLength(1);
});

test("write fails: stays on Notatoversikt, err.generation inline, nothing stored, the button works again", async ({ page }) => {
  await openOverview(page);
  // The Round's put throws, after the progress puts were queued in the same transaction.
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
      if (this.name === "rounds") throw new DOMException("e2e", "DataError");
      return put.apply(this, args);
    };
  });
  await startButton(page).click();
  const alert = page.locator('main [role="alert"]');
  await expect(alert).toHaveText(MSG.error);
  await expect(startButton(page)).not.toHaveAttribute("aria-disabled");
  await expect(page).toHaveURL(new RegExp(`/notat/${BARE_HASH}$`));
  expect(await readStore(page, "rounds")).toEqual([]);
  expect(await readStore(page, "conceptProgress")).toEqual([]);
  expect(await axeBlocking(page)).toEqual([]);
});

test("bad URL: an unknown Round, or a Round whose Study Set is gone, shows note.missing", async ({ page }) => {
  await openOverview(page);
  await page.goto(`/notat/${BARE_HASH}/runde/00000000-0000-4000-8000-000000000000`);
  await expect(page.getByRole("heading", { level: 1, name: MSG.missing })).toBeFocused();
  await expect(page.getByRole("complementary")).toHaveCount(0);

  await page.goto(`/notat/${BARE_HASH}`);
  await startButton(page).click();
  await expect(roundH1(page)).toBeFocused();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("torsa", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("studySets", "readwrite");
      tx.objectStore("studySets").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: MSG.missing })).toBeFocused();
});

test("bad URL: an existing Round opened under another existing Note's URL shows note.missing", async ({ page }) => {
  const demoKey = `demo:${BARE_HASH}`;
  await openOverview(page);
  const demo = records(demoKey);
  await seedNoteRecords(page, demo.note, demo.studySet);
  await startButton(page).click();
  await expect(roundH1(page)).toBeFocused();
  const roundId = page.url().split("/runde/")[1];

  await page.goto(`/notat/${demoKey}/runde/${roundId}`);
  await expect(page.getByRole("heading", { level: 1, name: MSG.missing })).toBeFocused();
  // The other Note itself is still there.
  await page.goto(`/notat/${demoKey}`);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
});

// ---- Story 2.2: Flashcards ----

const QUIZ_COUNT = COVERED.length;
const button = (page: Page, name: string) => page.locator("main").getByRole("button", { name, exact: true });
const answer = (page: Page) => page.locator("main").getByText("Se kilden.", { exact: true });
const anyRef = (page: Page, x: number) => cardRegion(page, x).getByRole("button", { name: /^Kilde: P\d+$/ });
const questionHeading = (page: Page, x = 1) =>
  page.getByRole("heading", { level: 2, name: `Spørsmål ${x} av ${QUIZ_COUNT}` });

const questionRegion = (page: Page, x = 1, y = QUIZ_COUNT) => page.getByRole("region", { name: `Spørsmål ${x} av ${y}` });
/** Option `letter` (display position A–D) of the shown question; its name is "A Svar to". */
const optionButton = (page: Page, letter: string) =>
  page.locator("main ul").getByRole("button", { name: new RegExp(`^${letter} `) });
const feedback = (page: Page) => page.locator('main [aria-live="polite"]');
/** The 6 px bar's fill (the bar is the only aria-hidden element with a div child in main). */
const barFill = (page: Page) => page.locator('main [aria-hidden="true"] > div');

/**
 * The display letter of the right (or a wrong) option of question `x`, from the stored Round's
 * `optionOrder` (random per Round), and the right option's letter.
 */
async function pick(page: Page, x: number, right: boolean, cards = CARD_COUNT) {
  const rounds = await readStore(page, "rounds");
  const round = rounds.find((r) => r.status === "active") ?? rounds[0];
  const id = (round.itemIds as string[])[cards + x - 1];
  const order = (round.optionOrder as Record<string, number[]>)[id];
  const original = right ? CORRECT : order.find((o) => o !== CORRECT)!;
  return { id, original, letter: "ABCD"[order.indexOf(original)], correctLetter: "ABCD"[order.indexOf(CORRECT)] };
}

/** Answer question `x` with the mouse; waits for the feedback. */
async function answerQuestion(page: Page, x: number, right: boolean, cards = CARD_COUNT) {
  const { letter } = await pick(page, x, right, cards);
  await optionButton(page, letter).click();
  await expect(feedback(page)).not.toHaveText("");
  return letter;
}

// ---- Story 2.4: Resultat ----

const resultUrl = (noteKey: string, roundId: string) => new RegExp(`/notat/${noteKey}/runde/${roundId}/resultat$`);
const resultH1 = (page: Page) => page.getByRole("heading", { level: 1, name: MSG.resultH1, exact: true });
/** The score paragraph right after the h1. */
const scoreLine = (page: Page) => page.locator("main h1 + p");
const resultRow = (page: Page, x: number) => page.getByRole("region", { name: `Spørsmål ${x}`, exact: true });
/** Notatoversikt's Mastery chips (Radix tabs carry data-state too, so match the chip states only). */
const masteryChips = (page: Page) => page.locator('main [data-state="new"], main [data-state="shaky"], main [data-state="known"]');
const resultRef = (page: Page, x: number) => resultRow(page, x).locator("figcaption").getByRole("button");

/**
 * One row per Quiz Question in Round order: its question, "✓/✗ Ditt svar: {letter}. {option}", on a
 * miss "✓ Rett svar: …" (letters from the stored optionOrder), then the Quote; no Flashcard rows.
 */
async function expectResultRows(page: Page, round: Record<string, unknown>) {
  const ids = (round.itemIds as string[]).filter((id) => id.includes(".qq"));
  const order = round.optionOrder as Record<string, number[]>;
  const choices = new Map((round.answers as { itemId: string; choice?: number }[]).map((a) => [a.itemId, a.choice]));
  await expect(page.locator("main section")).toHaveCount(ids.length);
  for (const [i, id] of ids.entries()) {
    const conceptId = id.split(".")[0];
    const choice = choices.get(id)!;
    const letter = (o: number) => "ABCD"[order[id].indexOf(o)];
    const right = choice === CORRECT;
    const row = resultRow(page, i + 1);
    await expect(row.getByRole("heading", { level: 2 })).toHaveText(`Spørsmål ${i + 1}`);
    const passage = PASSAGES[CONCEPTS.find((c) => c.id === conceptId)!.passage];
    await expect(row.locator("p")).toHaveText([
      stem(conceptId),
      `${right ? "✓" : "✗"} ${MSG.yours} ${letter(choice)}. ${OPTIONS[choice]}`,
      ...(right ? [] : [`✓ ${MSG.right} ${letter(CORRECT)}. ${OPTIONS[CORRECT]}`]),
      quote(passage),
    ]);
    await expect(row.locator('[aria-hidden="true"]')).toHaveCount(right ? 1 : 2);
    await expect(row.locator("figcaption").getByRole("button")).toHaveText(`Kilde: P${passage.id.slice(1)}`);
  }
}

/** Mark every card 'Kunne det' with the mouse; ends with focus on "Spørsmål 1 av y". */
async function markAllCards(page: Page) {
  for (let x = 1; x <= CARD_COUNT; x++) await markCard(page, x, true);
}

async function startRound(page: Page, options: Parameters<typeof openOverview>[1] = {}) {
  await openOverview(page, options);
  await startButton(page).click();
  await expect(roundH1(page)).toBeFocused();
}

/** Reveal and mark card `x` with the mouse; waits for focus on the next Item heading. */
async function markCard(page: Page, x: number, knew: boolean) {
  await button(page, MSG.reveal).click();
  await button(page, knew ? MSG.known : MSG.unknown).click();
  await expect(x < CARD_COUNT ? cardHeading(page, x + 1) : questionHeading(page)).toBeFocused();
}

test("keyboard only: reveal and mark every card (Tab / Enter / Space), states stored, the first question after the last", async ({ page }) => {
  await startRound(page);
  // Normalisering (two cards), Første, Tredje, Funksjonell.
  const marks = [true, false, true, false, true];
  await cardHeading(page, 1).focus();
  for (const [i, knew] of marks.entries()) {
    const x = i + 1;
    const activate = x % 2 ? "Enter" : "Space";
    await expect(cardHeading(page, x)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(anyRef(page, x)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(button(page, MSG.reveal)).toBeFocused();
    await page.keyboard.press(activate);
    await expect(answer(page)).toBeFocused();
    await expect(cardRegion(page, x).locator("blockquote")).toHaveCount(1);
    if (x === 1) expect(await axeBlocking(page)).toEqual([]);
    await page.keyboard.press("Tab");
    await expect(anyRef(page, x)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(button(page, MSG.unknown)).toBeFocused();
    if (knew) {
      await page.keyboard.press("Tab");
      await expect(button(page, MSG.known)).toBeFocused();
    }
    await page.keyboard.press(activate === "Enter" ? "Space" : "Enter");
    if (x === 1) {
      // Same concept on card 2: its chip shows the stored state at once, and the card shows its front.
      await expect(cardHeading(page, 2)).toBeFocused();
      await expect(page.locator("main").getByText("kan", { exact: true })).toBeVisible();
      await expect(button(page, MSG.reveal)).toBeVisible();
    }
  }

  await expect(questionHeading(page)).toBeFocused();
  await expect(questionHeading(page)).toHaveAttribute("tabindex", "-1");
  const region = questionRegion(page);
  await expect(region).toContainText(stem("k-normalisering"));
  // "Kilde: P1" + options A–D; no Quote before answering.
  await expect(region.getByRole("button")).toHaveCount(5);
  await expect(region.locator("blockquote")).toHaveCount(0);

  const [round] = await readStore(page, "rounds");
  expect(round.status).toBe("active");
  const answers = round.answers as { itemId: string; knew: boolean; answeredAt: string }[];
  expect(answers.map((a) => [a.itemId, a.knew])).toEqual(
    (round.itemIds as string[]).slice(0, CARD_COUNT).map((id, i) => [id, marks[i]]),
  );
  for (const a of answers) expect(a.answeredAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  const progress = await readStore(page, "conceptProgress");
  expect(Object.fromEntries(progress.map((p) => [p.keyConceptId, p.state]))).toEqual({
    "k-normalisering": "shaky", // 'Kunne det', then 'Kunne det ikke': the latest wins.
    "k-forste": "known",
    "k-tredje": "shaky",
    "k-funksjonell": "known",
  });

  // ---- Story 2.3: every question by keyboard, right and wrong, then the last control ----
  await expect(page).toHaveTitle(`Runde 1, quiz · ${TITLE} · ${BRAND}`);
  await expect(roundH1(page)).toHaveText("Runde 1: quiz");
  await expect(barFill(page)).toHaveAttribute("style", /width: 25%/);
  expect(await axeBlocking(page)).toEqual([]);
  // Normalisering right, Første wrong (after 'Kunne det': the latest wins), Tredje right, Funksjonell right.
  const rights = [true, false, true, true];
  for (const [i, right] of rights.entries()) {
    const x = i + 1;
    const { letter, correctLetter } = await pick(page, x, right);
    await expect(questionHeading(page, x)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(questionRegion(page, x).getByRole("button", { name: /^Kilde: P\d+$/ })).toBeFocused();
    for (const l of "ABCD".slice(0, "ABCD".indexOf(letter) + 1)) {
      await page.keyboard.press("Tab");
      await expect(optionButton(page, l)).toBeFocused();
    }
    await page.keyboard.press(x % 2 ? "Enter" : "Space");
    await expect(feedback(page)).toHaveText(right ? MSG.correct : `Feil. Rett svar er ${correctLetter}.`);
    await expect(optionButton(page, letter)).toBeFocused();
    for (const l of "ABCD") await expect(optionButton(page, l)).toHaveAttribute("aria-disabled", "true");
    await expect(questionRegion(page, x).locator("blockquote")).toHaveCount(1);
    if (x === 2) expect(await axeBlocking(page)).toEqual([]);
    // Tab: the remaining options, the Quote's reference, then the advance control.
    for (const l of "ABCD".slice("ABCD".indexOf(letter) + 1)) {
      await page.keyboard.press("Tab");
      await expect(optionButton(page, l)).toBeFocused();
    }
    await page.keyboard.press("Tab");
    await expect(questionRegion(page, x).locator("figcaption").getByRole("button")).toBeFocused();
    await page.keyboard.press("Tab");
    const control = button(page, x < QUIZ_COUNT ? MSG.next : MSG.result);
    await expect(control).toBeFocused();
    if (x < QUIZ_COUNT) {
      await page.keyboard.press("Enter");
      await expect(questionHeading(page, x + 1)).toBeFocused();
      await expect(barFill(page)).toHaveAttribute("style", new RegExp(`width: ${((x + 1) / QUIZ_COUNT) * 100}%`));
    }
  }

  const [done] = await readStore(page, "rounds");
  expect(done.status).toBe("complete");
  const quizAnswers = (done.answers as { itemId: string; choice?: number; answeredAt: string }[]).slice(CARD_COUNT);
  expect(quizAnswers.map((a) => a.itemId)).toEqual((done.itemIds as string[]).slice(CARD_COUNT));
  expect(quizAnswers.map((a) => a.choice === CORRECT)).toEqual(rights);
  expect(done.completedAt).toBe(quizAnswers[QUIZ_COUNT - 1].answeredAt);
  const states = await readStore(page, "conceptProgress");
  expect(Object.fromEntries(states.map((p) => [p.keyConceptId, p.state]))).toEqual({
    "k-normalisering": "known",
    "k-forste": "shaky", // 'Kunne det', then a wrong answer: the latest wins.
    "k-tredje": "known",
    "k-funksjonell": "known",
  });

  // ---- Story 2.4: 'Se resultatet' → Resultat, by keyboard ----
  const roundPage = page.url();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(resultUrl(BARE_HASH, String(done.roundId)));
  await expect(resultH1(page)).toBeFocused();
  await expect(page).toHaveTitle(`Resultat · ${TITLE} · ${BRAND}`);
  await expect(scoreLine(page)).toHaveText("3 av 4 riktige");
  await expectResultRows(page, done);
  expect(await axeBlocking(page)).toEqual([]);
  // 'Se resultatet' replaced the Round URL: Back goes to Notatoversikt, then forward to Resultat again.
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/notat/${BARE_HASH}$`));
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  await page.goForward();
  await expect(page).toHaveURL(resultUrl(BARE_HASH, String(done.roundId)));
  await expect(resultH1(page)).toBeFocused();

  // Tab: 'Tilbake til oversikten', 'Ny runde' (Story 2.5), then each row's 'Kilde: Pn'.
  await button(page, MSG.backToOverview).focus();
  await page.keyboard.press("Tab");
  await expect(button(page, MSG.nextRound)).toBeFocused();
  for (let x = 1; x <= QUIZ_COUNT; x++) {
    await page.keyboard.press("Tab");
    await expect(resultRef(page, x)).toBeFocused();
  }
  // The miss (question 2, Første normalform, P2): Enter jumps, Esc returns; then the return control.
  await resultRef(page, 2).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#passage-p2")).toBeFocused();
  await expect(page.getByText("Viser P2 fra resultatet")).toBeVisible();
  await expect(page.locator("#passage-p2 mark")).toHaveCount(1);
  expect(await axeBlocking(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(resultRef(page, 2)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#passage-p2")).toBeFocused();
  await page.getByRole("button", { name: MSG.backToResult }).focus();
  await page.keyboard.press("Enter");
  await expect(resultRef(page, 2)).toBeFocused();

  // Reload shows the same Resultat; the complete Round's URL is replaced by Resultat's.
  await page.reload();
  await expect(resultH1(page)).toBeFocused();
  await expect(scoreLine(page)).toHaveText("3 av 4 riktige");
  await page.goto(roundPage);
  await expect(page).toHaveURL(resultUrl(BARE_HASH, String(done.roundId)));
  await expect(resultH1(page)).toBeFocused();

  // 'Tilbake til oversikten' → Notatoversikt with the stored states; the Round stays complete.
  await button(page, MSG.backToOverview).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/notat/${BARE_HASH}$`));
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  // Rank order: Normalisering, Første, Tredje, (Denormalisering: not covered), Funksjonell.
  await expect(masteryChips(page)).toHaveText(["kan", "usikker", "kan", "kan"]);
  await expect(page.getByText("ingen verifiserte elementer")).toHaveCount(1);
  const [after] = await readStore(page, "rounds");
  expect(after).toMatchObject({ status: "complete", completedAt: done.completedAt });
});

test("reload mid-Round: the first unanswered card, front side, with the stored chip", async ({ page }) => {
  await startRound(page);
  await markCard(page, 1, true);
  await markCard(page, 2, true);
  await page.reload();
  await expect(roundH1(page)).toBeFocused();
  await expect(cardHeading(page, 3)).toBeVisible();
  await expect(cardRegion(page, 3)).toContainText(front("k-forste"));
  await expect(button(page, MSG.reveal)).toBeVisible();
  await expect(page.locator("main").getByText("ny", { exact: true })).toBeVisible();
});

test("reference jump from a card: 'Viser P1 fra kort 1', 'Tilbake til kortet' returns focus to the reference", async ({ page }) => {
  await startRound(page);
  const ref = cardRegion(page).getByRole("button", { name: "Kilde: P1" });
  await ref.click();
  await expect(page.locator("#passage-p1")).toBeFocused();
  await expect(page.getByText("Viser P1 fra kort 1")).toBeVisible();
  await page.getByRole("button", { name: MSG.back }).click();
  await expect(ref).toBeFocused();

  // After reveal the reference sits under the Quote; Esc in the source panel returns to it.
  await button(page, MSG.reveal).click();
  await ref.click();
  await expect(page.locator("#passage-p1")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(ref).toBeFocused();

  // The next card starts without the previous card's return control or highlight.
  await button(page, MSG.known).click();
  await expect(cardHeading(page, 2)).toBeFocused();
  await expect(page.getByText("Viser P1 fra kort 1")).toHaveCount(0);
  await expect(page.locator("mark")).toHaveCount(0);
});

test("320 px: front, back and Quiz Question without horizontal scroll, axe clean; the jump switches tabs and back", async ({ page }) => {
  await startRound(page, { width: 320, longOption: true });
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await axeBlocking(page)).toEqual([]);
  await button(page, MSG.reveal).click();
  await expect(answer(page)).toBeFocused();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await axeBlocking(page)).toEqual([]);
  for (const name of [MSG.unknown, MSG.known]) {
    const box = await button(page, name).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  const ref = cardRegion(page).getByRole("button", { name: "Kilde: P1" });
  await ref.click();
  await expect(page.getByRole("tab", { name: MSG.source })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#passage-p1")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tab", { name: MSG.study })).toHaveAttribute("aria-selected", "true");
  await expect(ref).toBeFocused();

  await button(page, MSG.known).click();
  await expect(cardHeading(page, 2)).toBeFocused();
  for (let x = 2; x <= CARD_COUNT; x++) await markCard(page, x, true);
  await expect(questionHeading(page)).toBeFocused();
  await expect(page.getByRole("tab", { name: MSG.study })).toHaveAttribute("aria-selected", "true");
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await axeBlocking(page)).toEqual([]);

  // Story 2.3 at 320 px: options ≥ 44 px, the long option (LONG_OPTION) wraps; unanswered and answered
  // without horizontal scroll, axe clean.
  await expect(page.locator("main ul").getByRole("button", { name: new RegExp(LONG_OPTION.slice(0, 20)) })).toBeVisible();
  for (const l of "ABCD") expect((await optionButton(page, l).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  const qref = questionRegion(page).getByRole("button", { name: /^Kilde: P\d+$/ });
  await qref.click();
  await expect(page.getByRole("tab", { name: MSG.source })).toHaveAttribute("aria-selected", "true");
  // Esc is handled inside the source panel: wait until the jump has focused the Passage.
  await expect(page.locator('[id^="passage-"]:focus')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tab", { name: MSG.study })).toHaveAttribute("aria-selected", "true");
  await expect(qref).toBeFocused();
  await answerQuestion(page, 1, false);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await axeBlocking(page)).toEqual([]);
  // The answered question's Quote reference jumps too; Esc returns to it.
  const quoteRef = questionRegion(page).locator("figcaption").getByRole("button");
  await quoteRef.click();
  await expect(page.getByRole("tab", { name: MSG.source })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('[id^="passage-"]:focus')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(quoteRef).toBeFocused();
  await button(page, MSG.next).click();
  await expect(questionHeading(page, 2)).toBeFocused();
  await expect(page.getByRole("tab", { name: MSG.study })).toHaveAttribute("aria-selected", "true");
});

test("while a mark saves, both marks are aria-disabled and focus stays; one answer is stored", async ({ page }) => {
  await startRound(page);
  await button(page, MSG.reveal).click();
  await holdRoundPuts(page);
  await button(page, MSG.known).click();
  await expect(button(page, MSG.known)).toHaveAttribute("aria-disabled", "true");
  await expect(button(page, MSG.unknown)).toHaveAttribute("aria-disabled", "true");
  await expect(button(page, MSG.known)).toBeFocused();
  // Playwright will not click an aria-disabled button, so press it from the keyboard: it is ignored.
  await page.keyboard.press("Enter");
  await releaseRoundPuts(page);
  await expect(cardHeading(page, 2)).toBeFocused();
  const [round] = await readStore(page, "rounds");
  expect(round.answers).toHaveLength(1);
});

test("a mark pressed twice quickly stores one answer", async ({ page }) => {
  await startRound(page);
  await button(page, MSG.reveal).click();
  await button(page, MSG.known).dblclick();
  await expect(cardHeading(page, 2)).toBeFocused();
  const [round] = await readStore(page, "rounds");
  expect(round.answers).toHaveLength(1);
});

test("mark write fails: the card stays revealed with err.generation, nothing stored, the marks work again", async ({ page }) => {
  await startRound(page);
  await button(page, MSG.reveal).click();
  await page.evaluate(() => {
    const w = window as unknown as { e2eFail: boolean };
    w.e2eFail = true;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
      if (this.name === "rounds" && w.e2eFail) throw new DOMException("e2e", "DataError");
      return put.apply(this, args);
    };
  });
  await button(page, MSG.unknown).click();
  const alert = cardRegion(page).locator('[role="alert"]');
  await expect(alert).toHaveText(MSG.error);
  await expect(button(page, MSG.unknown)).toHaveAttribute("aria-describedby", "mark-error");
  await expect(answer(page)).toBeVisible();
  const [round] = await readStore(page, "rounds");
  expect(round.answers).toEqual([]);
  const progress = await readStore(page, "conceptProgress");
  expect(progress.every((p) => p.state === "new")).toBe(true);
  expect(await axeBlocking(page)).toEqual([]);

  await page.evaluate(() => {
    (window as unknown as { e2eFail: boolean }).e2eFail = false;
  });
  await button(page, MSG.unknown).click();
  await expect(cardHeading(page, 2)).toBeFocused();
  await expect(page.locator('main [role="alert"]')).toHaveCount(0);
});

test("a Round without Quiz Questions: the last mark completes it and returns to Notatoversikt", async ({ page }) => {
  await startRound(page, { quiz: false });
  for (let x = 1; x < CARD_COUNT; x++) await markCard(page, x, true);
  const roundPage = page.url();
  await button(page, MSG.reveal).click();
  await button(page, MSG.unknown).click();
  await expect(page).toHaveURL(new RegExp(`/notat/${BARE_HASH}$`));
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  const [round] = await readStore(page, "rounds");
  expect(round).toMatchObject({ status: "complete" });
  const answers = round.answers as { answeredAt: string }[];
  expect(answers).toHaveLength(CARD_COUNT);
  expect(round.completedAt).toBe(answers[CARD_COUNT - 1].answeredAt);
  // A complete Round is never shown again.
  await page.goto(roundPage);
  await expect(page.getByRole("heading", { level: 1, name: MSG.missing })).toBeFocused();
});

// ---- Story 2.3: Quiz Questions ----

test("Quiz Question: stem, 'Kilde: Pn', options A–D in optionOrder, no Quote; progress 'Runde 1 · Spørsmål 1 av 4' at 25 %", async ({ page }) => {
  await startRound(page);
  await expect(barFill(page)).toHaveAttribute("style", new RegExp(`width: ${100 / CARD_COUNT}%`));
  await markAllCards(page);
  const region = questionRegion(page);
  await expect(region).toContainText(stem("k-normalisering"));
  await expect(region).toContainText("Normalisering");
  await expect(region.getByRole("button", { name: "Kilde: P1" })).toBeVisible();
  const [round] = await readStore(page, "rounds");
  const order = (round.optionOrder as Record<string, number[]>)["k-normalisering.qq1"];
  await expect(page.locator("main ul").getByRole("button")).toHaveText(order.map((o, i) => `${"ABCD"[i]} ${OPTIONS[o]}`));
  await expect(region.locator("blockquote")).toHaveCount(0);
  await expect(region).not.toContainText(quote(PASSAGES[0]));
  await expect(feedback(page)).toHaveText("");
  await expect(roundH1(page)).toHaveText("Runde 1: quiz");
  await expect(questionHeading(page)).toBeFocused();
  await expect(barFill(page)).toHaveAttribute("style", /width: 25%/);
});

test("reload after answering question 1: 'Spørsmål 2 av 4', unanswered", async ({ page }) => {
  await startRound(page);
  await markAllCards(page);
  await answerQuestion(page, 1, true);
  await page.reload();
  await expect(roundH1(page)).toBeFocused();
  await expect(questionHeading(page, 2)).toBeVisible();
  await expect(questionRegion(page, 2)).toContainText(stem("k-forste"));
  await expect(feedback(page)).toHaveText("");
  await expect(page.locator("main ul").getByRole("button").first()).not.toHaveAttribute("aria-disabled");
  await expect(page.locator("main blockquote")).toHaveCount(0);
});

test("reference jump from a question: 'Viser P1 fra spørsmål 1', 'Tilbake til spørsmålet' before and after answering", async ({ page }) => {
  await startRound(page);
  await markAllCards(page);
  const ref = questionRegion(page).getByRole("button", { name: "Kilde: P1" }).first();
  await ref.click();
  await expect(page.locator("#passage-p1")).toBeFocused();
  await expect(page.getByText("Viser P1 fra spørsmål 1")).toBeVisible();
  await page.getByRole("button", { name: MSG.backToQuestion }).click();
  await expect(ref).toBeFocused();

  const letter = await answerQuestion(page, 1, false);
  await expect(optionButton(page, letter)).toBeFocused();
  await ref.click();
  await expect(page.locator("#passage-p1")).toBeFocused();
  await page.getByRole("button", { name: MSG.backToQuestion }).click();
  await expect(ref).toBeFocused();
  const quoteRef = questionRegion(page).locator("figcaption").getByRole("button", { name: "Kilde: P1" });
  await quoteRef.click();
  await expect(page.locator("#passage-p1")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(quoteRef).toBeFocused();
  // The feedback survives the jump; the next question starts without the return control.
  await expect(feedback(page)).not.toHaveText("");
  await button(page, MSG.next).click();
  await expect(questionHeading(page, 2)).toBeFocused();
  await expect(page.getByText("Viser P1 fra spørsmål 1")).toHaveCount(0);
});

test("while an answer saves, every option is aria-disabled and focus stays; a double press stores one answer", async ({ page }) => {
  await startRound(page);
  await markAllCards(page);
  const { letter } = await pick(page, 1, true);
  await holdRoundPuts(page);
  await optionButton(page, letter).click();
  for (const l of "ABCD") await expect(optionButton(page, l)).toHaveAttribute("aria-disabled", "true");
  await expect(optionButton(page, letter)).toBeFocused();
  await expect(feedback(page)).toHaveText("");
  await page.keyboard.press("Enter");
  await releaseRoundPuts(page);
  await expect(feedback(page)).toHaveText(MSG.correct);
  await button(page, MSG.next).click();
  await expect(questionHeading(page, 2)).toBeFocused();
  const second = await pick(page, 2, false);
  await optionButton(page, second.letter).dblclick();
  await expect(feedback(page)).toHaveText(`Feil. Rett svar er ${second.correctLetter}.`);
  const [round] = await readStore(page, "rounds");
  expect(round.answers).toHaveLength(CARD_COUNT + 2);
});

test("answer write fails: no feedback, err.generation, nothing stored, the options work again", async ({ page }) => {
  await startRound(page);
  await markAllCards(page);
  const before = await readStore(page, "conceptProgress");
  await page.evaluate(() => {
    const w = window as unknown as { e2eFail: boolean };
    w.e2eFail = true;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
      if (this.name === "rounds" && w.e2eFail) throw new DOMException("e2e", "DataError");
      return put.apply(this, args);
    };
  });
  const { letter } = await pick(page, 1, false);
  await optionButton(page, letter).click();
  const alert = questionRegion(page).locator('[role="alert"]');
  await expect(alert).toHaveText(MSG.error);
  for (const l of "ABCD") {
    await expect(optionButton(page, l)).toHaveAttribute("aria-describedby", "answer-error");
    await expect(optionButton(page, l)).not.toHaveAttribute("aria-disabled");
  }
  await expect(feedback(page)).toHaveText("");
  await expect(page.locator("main blockquote")).toHaveCount(0);
  const [round] = await readStore(page, "rounds");
  expect(round.answers).toHaveLength(CARD_COUNT);
  expect(await readStore(page, "conceptProgress")).toEqual(before);
  expect(await axeBlocking(page)).toEqual([]);

  await page.evaluate(() => {
    (window as unknown as { e2eFail: boolean }).e2eFail = false;
  });
  await optionButton(page, letter).click();
  await expect(feedback(page)).not.toHaveText("");
  await expect(page.locator('main [role="alert"]')).toHaveCount(0);
});

test("a quiz-only Round starts on 'Spørsmål 1 av 4'; the last answer completes it; 'Se resultatet' → Resultat, 2 av 4", async ({ page }) => {
  await startRound(page, { cards: false });
  await expect(page).toHaveTitle(`Runde 1, quiz · ${TITLE} · ${BRAND}`);
  await expect(questionHeading(page)).toBeVisible();
  await expect(page.getByRole("button", { name: MSG.reveal })).toHaveCount(0);
  await expect(barFill(page)).toHaveAttribute("style", /width: 25%/);
  for (let x = 1; x <= QUIZ_COUNT; x++) {
    await answerQuestion(page, x, x % 2 === 1, 0);
    if (x < QUIZ_COUNT) {
      await button(page, MSG.next).click();
      await expect(questionHeading(page, x + 1)).toBeFocused();
    }
  }
  await expect(button(page, MSG.next)).toHaveCount(0);
  const [round] = await readStore(page, "rounds");
  expect(round.status).toBe("complete");
  const answers = round.answers as { choice: number; answeredAt: string }[];
  expect(answers.map((a) => a.choice === CORRECT)).toEqual([true, false, true, false]);
  expect(round.completedAt).toBe(answers[QUIZ_COUNT - 1].answeredAt);
  const progress = await readStore(page, "conceptProgress");
  expect(Object.fromEntries(progress.map((p) => [p.keyConceptId, p.state]))).toEqual({
    "k-normalisering": "known",
    "k-forste": "shaky",
    "k-tredje": "known",
    "k-funksjonell": "shaky",
  });
  await button(page, MSG.result).click();
  await expect(page).toHaveURL(resultUrl(BARE_HASH, String(round.roundId)));
  await expect(resultH1(page)).toBeFocused();
  await expect(scoreLine(page)).toHaveText("2 av 4 riktige");
  await expectResultRows(page, round);
  // "Rett svar:" only on the 2 misses.
  await expect(page.locator("main").getByText(MSG.right)).toHaveCount(2);
});

test("320 px Resultat: no horizontal scroll, axe clean on both tabs; the row's jump switches tabs, Esc and the return control come back", async ({ page }) => {
  await startRound(page, { width: 320, cards: false, longOption: true });
  for (let x = 1; x <= QUIZ_COUNT; x++) {
    await answerQuestion(page, x, x % 2 === 1, 0);
    await button(page, x < QUIZ_COUNT ? MSG.next : MSG.result).click();
    if (x < QUIZ_COUNT) await expect(questionHeading(page, x + 1)).toBeFocused();
  }
  await expect(resultH1(page)).toBeFocused();
  await expect(scoreLine(page)).toHaveText("2 av 4 riktige");
  const [round] = await readStore(page, "rounds");
  await expectResultRows(page, round);
  await expect(page.getByRole("tab", { name: MSG.study })).toHaveAttribute("aria-selected", "true");
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await axeBlocking(page)).toEqual([]);

  // Question 2 (Første normalform, P2) is a miss.
  const ref = resultRef(page, 2);
  await ref.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tab", { name: MSG.source })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#passage-p2")).toBeFocused();
  await expect(page.getByText("Viser P2 fra resultatet")).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await axeBlocking(page)).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tab", { name: MSG.study })).toHaveAttribute("aria-selected", "true");
  await expect(ref).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("#passage-p2")).toBeFocused();
  await page.getByRole("button", { name: MSG.backToResult }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("tab", { name: MSG.study })).toHaveAttribute("aria-selected", "true");
  await expect(ref).toBeFocused();

  await button(page, MSG.backToOverview).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  await expect(masteryChips(page)).toHaveText(["kan", "usikker", "kan", "usikker"]);
});

test("Resultat bad URL: an active or an abandoned Round shows note.missing", async ({ page }) => {
  await startRound(page);
  const roundId = page.url().split("/runde/")[1];
  await page.goto(`/notat/${BARE_HASH}/runde/${roundId}/resultat`);
  await expect(page.getByRole("heading", { level: 1, name: MSG.missing })).toBeFocused();

  // A second start abandons the first Round.
  await page.goto(`/notat/${BARE_HASH}`);
  await startButton(page).click();
  await expect(roundH1(page, 2)).toBeFocused();
  await page.goto(`/notat/${BARE_HASH}/runde/${roundId}/resultat`);
  await expect(page.getByRole("heading", { level: 1, name: MSG.missing })).toBeFocused();
});

test("Notatoversikt: a failed progress read shows every chip 'ny', never an error", async ({ page }) => {
  await openOverview(page, {
    progress: [{ keyConceptId: "k-forste", state: "shaky", lastShownAt: "2026-11-20T08:00:00.000Z", lastUsedQuizQuestionId: null }],
  });
  await expect(masteryChips(page)).toHaveText(["ny", "usikker", "ny", "ny"]);
  // From the next load on, reading conceptProgress by its noteHash index throws.
  await page.addInitScript(() => {
    const getAll = IDBIndex.prototype.getAll;
    IDBIndex.prototype.getAll = function (this: IDBIndex, ...args: Parameters<IDBIndex["getAll"]>) {
      if (this.objectStore.name === "conceptProgress") throw new DOMException("e2e", "DataError");
      return getAll.apply(this, args);
    };
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  await expect(masteryChips(page)).toHaveText(["ny", "ny", "ny", "ny"]);
  await expect(page.locator('main [role="alert"]')).toHaveCount(0);
});

// ---- Story 2.5: the next Round ----

/** Plays Round 1 to Resultat: every card and question right except k-funksjonell's ('Kunne det ikke', a wrong choice). */
async function playToResult(page: Page) {
  for (let x = 1; x <= CARD_COUNT; x++) await markCard(page, x, x !== CARD_COUNT);
  for (let x = 1; x <= QUIZ_COUNT; x++) {
    await answerQuestion(page, x, x !== QUIZ_COUNT);
    await button(page, x < QUIZ_COUNT ? MSG.next : MSG.result).click();
    if (x < QUIZ_COUNT) await expect(questionHeading(page, x + 1)).toBeFocused();
  }
  await expect(resultH1(page)).toBeFocused();
  await expect(scoreLine(page)).toHaveText("3 av 4 riktige");
}

test("keyboard on Resultat: 'Tilbake til oversikten' → 'Ny runde' → 'Kilde: P1'; 'Ny runde' opens 'Runde 2', the shaky card first; axe clean; a reopened tab keeps the progress", async ({
  page,
  context,
}) => {
  await startRound(page);
  await playToResult(page);
  expect(await axeBlocking(page)).toEqual([]);

  await button(page, MSG.backToOverview).focus();
  await page.keyboard.press("Tab");
  const next = button(page, MSG.nextRound);
  await expect(next).toBeFocused();
  await expect(next).toHaveAttribute("data-variant", "secondary");
  await page.keyboard.press("Tab");
  await expect(resultRef(page, 1)).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(roundUrl(BARE_HASH));
  await expect(roundH1(page, 2)).toBeFocused();
  await expect(page).toHaveTitle(`Runde 2 · ${TITLE} · ${BRAND}`);
  // k-funksjonell (shaky) first, then max(1, round(0.2 × 1)) = 1 known: ties by rank → k-normalisering (2 cards).
  const first = page.getByRole("region", { name: "Kort 1 av 3" });
  await expect(first).toContainText(front("k-funksjonell"));
  await expect(page.locator("main").getByText("usikker", { exact: true })).toBeVisible();
  const rounds = await readStore(page, "rounds");
  const byNumber = Object.fromEntries(rounds.map((r) => [r.number as number, r]));
  expect(byNumber[1].status).toBe("complete");
  expect(byNumber[2]).toMatchObject({ status: "active", review: false, conceptIds: ["k-funksjonell", "k-normalisering"] });
  expect(await axeBlocking(page)).toEqual([]);

  // Close the tab and reopen the Note: the stored states and last-shown times are unchanged, the chips match.
  const progress = await readStore(page, "conceptProgress");
  await page.close();
  const reopened = await context.newPage();
  await reopened.setViewportSize({ width: 1280, height: 800 });
  await reopened.goto(`/notat/${BARE_HASH}`);
  await expect(reopened.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  await expect(masteryChips(reopened)).toHaveText(["kan", "kan", "kan", "usikker"]);
  expect(await readStore(reopened, "conceptProgress")).toEqual(progress);
});

test("320 px Resultat: the actions wrap, buttons ≥ 44 px, no horizontal scroll, axe clean; 'Ny runde' by keyboard opens 'Runde 2'", async ({ page }) => {
  await startRound(page, { width: 320 });
  await playToResult(page);
  const back = button(page, MSG.backToOverview);
  const next = button(page, MSG.nextRound);
  for (const b of [back, next]) {
    const box = (await b.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  expect(await axeBlocking(page)).toEqual([]);
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(roundH1(page, 2)).toBeFocused();
  await expect(page.getByRole("region", { name: "Kort 1 av 3" })).toContainText(front("k-funksjonell"));
});

test("'Ny runde' pending: aria-disabled, focus stays, one Round stored; a failed write stays on Resultat with err.generation and retry works", async ({ page }) => {
  await startRound(page);
  await playToResult(page);
  const resultAt = page.url();
  const next = button(page, MSG.nextRound);

  // The Round's put throws: nothing more is stored, Resultat stays with the inline error.
  await page.evaluate(() => {
    const w = window as unknown as { e2eFail: boolean };
    w.e2eFail = true;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore["put"]>) {
      if (this.name === "rounds" && w.e2eFail) throw new DOMException("e2e", "DataError");
      return put.apply(this, args);
    };
  });
  const before = { rounds: await readStore(page, "rounds"), progress: await readStore(page, "conceptProgress") };
  await next.click();
  const alert = page.locator('main [role="alert"]');
  await expect(alert).toHaveText(MSG.error);
  await expect(next).toBeFocused();
  await expect(next).not.toHaveAttribute("aria-disabled");
  expect(page.url()).toBe(resultAt);
  await expect(resultH1(page)).toBeVisible();
  expect({ rounds: await readStore(page, "rounds"), progress: await readStore(page, "conceptProgress") }).toEqual(before);
  expect(await axeBlocking(page)).toEqual([]);

  // Retry, held open: pending is aria-disabled with focus kept; a second press stores no second Round.
  await page.evaluate(() => {
    (window as unknown as { e2eFail: boolean }).e2eFail = false;
  });
  await holdRoundPuts(page);
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(next).toHaveAttribute("aria-disabled", "true");
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  await releaseRoundPuts(page);
  await expect(roundH1(page, 2)).toBeFocused();
  expect(await readStore(page, "rounds")).toHaveLength(2);
});
