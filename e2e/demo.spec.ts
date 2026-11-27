// Story 1.14: Demo Mode with the bundled sample notes (UJ-3; FR-5, FR-23, FR-24). The test stack is keyless
// and has no route out, so every generation here is served by the Proxy from proxy/fixtures/: nothing is
// stubbed and nothing reaches the provider. Each test starts in a fresh browser context.
// Story 2.5: the full UJ-1 loop on the Norwegian sample, with no key (FR-18, FR-23).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readStore, SETTINGS_KEY } from "./seed";

const SAMPLES = [
  { title: "Smidig utvikling og Scrum", noteHash: "2e473642b71bb22d923c1336d60124f5fe636517a5d70b5f89a49984c84f02b1" },
  { title: "Den digitale verden", noteHash: "f8e36750fbe1b1c4a6f36af4ed15ec4beb4ce3ec42e78c67cbb8e75baec453d0" },
  { title: "Unit testing", noteHash: "f0357a9021403b542c0ec830875e43b9af01359c8db9e054773bb85af10248ed" },
];
const MSG = {
  demoH1: "Velg et eksempelnotat",
  startH1: "Dine notater: ingen ennå",
  indicator: "Demomodus",
  demoOnly: "Demomodus støtter bare eksempelnotatene.",
  noKey: "Ingen API-nøkkel er satt opp. Bruk demomodus, eller legg inn en nøkkel i .env.",
  tryDemo: "Prøv demomodus",
};

const dialog = (page: Page) => page.getByRole("dialog", { name: "Før du starter" });
const banner = (page: Page) => page.getByRole("banner");
const indicator = (page: Page) => banner(page).getByRole("link", { name: MSG.indicator });
const demoSwitch = (page: Page) => page.getByRole("switch", { name: "Demomodus" });
const stored = (page: Page) =>
  page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }, SETTINGS_KEY);
const routeFor = (noteHash: string) => new RegExp(`/notat/demo(:|%3A)${noteHash}$`);

/** Every POST /api/study-set body the page sends. */
function recordStudySetBodies(page: Page) {
  const bodies: { mode: string; noteHash: string; passages: unknown[] }[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST" && new URL(req.url()).pathname === "/api/study-set") bodies.push(req.postDataJSON());
  });
  return bodies;
}

async function seedSettings(page: Page, settings: Record<string, unknown>) {
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem("e2e-seeded")) return;
      sessionStorage.setItem("e2e-seeded", "1");
      localStorage.setItem(key, value);
    },
    [SETTINGS_KEY, JSON.stringify({ schemaVersion: 1, ...settings })] as const,
  );
}

async function axeBlocking(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test("examiner path: decline → Demovelger → Norwegian sample → Notatoversikt with a working reference jump", async ({ page }) => {
  const bodies = recordStudySetBodies(page);
  await page.goto("/");
  await dialog(page).getByRole("button", { name: "Nei takk, vis demo" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { level: 1, name: MSG.demoH1 })).toBeFocused();
  await expect(page).toHaveTitle(`${MSG.demoH1} · Torsas læringsassistent`);
  await expect(indicator(page)).toHaveCount(0);
  for (const { title } of SAMPLES) await expect(page.getByRole("button", { name: new RegExp(`^${title}`) })).toBeVisible();

  const [scrum] = SAMPLES;
  await page.getByRole("button", { name: new RegExp(`^${scrum.title}`) }).click();
  await expect(page).toHaveURL(routeFor(scrum.noteHash), { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Sammendrag" })).toBeVisible();
  await expect(banner(page)).toContainText(scrum.title);
  await expect(indicator(page)).toBeVisible();

  const ref = page.getByRole("button", { name: /^Kilde: P\d+$/ }).first();
  await ref.click();
  await expect(page.locator("mark")).toHaveCount(1);

  expect(bodies.map((b) => [b.mode, b.noteHash, b.passages])).toEqual([["demo", scrum.noteHash, []]]);
  expect(await stored(page)).toEqual({ schemaVersion: 1, consent: "declined", demoMode: true });
});

test("'Prøv demomodus' on Start opens Demovelger; axe is clean there at 1280 and 320 px", async ({ page }) => {
  await seedSettings(page, { consent: "accepted" });
  await page.goto("/");
  await page.getByRole("link", { name: MSG.tryDemo }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { level: 1, name: MSG.demoH1 })).toBeFocused();
  await expect(page.getByRole("button", { name: new RegExp(`^${SAMPLES[0].title}`) })).toBeVisible();
  expect(await axeBlocking(page)).toEqual([]);
  await page.setViewportSize({ width: 320, height: 800 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(await axeBlocking(page)).toEqual([]);
});

for (const sample of SAMPLES) {
  test(`every sample generates from its Fixture with Consent accepted: ${sample.title}`, async ({ page }) => {
    const bodies = recordStudySetBodies(page);
    await seedSettings(page, { consent: "accepted" });
    await page.goto("/demo");
    await page.getByRole("button", { name: new RegExp(`^${sample.title}`) }).click();
    await expect(page).toHaveURL(routeFor(sample.noteHash), { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Sammendrag" })).toBeVisible();
    expect(bodies.map((b) => b.mode)).toEqual(["demo"]);
  });
}

test("indicator links to Innstillinger; the switch turns Demo Mode off and back on; axe clean", async ({ page }) => {
  await seedSettings(page, { consent: "declined", demoMode: true });
  await page.goto("/");
  await expect(indicator(page)).toBeVisible();
  await indicator(page).click();
  await expect(page).toHaveURL(/\/innstillinger$/);
  await expect(page.getByRole("heading", { level: 2, name: "Studier" })).toBeVisible();
  const toggle = demoSwitch(page);
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Bruk bare eksempelnotatene, uten kall til OpenRouter.")).toBeVisible();
  await expect(page.locator("main").getByText("På", { exact: true })).toBeVisible();
  expect(await axeBlocking(page)).toEqual([]);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("main").getByText("Av", { exact: true })).toBeVisible();
  await expect(indicator(page)).toHaveCount(0);
  expect(await stored(page)).toEqual({ schemaVersion: 1, consent: "declined", demoMode: false });

  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(indicator(page)).toBeVisible();

  await page.setViewportSize({ width: 320, height: 800 });
  await expect(indicator(page)).toBeVisible();
  expect(await axeBlocking(page)).toEqual([]);
});

test("Demovelger: a manifest that cannot be loaded shows err.generation, focused", async ({ page }) => {
  await seedSettings(page, { consent: "accepted" });
  await page.route("**/samples/manifest.json", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/demo");
  const alert = page.locator('main [role="alert"]');
  await expect(alert).toContainText("Feil: Det gikk ikke å lage kort og quiz nå.");
  await expect(alert).toBeFocused();
  await expect(page.getByRole("button", { name: new RegExp(`^${SAMPLES[0].title}`) })).toHaveCount(0);
});

test("Demovelger: a sample file that cannot be fetched shows err.unreadable; the list stays usable", async ({ page }) => {
  const bodies = recordStudySetBodies(page);
  await seedSettings(page, { consent: "accepted" });
  await page.route("**/samples/nb-smidig-scrum.md", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/demo");
  const scrum = page.getByRole("button", { name: new RegExp(`^${SAMPLES[0].title}`) });
  await scrum.click();
  const alert = page.locator('main [role="alert"]');
  await expect(alert).toContainText("Feil: Filen kunne ikke leses. Prøv å lagre den på nytt, eller lim inn teksten.");
  await expect(alert).toBeFocused();
  await expect(scrum).not.toHaveAttribute("aria-disabled", "true");
  expect(bodies).toEqual([]);

  const other = SAMPLES[1];
  await page.getByRole("button", { name: new RegExp(`^${other.title}`) }).click();
  await expect(page).toHaveURL(routeFor(other.noteHash), { timeout: 30_000 });
  expect(bodies.map((b) => b.mode)).toEqual(["demo"]);
});

test("own upload in Demo Mode: validated first, then err.demoOnly inline at the drop zone", async ({ page }) => {
  const bodies = recordStudySetBodies(page);
  await seedSettings(page, { consent: "declined", demoMode: true });
  await page.goto("/");
  const input = page.getByLabel("Slipp en fil her eller velg fil");

  // FR-3 first: an unusable file is rejected before any request.
  await input.setInputFiles({ name: "kort.txt", mimeType: "text/plain", buffer: Buffer.from("For kort.") });
  await expect(page.locator('main [role="alert"]')).toContainText("Notatet er for kort.");
  expect(bodies).toEqual([]);

  const words = Array.from({ length: 200 }, (_, i) => `ord${i}`).join(" ");
  await input.setInputFiles({ name: "eget.txt", mimeType: "text/plain", buffer: Buffer.from(`Mitt eget notat. ${words}.`) });
  const alert = page.locator('main [role="alert"]');
  await expect(alert).toContainText(`Feil: ${MSG.demoOnly}`);
  await expect(alert).toBeFocused();
  await expect(page.getByRole("heading", { level: 1, name: MSG.startH1 })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("eget.txt");
  // Consent declined: the own Note's text never leaves the browser (epic-1 retro R1, D-21).
  expect(bodies.map((b) => [b.mode, b.passages])).toEqual([["demo", []]]);
});

test("Demo off again with Consent accepted and no key: err.noKey on Start, nothing sent", async ({ page }) => {
  const bodies = recordStudySetBodies(page);
  await seedSettings(page, { consent: "accepted", demoMode: false });
  await page.goto("/");
  await expect(indicator(page)).toHaveCount(0);
  const words = Array.from({ length: 200 }, (_, i) => `ord${i}`).join(" ");
  await page
    .getByLabel("Slipp en fil her eller velg fil")
    .setInputFiles({ name: "eget.txt", mimeType: "text/plain", buffer: Buffer.from(`Mitt eget notat. ${words}.`) });
  await expect(page.locator('main [role="alert"]')).toContainText(MSG.noKey);
  expect(bodies).toEqual([]);
});

/** Every `/api/` request the page sends, as "METHOD /path". */
function recordApiRequests(page: Page) {
  const seen: string[] = [];
  page.on("request", (req) => {
    const { pathname } = new URL(req.url());
    if (pathname.startsWith("/api/")) seen.push(`${req.method()} ${pathname}`);
  });
  return seen;
}

type StoredConcept = {
  id: string;
  flashcards: { id: string; front: string }[];
  quizQuestions: { id: string; correctIndex: number }[];
};

test("Demo loop, no key: Norwegian sample → cards → quiz → Resultat → jump → 'Ny runde'; Round 2 starts with the concepts marked wrong; 'Start runde' then opens Round 3", async ({
  page,
}) => {
  const api = recordApiRequests(page);
  const bodies = recordStudySetBodies(page);
  await page.goto("/");
  await dialog(page).getByRole("button", { name: "Nei takk, vis demo" }).click();
  const [scrum] = SAMPLES;
  await page.getByRole("button", { name: new RegExp(`^${scrum.title}`) }).click();
  await expect(page).toHaveURL(routeFor(scrum.noteHash), { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Sammendrag" })).toBeVisible();

  const main = page.locator("main");
  const btn = (name: string) => main.getByRole("button", { name, exact: true });
  await btn("Start runde").click();
  await expect(page.getByRole("heading", { level: 1, name: "Runde 1" })).toBeFocused();

  const [studySet] = await readStore(page, "studySets");
  const concepts = new Map((studySet.concepts as StoredConcept[]).map((c) => [c.id, c]));
  const [round] = await readStore(page, "rounds");
  const itemIds = round.itemIds as string[];
  const conceptIds = round.conceptIds as string[];
  const order = round.optionOrder as Record<string, number[]>;
  expect(conceptIds.length).toBeGreaterThanOrEqual(4);
  // Mark the second and the fourth concept wrong (card and question); the rest right.
  const wrong = [conceptIds[1], conceptIds[3]];
  const cards = itemIds.filter((id) => id.includes(".fc"));
  const questions = itemIds.filter((id) => id.includes(".qq"));
  expect(cards.length).toBeGreaterThan(0);
  expect(questions.length).toBeGreaterThan(0);

  for (const [i, id] of cards.entries()) {
    const right = !wrong.includes(id.split(".")[0]);
    // The Round opens with focus on its h1; each later card's heading takes focus after the mark.
    const heading = page.getByRole("heading", { level: 2, name: `Kort ${i + 1} av ${cards.length}` });
    await (i === 0 ? expect(heading).toBeVisible() : expect(heading).toBeFocused());
    await btn("Snu kortet").click();
    await btn(right ? "Kunne det" : "Kunne det ikke").click();
  }
  for (const [i, id] of questions.entries()) {
    await expect(page.getByRole("heading", { level: 2, name: `Spørsmål ${i + 1} av ${questions.length}` })).toBeFocused();
    const conceptId = id.split(".")[0];
    const correct = concepts.get(conceptId)!.quizQuestions.find((q) => q.id === id)!.correctIndex;
    const choice = wrong.includes(conceptId) ? order[id].find((o) => o !== correct)! : correct;
    await main.locator("ul").getByRole("button", { name: new RegExp(`^${"ABCD"[order[id].indexOf(choice)]} `) }).click();
    await expect(main.locator('[aria-live="polite"]')).not.toHaveText("");
    await btn(i < questions.length - 1 ? "Neste spørsmål" : "Se resultatet").click();
  }

  await expect(page.getByRole("heading", { level: 1, name: "Resultat", exact: true })).toBeFocused();
  const wrongQuestions = questions.filter((id) => wrong.includes(id.split(".")[0])).length;
  await expect(main.locator("h1 + p")).toHaveText(`${questions.length - wrongQuestions} av ${questions.length} riktige`);

  // The reference jump from the first row, and back.
  const ref = page.getByRole("region", { name: "Spørsmål 1", exact: true }).locator("figcaption").getByRole("button");
  await ref.click();
  await expect(page.locator("mark")).toHaveCount(1);
  await page.getByRole("button", { name: "Tilbake til resultatet" }).click();
  await expect(ref).toBeFocused();

  await btn("Ny runde").click();
  await expect(page.getByRole("heading", { level: 1, name: "Runde 2" })).toBeFocused();
  const second = (await readStore(page, "rounds")).find((r) => r.number === 2)!;
  expect((second.conceptIds as string[]).slice(0, 2)).toEqual(wrong);
  expect(concepts.get(wrong[0])!.flashcards.length).toBeGreaterThan(0);
  const firstCard = concepts.get(wrong[0])!.flashcards[0];
  expect((second.itemIds as string[])[0]).toBe(firstCard.id);
  await expect(page.getByRole("region", { name: /^Kort 1 av \d+$/ })).toContainText(firstCard.front);
  await expect(main.getByText("usikker", { exact: true })).toBeVisible();

  // 'Start runde' from Notatoversikt: Round 3 (Round 2 becomes abandoned), never stuck.
  await page.goto(`/notat/demo:${scrum.noteHash}`);
  await btn("Start runde").click();
  await expect(page.getByRole("heading", { level: 1, name: "Runde 3" })).toBeFocused();
  expect((await readStore(page, "rounds")).find((r) => r.number === 2)).toMatchObject({ status: "abandoned" });

  // Nothing but the status check and the demo generation reached /api/.
  expect([...new Set(api)].sort()).toEqual(["GET /api/status", "POST /api/study-set"]);
  expect(bodies.map((b) => [b.mode, b.noteHash])).toEqual([["demo", scrum.noteHash]]);
});
