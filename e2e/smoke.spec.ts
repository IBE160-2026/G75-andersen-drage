import { expect, test } from "@playwright/test";
import { seedConsent } from "./seed";

test.beforeEach(async ({ page }) => {
  await seedConsent(page, "accepted");
});

test("loads the start page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "nb");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("reaches /api/status through the web server", async ({ page }) => {
  await page.goto("/");
  const status = await page.evaluate(async () => {
    const res = await fetch("/api/status");
    return { ok: res.ok, body: await res.json() };
  });
  expect(status.ok).toBe(true);
  // keyConfigured depends on the developer's optional .env; pytest covers both values.
  expect(typeof status.body.keyConfigured).toBe("boolean");
  expect(status.body.provider).toBe("OpenRouter");
  expect(typeof status.body.model).toBe("string");
  expect(typeof status.body.promptVersion).toBe("string");
});
