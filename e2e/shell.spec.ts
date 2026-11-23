// Story 1.2: Norwegian app shell (spec I/O & Edge-Case Matrix, NFR-6, NFR-7, NFR-9).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { seedConsent } from "./seed";

const ROUTES = [
  { path: "/", h1: "Dine notater: ingen ennå", title: "Dine notater · Torsas læringsassistent" },
  { path: "/innstillinger", h1: "Innstillinger", title: "Innstillinger · Torsas læringsassistent" },
] as const;

// Story 1.3: these shell tests assume Consent is already given (no dialog).
test.beforeEach(async ({ page }) => {
  await seedConsent(page, "accepted");
});

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function expectRing(page: Page) {
  const outline = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element);
    return { width: s.outlineWidth, style: s.outlineStyle };
  });
  expect(outline).toEqual({ width: "3px", style: "solid" });
}

test.describe("first load", () => {
  test("sets data-theme in <head> before the body is parsed", async ({ request }) => {
    const html = await (await request.get("/")).text();
    expect(html).toMatch(/<html[^>]*lang="nb"/);
    const script = html.indexOf('document.documentElement.dataset.theme="light"');
    expect(script).toBeGreaterThan(-1);
    expect(script).toBeLessThan(html.indexOf("<body"));
  });

  test("shows the empty start screen with focus on its h1", async ({ page }) => {
    await open(page, "/");
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page).toHaveTitle(ROUTES[0].title);
    const h1 = page.getByRole("heading", { level: 1, name: ROUTES[0].h1 });
    await expect(h1).toBeFocused();
    await expect(page.getByText("Last opp en fil, lim inn tekst eller prøv et eksempelnotat.")).toBeVisible();
  });

  test("has header and main landmarks in skip link → header → main order", async ({ page }) => {
    await open(page, "/");
    const order = await page.evaluate(() =>
      [...document.body.querySelectorAll("#skip-link, header, main")].map((el) => el.tagName.toLowerCase()),
    );
    expect(order).toEqual(["a", "header", "main"]);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });
});

for (const route of ROUTES) {
  test(`skip link is the first Tab stop on ${route.path} and focuses the h1`, async ({ page }) => {
    await open(page, route.path);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Gå til hovedinnhold" });
    await expect(skip).toBeFocused();
    await expectRing(page);
    const box = await skip.boundingBox();
    expect(box && box.y >= 0 && box.height > 0).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: route.h1 })).toBeFocused();
  });
}

test("desktop: 'Innstillinger' navigates, sets the title and focuses the h1", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page, "/");
  await expect(page.getByRole("button", { name: "Mer" })).toBeHidden();
  await page.getByRole("link", { name: "Innstillinger" }).click();
  await expect(page).toHaveURL(/\/innstillinger$/);
  await expect(page.getByRole("heading", { level: 1, name: "Innstillinger" })).toBeFocused();
  await expect(page).toHaveTitle(ROUTES[1].title);

  await page.getByRole("link", { name: "Torsas læringsassistent" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: ROUTES[0].h1 })).toBeFocused();
  await expect(page).toHaveTitle(ROUTES[0].title);
});

test.describe("narrow top bar (< 768 px)", () => {
  test.use({ viewport: { width: 375, height: 700 } });

  test("shows brand + 'Mer' at 44 × 44 px or more", async ({ page }) => {
    await open(page, "/");
    await expect(page.getByRole("link", { name: "Torsas læringsassistent" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Innstillinger" })).toBeHidden();
    const more = page.getByRole("button", { name: "Mer" });
    await expect(more).toBeVisible();
    await expect(more).toHaveAttribute("aria-haspopup", "menu");
    const box = await more.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("'Mer' opens with the keyboard, arrows move, Esc returns focus to 'Mer'", async ({ page }) => {
    await open(page, "/");
    const more = page.getByRole("button", { name: "Mer" });
    await more.focus();
    await expectRing(page);
    await page.keyboard.press("Enter");
    // While the modal menu is open Radix hides the rest of the page from AT, so use CSS here.
    await expect(page.locator("button[aria-haspopup=menu]")).toHaveAttribute("aria-expanded", "true");
    const item = page.getByRole("menuitem", { name: "Innstillinger" });
    await expect(item).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(item).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(item).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(more).toBeFocused();
    await expect(more).toHaveAttribute("aria-expanded", "false");
  });

  test("choosing 'Innstillinger' in 'Mer' navigates and focuses the h1", async ({ page }) => {
    await open(page, "/");
    await page.getByRole("button", { name: "Mer" }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Innstillinger" })).toBeFocused();
    // Focus must go straight to the new h1, never back to 'Mer' first (onCloseAutoFocus).
    await page.evaluate(() => {
      const w = window as unknown as { merFocused: boolean };
      w.merFocused = false;
      document.querySelector("button[aria-haspopup=menu]")!.addEventListener("focus", () => {
        w.merFocused = true;
      });
    });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/innstillinger$/);
    await expect(page.getByRole("heading", { level: 1, name: "Innstillinger" })).toBeFocused();
    await expect(page).toHaveTitle(ROUTES[1].title);
    expect(await page.evaluate(() => (window as unknown as { merFocused: boolean }).merFocused)).toBe(false);
  });
});

for (const width of [320, 640, 1280]) {
  for (const route of ROUTES) {
    test(`${route.path} at ${width} px: no horizontal scroll, axe has no serious/critical`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, route.path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
      expect(blocking).toEqual([]);
    });
  }
}
