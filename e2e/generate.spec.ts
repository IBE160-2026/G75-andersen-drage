// Story 1.9: upload → Genererer → one live POST → verified Study Set stored → Notatoversikt
// (spec I/O & Edge-Case Matrix; FR-5, FR-8, FR-11). Story 1.10: the failure view, 'Prøv igjen',
// double submit and reload mid-generation (FR-10, FR-24, NFR-8). The test stack is keyless, so /api/status and
// /api/study-set are stubbed here; nothing reaches the provider. The 90 s timeout, abort and the
// single-flight map are covered by Vitest (web/api/studySet.test.ts).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { seedConsent } from "./seed";

const FIXTURE = "nb-smidig-scrum.md";
const TITLE = "nb-smidig-scrum";
const MODEL = "anthropic/claude-haiku-5.5";
const PROMPT_VERSION = "2";
const BRAND = "Torsas læringsassistent";
const MSG = {
  generating: "Lager kort og quiz",
  concepts: "Finner nøkkelbegreper …",
  generation: "Det gikk ikke å lage kort og quiz nå.",
  tooFewItems: "For få kort eller spørsmål kunne knyttes til notatet ditt.",
  noKey: "Ingen API-nøkkel er satt opp. Bruk demomodus, eller legg inn en nøkkel i .env.",
  back: "Tilbake til start",
  retry: "Prøv igjen",
  startH1: "Dine notater: ingen ennå",
  declined: "Du har ikke godtatt at notater sendes til OpenRouter. Du kan bruke demomodus, eller godta nå.",
  missing: "Fant ikke notatet",
};

type Passage = { id: string; text: string };
type Body = { mode: string; noteHash: string; passages: Passage[] };

const input = (page: Page) => page.getByLabel("Slipp en fil her eller velg fil");
const alert = (page: Page) => page.locator('main [role="alert"]');

/** A StudySet whose Quotes are the opening words of the Note's own Passages, so each passes the Quote Check. */
function studySetFor(passages: Passage[]) {
  const usable = passages.filter((p) => [...p.text].length >= 80).slice(0, 6);
  if (usable.length < 6) throw new Error("fixture Note has too few long Passages");
  const quote = (p: Passage) => p.text.slice(0, 60);
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

let studySetRequests: Body[];

/** A promise that settles when `release()` is called: holds a stubbed POST open. */
function hold() {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  return { held, release };
}

/** Serious and critical axe violations on the current view. */
async function axeBlocking(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

/** The failure view: focused alert with `text`; Tab goes 'Prøv igjen' (when shown) → 'Tilbake til start'. */
async function expectFailureView(page: Page, text: string, retry: boolean) {
  await expect(alert(page)).toContainText(`Feil: ${text}`);
  await expect(page.locator("#generation-error")).toBeFocused();
  await expect(page.getByRole("heading", { level: 1, name: MSG.generating })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: MSG.retry })).toHaveCount(retry ? 1 : 0);
  await page.keyboard.press("Tab");
  if (retry) {
    await expect(page.getByRole("button", { name: MSG.retry })).toBeFocused();
    await page.keyboard.press("Tab");
  }
  await expect(page.getByRole("button", { name: MSG.back })).toBeFocused();
}

async function expectNothingStored(page: Page) {
  const { noteHash } = studySetRequests[0];
  const stored = await storedRecords(page, noteHash, `${noteHash}:${PROMPT_VERSION}:${MODEL}`);
  expect(stored.counts).toEqual([0, 0]);
}

async function stubStatus(page: Page, keyConfigured: boolean) {
  await page.route("**/api/status", (route) =>
    route.fulfill({ json: { keyConfigured, model: MODEL, provider: "OpenRouter", promptVersion: PROMPT_VERSION } }),
  );
}

/** Stubs /api/study-set; `answer` decides the response from the request body. */
async function stubStudySet(page: Page, answer: (body: Body, route: Route) => Promise<void>) {
  await page.route("**/api/study-set", (route) => answer(route.request().postDataJSON() as Body, route));
}

/** The stored records, read straight from IndexedDB. A database that was never created counts as empty. */
function storedRecords(page: Page, noteHash: string, cacheKey: string) {
  return page.evaluate(
    async ([noteHash, cacheKey]) => {
      const exists = (await indexedDB.databases()).some((d) => d.name === "torsa");
      if (!exists) return { note: undefined, studySet: undefined, counts: [0, 0] };
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open("torsa", 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const get = <T,>(store: string, op: (s: IDBObjectStore) => IDBRequest<T>) =>
        new Promise<T>((resolve, reject) => {
          const req = op(db.transaction(store, "readonly").objectStore(store));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      const result = {
        note: await get("notes", (s) => s.get(noteHash)),
        studySet: await get("studySets", (s) => s.get(cacheKey)),
        counts: [await get("notes", (s) => s.count()), await get("studySets", (s) => s.count())],
      };
      db.close();
      return result;
    },
    [noteHash, cacheKey] as const,
  );
}

/** Start, once the stubbed /api/status has answered: until then the gate counts as no key. */
async function gotoStartWithStatus(page: Page) {
  const status = page.waitForResponse("**/api/status");
  await page.goto("/");
  await status;
  await expect(page.getByRole("heading", { level: 1, name: MSG.startH1 })).toBeFocused();
}

async function upload(page: Page) {
  await input(page).setInputFiles({
    name: FIXTURE,
    buffer: readFileSync(join(__dirname, "..", "reference-notes", FIXTURE)),
    mimeType: "application/octet-stream",
  });
}

test.beforeEach(async ({ page }) => {
  studySetRequests = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/study-set")) studySetRequests.push(req.postDataJSON() as Body);
  });
});

test("happy: Genererer, exactly 1 POST, both records stored, then Notatoversikt with the title as h1", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await stubStudySet(page, async (body, route) => {
    await held;
    await route.fulfill({ json: studySetFor(body.passages) });
  });
  await gotoStartWithStatus(page);
  await upload(page);

  // Genererer, while the POST is held.
  await expect(page.getByRole("heading", { level: 1, name: MSG.generating })).toBeFocused();
  await expect(page).toHaveTitle(`${MSG.generating} · ${FIXTURE} · ${BRAND}`);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("progressbar", { name: "Fremdrift" })).toBeVisible();
  await expect(page.locator('main [role="status"]')).toHaveText(MSG.concepts);
  await expect(page.getByText(new RegExp(`^${FIXTURE.replace(/\./g, "\\.")} · \\d[\\d\\s]* ord · \\d[\\d\\s]* avsnitt$`))).toBeVisible();
  // The drop zone is gone: no second submit while pending.
  await expect(input(page)).toHaveCount(0);
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(blocking).toEqual([]);

  release();
  await expect(page).toHaveURL(/\/notat\/[0-9a-f]{64}$/);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  await expect(page).toHaveTitle(`${TITLE} · ${BRAND}`);

  expect(studySetRequests).toHaveLength(1);
  const [body] = studySetRequests;
  expect(body.mode).toBe("live");
  expect(page.url()).toContain(`/notat/${body.noteHash}`);
  const cacheKey = `${body.noteHash}:${PROMPT_VERSION}:${MODEL}`;
  const stored = await storedRecords(page, body.noteHash, cacheKey);
  expect(stored.counts).toEqual([1, 1]);
  expect(stored.note).toMatchObject({
    schemaVersion: 1,
    noteHash: body.noteHash,
    title: TITLE,
    sourceType: "md",
    passages: body.passages,
    currentCacheKey: cacheKey,
    archived: false,
    importanceLevel: 2,
    lastPractisedAt: null,
  });
  expect(stored.studySet).toMatchObject({ schemaVersion: 1, noteHash: body.noteHash, cacheKey, language: "nb", model: MODEL });
  const set = stored.studySet as { concepts: { id: string; covered: boolean }[]; summaryPoints: unknown[] };
  expect(set.concepts.map((c) => c.id)).toEqual(["k-begrep-1", "k-begrep-2", "k-begrep-3", "k-begrep-4", "k-begrep-5"]);
  expect(set.concepts.every((c) => c.covered)).toBe(true);
  expect(set.summaryPoints).toHaveLength(5);

  // The overview reads the stored Note on reload too.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  expect(studySetRequests).toHaveLength(1);
});

test("HTTP 502: err.generation on Genererer, focused, with 'Prøv igjen'; nothing stored; 'Tilbake til start' returns to Start", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  await stubStudySet(page, (_body, route) => route.fulfill({ status: 502, json: { code: "err.generation" } }));
  await gotoStartWithStatus(page);
  await upload(page);

  await expectFailureView(page, MSG.generation, true);
  expect(await axeBlocking(page)).toEqual([]);
  expect(studySetRequests).toHaveLength(1);
  await expectNothingStored(page);

  await page.getByRole("button", { name: MSG.back }).click();
  await expect(page.getByRole("heading", { level: 1, name: MSG.startH1 })).toBeFocused();
  await expect(input(page)).toBeVisible();
});

test("verify fails: a StudySet whose Quotes are not in the Note gives err.generation; nothing stored", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  await stubStudySet(page, async (body, route) => {
    const set = studySetFor(body.passages);
    // Every Quote invented: the Quote Check drops all Items, so verifyStudySet returns not ok.
    const invent = <T extends { quote: string }>(item: T) => ({ ...item, quote: "Dette sitatet finnes ikke i notatet i det hele tatt." });
    await route.fulfill({
      json: {
        ...set,
        concepts: set.concepts.map((c) => ({ ...c, flashcards: c.flashcards.map(invent), quizQuestions: c.quizQuestions.map(invent) })),
        summaryPoints: set.summaryPoints.map(invent),
      },
    });
  });
  await gotoStartWithStatus(page);
  await upload(page);

  await expectFailureView(page, MSG.generation, true);
  expect(studySetRequests).toHaveLength(1);
  await expectNothingStored(page);
});

test("retry: 502, then 'Prøv igjen', then a valid answer: progress view again, Notatoversikt, 2 POSTs in total", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  const second = hold();
  let calls = 0;
  await stubStudySet(page, async (body, route) => {
    if (++calls === 1) return route.fulfill({ status: 502, json: { code: "err.generation" } });
    await second.held;
    await route.fulfill({ json: studySetFor(body.passages) });
  });
  await gotoStartWithStatus(page);
  await upload(page);
  await expectFailureView(page, MSG.generation, true);

  await page.getByRole("button", { name: MSG.retry }).click();
  await expect(alert(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: MSG.generating })).toBeFocused();
  await expect(page.getByRole("progressbar", { name: "Fremdrift" })).toHaveAttribute("value", "0");
  await expect(page.locator('main [role="status"]')).toHaveText(MSG.concepts);
  await expect.poll(() => studySetRequests.length).toBe(2);
  expect(studySetRequests[1].noteHash).toBe(studySetRequests[0].noteHash);

  second.release();
  await expect(page).toHaveURL(/\/notat\/[0-9a-f]{64}$/);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  expect(studySetRequests).toHaveLength(2);
});

test("retry twice: 502, 'Prøv igjen', 502, 'Prøv igjen', then valid: focused again, button live, 3 POSTs", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  let calls = 0;
  await stubStudySet(page, async (body, route) => {
    if (++calls <= 2) return route.fulfill({ status: 502, json: { code: "err.generation" } });
    await route.fulfill({ json: studySetFor(body.passages) });
  });
  await gotoStartWithStatus(page);
  await upload(page);
  await expectFailureView(page, MSG.generation, true);

  await page.getByRole("button", { name: MSG.retry }).click();
  await expect.poll(() => studySetRequests.length).toBe(2);
  // The second failure is announced and focused again, and 'Prøv igjen' works again.
  await expectFailureView(page, MSG.generation, true);
  const retry = page.getByRole("button", { name: MSG.retry });
  await expect(retry).not.toHaveAttribute("aria-disabled");
  await retry.click();

  await expect(page).toHaveURL(/\/notat\/[0-9a-f]{64}$/);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  expect(studySetRequests).toHaveLength(3);
});

test("double retry: 'Prøv igjen' double-clicked while the next POST is held gives exactly 1 new POST", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  const next = hold();
  let calls = 0;
  await stubStudySet(page, async (body, route) => {
    if (++calls === 1) return route.fulfill({ status: 502, json: { code: "err.generation" } });
    await next.held;
    await route.fulfill({ json: studySetFor(body.passages) });
  });
  await gotoStartWithStatus(page);
  await upload(page);
  await expectFailureView(page, MSG.generation, true);

  await page.getByRole("button", { name: MSG.retry }).dblclick();
  await expect(page.getByRole("progressbar", { name: "Fremdrift" })).toBeVisible();
  await expect.poll(() => studySetRequests.length).toBe(2);
  await page.waitForTimeout(500);
  expect(studySetRequests).toHaveLength(2);

  next.release();
  await expect(page).toHaveURL(/\/notat\/[0-9a-f]{64}$/);
  expect(studySetRequests).toHaveLength(2);
});

test("too few Items: fewer than 5 surviving Quiz Questions gives err.tooFewItems with both buttons; nothing stored, no new POST", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  await stubStudySet(page, async (body, route) => {
    const set = studySetFor(body.passages);
    // Quotes stay valid; duplicate options drop the first concept's only Quiz Question (4 of 5 survive).
    const [first, ...rest] = set.concepts;
    const dropped = { ...first, quizQuestions: first.quizQuestions.map((q) => ({ ...q, options: ["Ja", "Ja", "Nei", "Kanskje"] })) };
    await route.fulfill({ json: { ...set, concepts: [dropped, ...rest] } });
  });
  await gotoStartWithStatus(page);
  await upload(page);

  await expectFailureView(page, MSG.tooFewItems, true);
  expect(await axeBlocking(page)).toEqual([]);
  await expectNothingStored(page);
  // No automatic retry.
  await page.waitForTimeout(2_000);
  expect(studySetRequests).toHaveLength(1);
});

test("Proxy 503 err.noKey (key removed after startup): err.noKey with 'Tilbake til start' only", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  await stubStudySet(page, (_body, route) => route.fulfill({ status: 503, json: { code: "err.noKey" } }));
  await gotoStartWithStatus(page);
  await upload(page);

  await expectFailureView(page, MSG.noKey, false);
  expect(studySetRequests).toHaveLength(1);
  await expectNothingStored(page);

  await page.getByRole("button", { name: MSG.back }).click();
  await expect(page.getByRole("heading", { level: 1, name: MSG.startH1 })).toBeFocused();
});

test("reload while the POST is held: Start, nothing stored; uploading again sends 1 POST and succeeds", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  const never = hold();
  let calls = 0;
  await stubStudySet(page, async (body, route) => {
    if (++calls === 1) {
      // Held until the reload has killed the request; it is never answered.
      await never.held;
      return route.abort().catch(() => undefined);
    }
    await route.fulfill({ json: studySetFor(body.passages) });
  });
  await gotoStartWithStatus(page);
  await upload(page);
  await expect(page.getByRole("heading", { level: 1, name: MSG.generating })).toBeFocused();
  await expect.poll(() => studySetRequests.length).toBe(1);

  const status = page.waitForResponse("**/api/status");
  await page.reload();
  await status;
  // The reload killed the request; let the held handler finish instead of hanging.
  never.release();
  await expect(page.getByRole("heading", { level: 1, name: MSG.startH1 })).toBeFocused();
  await expect(page).toHaveURL(/\/$/);
  await expectNothingStored(page);

  await upload(page);
  await expect(page).toHaveURL(/\/notat\/[0-9a-f]{64}$/);
  expect(studySetRequests).toHaveLength(2);
  expect(studySetRequests[1].noteHash).toBe(studySetRequests[0].noteHash);
  const { noteHash } = studySetRequests[0];
  const stored = await storedRecords(page, noteHash, `${noteHash}:${PROMPT_VERSION}:${MODEL}`);
  expect(stored.counts).toEqual([1, 1]);
});

test("double drop: two drops at once, and a drop on Genererer, give exactly 1 POST", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  const answer = hold();
  await stubStudySet(page, async (body, route) => {
    await answer.held;
    await route.fulfill({ json: studySetFor(body.passages) });
  });
  await gotoStartWithStatus(page);
  const text = readFileSync(join(__dirname, "..", "reference-notes", FIXTURE), "utf8");
  const drop = (target: "zone" | "body") =>
    page.evaluate(
      ([name, text, target]) => {
        const el = target === "zone" ? document.querySelector("label[for=note-file]")! : document.body;
        const event = () => {
          const dt = new DataTransfer();
          dt.items.add(new File([text], name));
          return new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt });
        };
        // Two drops in the same task: the second arrives before React re-renders.
        const first = event();
        el.dispatchEvent(first);
        el.dispatchEvent(event());
        return first.defaultPrevented;
      },
      [FIXTURE, text, target] as const,
    );
  await drop("zone");
  await expect(page.getByRole("heading", { level: 1, name: MSG.generating })).toBeFocused();
  await expect(input(page)).toHaveCount(0);
  // On Genererer a dropped file is not opened by the browser and starts nothing.
  expect(await drop("body")).toBe(true);
  await expect.poll(() => studySetRequests.length).toBe(1);
  await page.waitForTimeout(500);
  expect(studySetRequests).toHaveLength(1);

  answer.release();
  await expect(page).toHaveURL(/\/notat\/[0-9a-f]{64}$/);
  expect(studySetRequests).toHaveLength(1);
});

test("gate: Consent declined with a key configured stays on Start with consent.declined inline; no request", async ({ page }) => {
  await seedConsent(page, "declined");
  await stubStatus(page, true);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: MSG.startH1 })).toBeFocused();
  await upload(page);
  await expect(alert(page)).toHaveText(`Feil: ${MSG.declined}`);
  await expect(page.locator("#note-file-error")).toBeFocused();
  await expect(page.locator('main [role="status"]')).toContainText(FIXTURE);
  await expect(page.getByRole("heading", { level: 1, name: MSG.startH1 })).toBeVisible();
  expect(studySetRequests).toEqual([]);

  // Accepting from the inline link resolves the gate error; nothing is sent until the next file.
  await alert(page).getByRole("button", { name: "godta nå" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Jeg forstår, fortsett" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(alert(page)).toHaveCount(0);
  expect(studySetRequests).toEqual([]);
});

test("leaving Genererer while the POST is pending: the late answer is not stored", async ({ page }) => {
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  let answered!: () => void;
  const settled = new Promise<void>((resolve) => (answered = resolve));
  await stubStudySet(page, async (body, route) => {
    await held;
    // The page aborted the request on unmount, so fulfilling may fail.
    await route.fulfill({ json: studySetFor(body.passages) }).catch(() => undefined);
    answered();
  });
  await gotoStartWithStatus(page);
  await upload(page);
  await expect(page.getByRole("heading", { level: 1, name: MSG.generating })).toBeFocused();
  await expect.poll(() => studySetRequests.length).toBe(1);

  await page.getByRole("link", { name: "Innstillinger" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Innstillinger" })).toBeFocused();
  release();
  await settled;
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/innstillinger$/);
  const { noteHash } = studySetRequests[0];
  const stored = await storedRecords(page, noteHash, `${noteHash}:${PROMPT_VERSION}:${MODEL}`);
  expect(stored.counts).toEqual([0, 0]);
});

test("time-based steps: after 15 s the status is 'Lager kort …' and the bar has moved", async ({ page }) => {
  await page.clock.install();
  await seedConsent(page, "accepted");
  await stubStatus(page, true);
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await stubStudySet(page, async (body, route) => {
    await held;
    await route.fulfill({ json: studySetFor(body.passages) });
  });
  await gotoStartWithStatus(page);
  await upload(page);
  const status = page.locator('main [role="status"]');
  const bar = page.getByRole("progressbar", { name: "Fremdrift" });
  await expect(status).toHaveText(MSG.concepts);

  await page.clock.runFor(15_000);
  await expect(status).toHaveText("Lager kort …");
  const value = Number(await bar.getAttribute("value"));
  expect(value).toBeGreaterThan(0);
  expect(value).toBeLessThanOrEqual(90);

  release();
  await expect(page).toHaveURL(/\/notat\/[0-9a-f]{64}$/);
  expect(studySetRequests).toHaveLength(1);
});

test("Notatoversikt for a Note that is not stored: empty state with a way back to Start", async ({ page }) => {
  await seedConsent(page, "accepted");
  await page.goto(`/notat/${"0".repeat(64)}`);
  await expect(page.getByRole("heading", { level: 1, name: MSG.missing })).toBeFocused();
  await page.getByRole("link", { name: MSG.back }).click();
  await expect(page.getByRole("heading", { level: 1, name: MSG.startH1 })).toBeFocused();
});

// Epic 1 retrospective R5: a file dropped before /api/status answers waits for it at the gate.
async function holdStatus(page: Page, keyConfigured: boolean) {
  const { held, release } = hold();
  await page.route("**/api/status", async (route) => {
    await held;
    await route.fulfill({ json: { keyConfigured, model: MODEL, provider: "OpenRouter", promptVersion: PROMPT_VERSION } });
  });
  return release;
}

const noteMeta = (page: Page) => page.getByText(new RegExp(`^${FIXTURE.replace(/\./g, String.raw`\.`)} · `));

test("status not answered yet, key configured: the gate waits, no err.noKey; then Genererer and exactly 1 POST", async ({ page }) => {
  await seedConsent(page, "accepted");
  const release = await holdStatus(page, true);
  await stubStudySet(page, (body, route) => route.fulfill({ json: studySetFor(body.passages) }));
  const statusRequested = page.waitForRequest("**/api/status");
  await page.goto("/");
  await statusRequested;
  await upload(page);

  // Extracted (the meta shows) while the status is held: still on Start, no error, nothing sent.
  await expect(noteMeta(page)).toBeVisible();
  await expect(alert(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1, name: MSG.generating })).toHaveCount(0);
  expect(studySetRequests).toHaveLength(0);

  release();
  await expect(page).toHaveURL(/\/notat\/[0-9a-f]{64}$/);
  await expect(page.getByRole("heading", { level: 1, name: TITLE })).toBeFocused();
  expect(studySetRequests).toHaveLength(1);
});

test("status not answered yet, no key: the gate waits, then err.noKey inline at the drop zone; no request", async ({ page }) => {
  await seedConsent(page, "accepted");
  const release = await holdStatus(page, false);
  const statusRequested = page.waitForRequest("**/api/status");
  await page.goto("/");
  await statusRequested;
  await upload(page);

  await expect(noteMeta(page)).toBeVisible();
  await expect(alert(page)).toHaveCount(0);

  release();
  await expect(alert(page)).toContainText(`Feil: ${MSG.noKey}`);
  await expect(alert(page)).toBeFocused();
  expect(studySetRequests).toHaveLength(0);
});
