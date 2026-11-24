import { expect, test } from "@playwright/test";
import { seedConsent } from "./seed";

// Story 1.7: the Proxy guards seen through the web server's /api rewrite.
const demoBody = {
  mode: "demo",
  noteHash: "0".repeat(64),
  passages: [{ id: "p1", text: "Fotosyntese er prosessen der planter lager sukker." }],
};

test.beforeEach(async ({ page }) => {
  await seedConsent(page, "accepted");
});

test("a browser POST keeps its Origin through the rewrite and reaches the route", async ({ page }) => {
  await page.goto("/");
  const res = await page.evaluate(async (body) => {
    const r = await fetch("/api/study-set", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: r.status, body: await r.json() };
  }, demoBody);
  // Demo Mode arrives in 1.13/1.14; until then the route answers err.demoOnly, past the guard.
  expect(res).toEqual({ status: 404, body: { code: "err.demoOnly" } });
});

test("a POST without Origin is rejected by the guard", async ({ request }) => {
  const res = await request.post("/api/study-set", { data: demoBody });
  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ code: "err.generation" });
});

test("a POST from a foreign Origin is rejected by the guard", async ({ request }) => {
  const res = await request.post("/api/study-set", {
    data: demoBody,
    headers: { Origin: "http://evil.example" },
  });
  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ code: "err.generation" });
});
