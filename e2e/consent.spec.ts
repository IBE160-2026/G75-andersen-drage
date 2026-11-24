// Story 1.3: Consent gate and Innstillinger › Samtykke (spec I/O & Edge-Case Matrix, FR-5).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { seedConsent, SETTINGS_KEY } from "./seed";

const START_H1 = "Dine notater: ingen ennå";
// Story 1.14: the first-open decline lands on Demovelger (decided by Tor 2026-11-24).
const DEMO_H1 = "Velg et eksempelnotat";
const BODY_START = "Notatet ditt sendes til";

const dialog = (page: Page) => page.getByRole("dialog", { name: "Før du starter" });
const stored = (page: Page) =>
  page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }, SETTINGS_KEY);

async function blocking(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.describe("first open", () => {
  test("shows the dialog over Start with focus inside; Esc and outside clicks do nothing", async ({ page }) => {
    await page.goto("/");
    const d = dialog(page);
    await expect(d).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-consent", "unset");
    await expect(d.getByRole("heading", { level: 2, name: "Før du starter" })).toBeVisible();
    await expect(d).toHaveAccessibleDescription(new RegExp(`^${BODY_START}`));
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    await expect(d.getByRole("button", { name: /lukk|close/i })).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(d).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(d).toBeVisible();
    expect(await stored(page)).toBeNull();

    // Tab stays inside the dialog (focus trap).
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
    }
  });

  test("'Les mer' toggles points B–E with aria-expanded", async ({ page }) => {
    await page.goto("/");
    const more = dialog(page).getByRole("button", { name: "Les mer" });
    const point = page.getByText("Appen lagrer og logger ikke innholdet i notatene dine.");
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await expect(point).toBeHidden();
    await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await expect(point).toBeVisible();
    await expect(dialog(page).getByRole("listitem")).toHaveCount(4);
    await more.click();
    await expect(point).toBeHidden();
  });

  test("has exactly one primary action: 'Jeg forstår, fortsett'", async ({ page }) => {
    await page.goto("/");
    const accept = dialog(page).getByRole("button", { name: "Jeg forstår, fortsett" });
    const decline = dialog(page).getByRole("button", { name: "Nei takk, vis demo" });
    await expect(accept).toHaveAttribute("data-variant", "primary");
    await expect(decline).toBeVisible();
    await expect(decline).not.toHaveAttribute("data-variant", "primary");
    await expect(dialog(page).locator('[data-variant="primary"]')).toHaveCount(1);
  });

  for (const [choice, h1] of [
    ["Jeg forstår, fortsett", START_H1],
    ["Nei takk, vis demo", DEMO_H1],
  ]) {
    test(`after '${choice}', the first Tab from the '${h1}' h1 reaches the skip link`, async ({ page }) => {
      await page.goto("/");
      await dialog(page).getByRole("button", { name: choice }).click();
      await expect(dialog(page)).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1, name: h1 })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Gå til hovedinnhold" })).toBeFocused();
    });
  }
});

test.describe("provider name", () => {
  test("names OpenRouter and the model once /api/status answers", async ({ page }) => {
    await page.goto("/");
    const status = await page.evaluate(async () => (await fetch("/api/status")).json());
    await expect(dialog(page)).toHaveAccessibleDescription(
      `${BODY_START} ${status.provider} (modellen ${status.model}) for å lage kort og quiz. Vil du ikke det, kan du prøve appen med eksempelnotater.`,
    );
  });

  test("falls back to the provider name after 3 failed tries 1 s apart; the app stays usable", async ({ page }) => {
    const tries: number[] = [];
    await page.route("**/api/status", (route) => {
      tries.push(Date.now());
      return route.abort();
    });
    await page.goto("/");
    await expect(dialog(page)).toHaveAccessibleDescription(
      `${BODY_START} OpenRouter for å lage kort og quiz. Vil du ikke det, kan du prøve appen med eksempelnotater.`,
    );
    await expect.poll(() => tries.length, { timeout: 10_000 }).toBe(3);
    await page.waitForTimeout(1500);
    expect(tries.length).toBe(3);
    expect(tries[1] - tries[0]).toBeGreaterThanOrEqual(900);
    expect(tries[2] - tries[1]).toBeGreaterThanOrEqual(900);
    // Still the fallback after every try has failed, not just before the first answer.
    await expect(dialog(page)).toHaveAccessibleDescription(
      `${BODY_START} OpenRouter for å lage kort og quiz. Vil du ikke det, kan du prøve appen med eksempelnotater.`,
    );
    await dialog(page).getByRole("button", { name: "Jeg forstår, fortsett" }).click();
    await expect(page.getByRole("heading", { level: 1, name: START_H1 })).toBeFocused();
  });
});

test.describe("decision", () => {
  test("accept stores 'accepted', closes the dialog and focuses the Start h1", async ({ page }) => {
    await page.goto("/");
    await dialog(page).getByRole("button", { name: "Jeg forstår, fortsett" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: START_H1 })).toBeFocused();
    expect(await stored(page)).toEqual({ schemaVersion: 1, consent: "accepted" });
    await expect(page.locator("html")).toHaveAttribute("data-consent", "accepted");
    await expect(page.getByText(/Du har ikke godtatt/)).toHaveCount(0);
  });

  test("after reload, data-consent is set before paint and the dialog never renders", async ({ page, request }) => {
    const html = await (await request.get("/")).text();
    const script = html.indexOf(`localStorage.getItem("${SETTINGS_KEY}")`);
    expect(script).toBeGreaterThan(-1);
    expect(script).toBeLessThan(html.indexOf("<body"));

    await page.goto("/");
    await dialog(page).getByRole("button", { name: "Jeg forstår, fortsett" }).click();
    await expect(dialog(page)).toHaveCount(0);

    await page.addInitScript(() => {
      const w = window as unknown as { dialogSeen: boolean; consentAtHead: string | undefined };
      w.dialogSeen = false;
      new MutationObserver(() => {
        if (document.querySelector('[role="dialog"]')) w.dialogSeen = true;
        if (document.body && w.consentAtHead === undefined) w.consentAtHead = document.documentElement.dataset.consent;
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: START_H1 })).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("data-consent", "accepted");
    const seen = await page.evaluate(() => {
      const w = window as unknown as { dialogSeen: boolean; consentAtHead: string };
      return { dialogSeen: w.dialogSeen, consentAtHead: w.consentAtHead };
    });
    expect(seen.dialogSeen).toBe(false);
    expect(seen.consentAtHead).toBe("accepted");
  });

  test("decline stores 'declined' and lands on Demovelger; Start shows consent.declined, its link reopens the dialog", async ({ page }) => {
    await page.goto("/");
    await dialog(page).getByRole("button", { name: "Nei takk, vis demo" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.getByRole("heading", { level: 1, name: DEMO_H1 })).toBeFocused();
    expect(await stored(page)).toEqual({ schemaVersion: 1, consent: "declined" });
    await expect(page.locator("html")).toHaveAttribute("data-consent", "declined");

    await page.getByRole("link", { name: "Torsas læringsassistent" }).click();
    await expect(page.getByRole("heading", { level: 1, name: START_H1 })).toBeFocused();
    await expect(
      page.getByText("Du har ikke godtatt at notater sendes til OpenRouter. Du kan bruke demomodus, eller godta nå."),
    ).toBeVisible();

    const link = page.getByRole("button", { name: "godta nå" });
    await link.click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Nei takk, vis demo" }).click();
    await expect(link).toBeFocused();

    await link.click();
    await dialog(page).getByRole("button", { name: "Jeg forstår, fortsett" }).click();
    await expect(page.getByText(/Du har ikke godtatt/)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: START_H1 })).toBeFocused();
    expect(await stored(page)).toEqual({ schemaVersion: 1, consent: "accepted" });
  });

  test("accept made on first open at /innstillinger lands on Start", async ({ page }) => {
    await page.goto("/innstillinger");
    await dialog(page).getByRole("button", { name: "Jeg forstår, fortsett" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: START_H1 })).toBeFocused();
  });

  test("decline made on first open at /innstillinger lands on Demovelger", async ({ page }) => {
    await page.goto("/innstillinger");
    await dialog(page).getByRole("button", { name: "Nei takk, vis demo" }).click();
    await expect(page).toHaveURL(/\/demo$/);
    await expect(page.getByRole("heading", { level: 1, name: DEMO_H1 })).toBeFocused();
  });
});

test.describe("Innstillinger › Samtykke", () => {
  test("withdraw: → declined, announced via role=status, no confirmation", async ({ page }) => {
    await seedConsent(page, "accepted");
    await page.goto("/innstillinger");
    await expect(page.getByRole("heading", { level: 2, name: "Samtykke" })).toBeVisible();
    await expect(page.getByText("Notatene dine sendes til OpenRouter når du lager kort og quiz.")).toBeVisible();
    const button = page.getByRole("button", { name: "Trekk tilbake samtykke" });
    await button.click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("Samtykket er trukket tilbake.");
    await expect(page.getByText("Notatene dine sendes ikke til OpenRouter. Du kan bruke eksempelnotatene.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Godta at notater sendes" })).toBeFocused();
    expect(await stored(page)).toEqual({ schemaVersion: 1, consent: "declined" });
  });

  test("accept later: opens the dialog and returns focus to the trigger on close", async ({ page }) => {
    await seedConsent(page, "declined");
    await page.goto("/innstillinger");
    await expect(dialog(page)).toHaveCount(0);
    // Scoped to Samtykke: Studier (Story 1.14) adds the Demomodus switch, also a button.
    const trigger = page.locator('main section[aria-labelledby="settings-consent"] button');
    await expect(trigger).toHaveText("Godta at notater sendes");

    await trigger.click();
    await dialog(page).getByRole("button", { name: "Nei takk, vis demo" }).click();
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL(/\/innstillinger$/);

    await trigger.click();
    await dialog(page).getByRole("button", { name: "Jeg forstår, fortsett" }).click();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveText("Trekk tilbake samtykke");
    expect(await stored(page)).toEqual({ schemaVersion: 1, consent: "accepted" });
  });
});

test.describe("storage edge cases", () => {
  test("corrupt setting is treated as no decision and reset", async ({ page }) => {
    await page.addInitScript((key) => {
      if (sessionStorage.getItem("e2e-seeded")) return;
      sessionStorage.setItem("e2e-seeded", "1");
      localStorage.setItem(key, "{not json");
    }, SETTINGS_KEY);
    await page.goto("/");
    await expect(dialog(page)).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-consent", "unset");
    expect(await stored(page)).toBeNull();
  });

  test("invalid schema is treated as no decision and reset", async ({ page }) => {
    await page.addInitScript((key) => {
      if (sessionStorage.getItem("e2e-seeded")) return;
      sessionStorage.setItem("e2e-seeded", "1");
      localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, consent: "maybe" }));
    }, SETTINGS_KEY);
    await page.goto("/");
    await expect(dialog(page)).toBeVisible();
    expect(await stored(page)).toBeNull();
  });

  test("blocked localStorage: memory fallback, asked once per session, no crash", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-consent", "unset");
    await dialog(page).getByRole("button", { name: "Jeg forstår, fortsett" }).click();
    await expect(page.getByRole("heading", { level: 1, name: START_H1 })).toBeFocused();

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("link", { name: "Innstillinger" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Innstillinger" })).toBeFocused();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Trekk tilbake samtykke" })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

for (const width of [1280, 320]) {
  test(`dialog open at ${width} px: axe has no serious/critical, no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(dialog(page)).toBeVisible();
    await dialog(page).getByRole("button", { name: "Les mer" }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await blocking(page)).toEqual([]);
  });
}

for (const consent of ["accepted", "declined"] as const) {
  test(`Start and Innstillinger with Consent ${consent} at 320 px: axe has no serious/critical`, async ({ page }) => {
    await seedConsent(page, consent);
    await page.setViewportSize({ width: 320, height: 800 });
    for (const path of ["/", "/innstillinger"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
      expect(await blocking(page), path).toEqual([]);
    }
  });
}
