// Story 1.14: Demo Mode with the bundled sample notes (UJ-3; FR-5, FR-23, FR-24). The test stack is keyless
// and has no route out, so every generation here is served by the Proxy from proxy/fixtures/: nothing is
// stubbed and nothing reaches the provider. Each test starts in a fresh browser context.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SETTINGS_KEY } from "./seed";

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
  const bodies: { mode: string; noteHash: string }[] = [];
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

  expect(bodies.map((b) => [b.mode, b.noteHash])).toEqual([["demo", scrum.noteHash]]);
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
  expect(bodies.map((b) => b.mode)).toEqual(["demo"]);
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
