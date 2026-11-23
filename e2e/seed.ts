// Seeds a stored Consent decision before the first page script runs (spec 1.3, Code Map).
// The guard makes it a one-off per tab, so later reloads see what the app itself stored.
import type { Page } from "@playwright/test";

export const SETTINGS_KEY = "torsa.settings";

export async function seedConsent(page: Page, consent: "accepted" | "declined") {
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem("e2e-seeded")) return;
      sessionStorage.setItem("e2e-seeded", "1");
      localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, consent: value }));
    },
    [SETTINGS_KEY, consent] as const,
  );
}
