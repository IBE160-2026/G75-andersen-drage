// Stories 1.4 and 1.5: upload a text, Markdown, .docx or PDF Note and reject unusable input
// (spec I/O & Edge-Case Matrix, FR-1, FR-3). The worker hang (15 s timeout) is covered by Vitest
// (web/extract/client.test.ts), not here. The .docx/PDF tests run the parsers in the production bundle.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { seedConsent } from "./seed";

const MSG = {
  type: "Denne filtypen støttes ikke. Bruk .txt, .md, .docx eller .pdf.",
  size: "Filen er større enn 10 MB. Velg en mindre fil.",
  noText: "Fant ingen tekst i filen. Prøv en annen fil, eller lim inn teksten.",
  unreadable: "Filen kunne ikke leses. Prøv å lagre den på nytt, eller lim inn teksten.",
  tooShort: "Notatet er for kort. Det trengs minst 150 ord.",
  tooLong: "Notatet er for langt. Grensen er 15 000 ord; del det opp.",
  encoding: "Æ, ø og å kan vises feil i dette notatet.",
  scanned: "Skannede PDF-er støttes ikke. Bruk en PDF med tekst, eller lim inn teksten.",
};

/** A file from reference-notes/ (copied into the test image), under its own name. */
const note = (path: string): Upload => ({
  name: path.split("/").pop()!,
  buffer: readFileSync(join(__dirname, "..", "reference-notes", path)),
  mimeType: "application/octet-stream",
});
/** Note Hashes from web/extract/reference-notes.test.ts: the browser bundle must give the same Passages as Node. */
const HASH = {
  docx: "f8e36750fbe1b1c4a6f36af4ed15ec4beb4ce3ec42e78c67cbb8e75baec453d0",
  pdf: "f0357a9021403b542c0ec830875e43b9af01359c8db9e054773bb85af10248ed",
};

const words = (n: number, word = "ord") => Array.from({ length: n }, () => word).join(" ");
const VALID = `# Smidig\n\n${words(200)}.\n\nScrum har roller og hendelser.\n`;
const utf8 = (s: string) => Buffer.from(s, "utf8");
/** windows-1252 bytes for Latin-1 text. */
const latin1 = (s: string) => Buffer.from(s, "latin1");

type Upload = { name: string; buffer: Buffer; mimeType?: string };
const file = (name: string, buffer: Buffer): Upload => ({ name, buffer, mimeType: "application/octet-stream" });

const input = (page: Page) => page.getByLabel("Slipp en fil her eller velg fil");
// Scoped to main: Next.js adds its own role="alert" route announcer outside it.
const alert = (page: Page) => page.locator('main [role="alert"]');
const status = (page: Page) => page.locator('main [role="status"]');

type WorkerHooks = { workersCreated: number; holdWorkers: boolean; heldAnswers: (() => void)[]; Worker: typeof Worker };

/**
 * Counts extraction workers created by the page (none means the file was never read). While
 * `holdWorkers` is true, worker answers are queued in `heldAnswers` instead of delivered.
 */
async function countWorkers(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as WorkerHooks;
    w.workersCreated = 0;
    w.holdWorkers = false;
    w.heldAnswers = [];
    const Native = w.Worker;
    w.Worker = class extends Native {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        w.workersCreated++;
      }
      set onmessage(handler: ((event: MessageEvent) => void) | null) {
        super.onmessage = handler
          ? (event: MessageEvent) => {
              if (w.holdWorkers) w.heldAnswers.push(() => handler.call(this, event));
              else handler.call(this, event);
            }
          : null;
      }
      get onmessage() {
        return super.onmessage;
      }
    };
  });
}
const workersCreated = (page: Page) => page.evaluate(() => (window as unknown as WorkerHooks).workersCreated);

let studySetRequests: string[];

test.beforeEach(async ({ page }) => {
  studySetRequests = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/study-set")) studySetRequests.push(req.url());
  });
  await seedConsent(page, "accepted");
  await countWorkers(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test.afterEach(() => {
  // No row of the matrix ever reaches the generation endpoint (Story 1.9 wires it).
  expect(studySetRequests).toEqual([]);
});

async function upload(page: Page, f: Upload) {
  await input(page).setInputFiles(f);
}

async function expectRejected(page: Page, text: string) {
  const error = alert(page);
  await expect(error).toHaveText(`Feil: ${text}`);
  await expect(page.locator("#note-file-error")).toBeFocused();
  await expect(input(page)).toHaveAttribute("aria-invalid", "true");
  await expect(input(page)).toHaveAttribute("aria-describedby", "note-file-error");
  await expect(status(page)).toHaveText("");
}

async function expectAccepted(page: Page, name: string) {
  await expect(status(page)).toContainText(new RegExp(`^${name.replace(/\./g, "\\.")} · \\d[\\d\\s]* ord · \\d[\\d\\s]* avsnitt`));
  await expect(alert(page)).toHaveCount(0);
  await expect(input(page)).not.toHaveAttribute("aria-invalid");
  await expect(input(page)).not.toHaveAttribute("aria-describedby");
  const hash = await status(page).getAttribute("data-note-hash");
  expect(hash).toMatch(/^[0-9a-f]{64}$/);
  return hash!;
}

test.describe("accepted", () => {
  test("a UTF-8 .txt gives the Note meta in a status line", async ({ page }) => {
    await expect(page.getByText("Slipp en fil her eller velg fil")).toBeVisible();
    await expect(page.getByText(".txt .md .docx .pdf · maks 10 MB")).toBeVisible();
    await upload(page, file("notat.txt", utf8(VALID)));
    await expectAccepted(page, "notat.txt");
    // 1 heading word + 200 words + 5 words; heading, body, last line = 3 Passages.
    await expect(status(page)).toHaveText("notat.txt · 206 ord · 3 avsnitt");
    await expect(status(page)).not.toContainText(MSG.encoding);
    expect(await workersCreated(page)).toBe(1);
  });

  for (const name of ["NOTAT.TXT", "a.MD"]) {
    test(`${name} is accepted as text`, async ({ page }) => {
      await upload(page, file(name, utf8(VALID)));
      await expectAccepted(page, name);
    });
  }

  test("a.txt and b.md with the same bytes get the same Note Hash", async ({ page }) => {
    await upload(page, file("a.txt", utf8(VALID)));
    const a = await expectAccepted(page, "a.txt");
    await upload(page, file("b.md", utf8(VALID)));
    const b = await expectAccepted(page, "b.md");
    expect(b).toBe(a);
  });

  test("a UTF-8 BOM is stripped: same Note Hash as without", async ({ page }) => {
    await upload(page, file("uten.txt", utf8(VALID)));
    const plain = await expectAccepted(page, "uten.txt");
    await upload(page, file("med.txt", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), utf8(VALID)])));
    const bom = await expectAccepted(page, "med.txt");
    expect(bom).toBe(plain);
    await expect(status(page)).not.toContainText(MSG.encoding);
  });

  test("windows-1252 bytes are decoded with the non-blocking warn.encoding", async ({ page }) => {
    const text = `${words(160, "blåbær")}.`;
    await upload(page, file("gammel.txt", latin1(text)));
    await expectAccepted(page, "gammel.txt");
    await expect(status(page)).toContainText(MSG.encoding);
    await upload(page, file("ny.txt", utf8(text)));
    await expectAccepted(page, "ny.txt");
    await expect(status(page)).not.toContainText(MSG.encoding);
  });

  test("a dropped file is extracted; only the first file of a drop is used", async ({ page }) => {
    await page.evaluate(
      ([first, second]) => {
        const dt = new DataTransfer();
        dt.items.add(new File([first], "forst.txt"));
        dt.items.add(new File([second], "andre.doc"));
        const zone = document.querySelector("label[for=note-file]")!;
        zone.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
        zone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
      },
      [VALID, "x"],
    );
    await expectAccepted(page, "forst.txt");
  });

  test("UTF-16 LE and BE with a BOM: same Note Hash as UTF-8, no warn.encoding", async ({ page }) => {
    await upload(page, file("utf8.txt", utf8(VALID)));
    const plain = await expectAccepted(page, "utf8.txt");
    const le = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(VALID, "utf16le")]);
    await upload(page, file("le.txt", le));
    expect(await expectAccepted(page, "le.txt")).toBe(plain);
    await expect(status(page)).not.toContainText(MSG.encoding);
    const be = Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(VALID, "utf16le").swap16()]);
    await upload(page, file("be.txt", be));
    expect(await expectAccepted(page, "be.txt")).toBe(plain);
    await expect(status(page)).not.toContainText(MSG.encoding);
  });

  test("numbers in the Note meta are grouped the nb-NO way (no-break space)", async ({ page }) => {
    await upload(page, file("lang.txt", utf8(`${words(1200)}.`)));
    await expectAccepted(page, "lang.txt");
    expect(await status(page).textContent()).toBe("lang.txt · 1 200 ord · 1 avsnitt");
  });

  test("while a file is processed the input is aria-disabled and a second file is ignored", async ({ page }) => {
    await page.evaluate(() => {
      (window as unknown as WorkerHooks).holdWorkers = true;
    });
    await upload(page, file("forst.txt", utf8(VALID)));
    await expect(input(page)).toHaveAttribute("aria-disabled", "true");
    await upload(page, file("andre.txt", utf8(VALID)));
    expect(await workersCreated(page)).toBe(1);
    await page.evaluate(() => {
      const w = window as unknown as WorkerHooks;
      w.holdWorkers = false;
      for (const deliver of w.heldAnswers.splice(0)) deliver();
    });
    await expectAccepted(page, "forst.txt");
    await expect(input(page)).not.toHaveAttribute("aria-disabled");
    await upload(page, file("tredje.txt", utf8(VALID)));
    await expectAccepted(page, "tredje.txt");
    expect(await workersCreated(page)).toBe(2);
  });

  test("a file dropped outside the zone is not opened by the browser; the app stays on /", async ({ page }) => {
    const prevented = await page.evaluate((text) => {
      const dt = new DataTransfer();
      dt.items.add(new File([text], "utenfor.txt"));
      const over = new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt });
      const drop = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt });
      document.body.dispatchEvent(over);
      document.body.dispatchEvent(drop);
      return [over.defaultPrevented, drop.defaultPrevented];
    }, VALID);
    expect(prevented).toEqual([true, true]);
    await expect(page).toHaveURL(/\/$/);
    await expect(status(page)).toHaveText("");
  });
});

test.describe(".docx and PDF", () => {
  test("a real .docx and a real text PDF give the Note meta and the same Note Hash as Vitest", async ({ page }) => {
    await upload(page, note("nb-digital-verden.docx"));
    expect(await expectAccepted(page, "nb-digital-verden.docx")).toBe(HASH.docx);
    await expect(status(page)).toHaveText("nb-digital-verden.docx · 1 982 ord · 101 avsnitt");
    await upload(page, note("en-unit-testing.pdf"));
    expect(await expectAccepted(page, "en-unit-testing.pdf")).toBe(HASH.pdf);
    await expect(status(page)).toHaveText("en-unit-testing.pdf · 4 408 ord · 106 avsnitt");
    await expect(status(page)).not.toContainText(MSG.encoding);
  });

  test("a table .docx and a PDF with headers and footers are accepted", async ({ page }) => {
    await upload(page, note("edge-cases/nb-tabell-digitale-tjenester.docx"));
    await expectAccepted(page, "nb-tabell-digitale-tjenester.docx");
    await upload(page, note("edge-cases/nb-topptekst-bunntekst.pdf"));
    await expectAccepted(page, "nb-topptekst-bunntekst.pdf");
  });

  test("an image-only PDF: err.scanned", async ({ page }) => {
    await upload(page, note("edge-cases/nb-skannet.pdf"));
    await expectRejected(page, MSG.scanned);
  });

  const rejected: [string, string][] = [
    ["edge-cases/nb-odelagt.pdf", MSG.unreadable],
    ["edge-cases/nb-passord.pdf", MSG.unreadable],
    ["edge-cases/nb-tom.docx", MSG.noText],
    ["edge-cases/nb-for-kort.docx", MSG.tooShort],
  ];
  for (const [path, text] of rejected) {
    test(`${path.split("/").pop()}: ${text.slice(0, 30)}…`, async ({ page }) => {
      await upload(page, note(path));
      await expectRejected(page, text);
    });
  }

  test("a corrupt .docx: err.unreadable, then a valid PDF still works", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await upload(page, note("edge-cases/nb-odelagt.docx"));
    await expectRejected(page, MSG.unreadable);
    await upload(page, note("edge-cases/nb-topptekst-bunntekst.pdf"));
    await expectAccepted(page, "nb-topptekst-bunntekst.pdf");
    expect(errors).toEqual([]);
  });

  test("the page stays responsive while a long PDF is parsed, then err.tooLong", async ({ page }) => {
    await upload(page, note("edge-cases/nb-norge-too-long.pdf"));
    // Poll while the input is busy (parsing may also finish before the first poll), bounded by the 15 s
    // extraction timeout plus a margin; every round trip to the page must answer within 200 ms.
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const start = Date.now();
      const busy = await page.evaluate(() => document.getElementById("note-file")?.getAttribute("aria-disabled") === "true");
      expect(Date.now() - start).toBeLessThan(200);
      if (!busy) break;
    }
    await expectRejected(page, MSG.tooLong);
  });
});

test.describe("rejected", () => {
  for (const name of ["rapport.docx", "notat.pdf"]) {
    test(`text bytes misnamed ${name}: err.unreadable`, async ({ page }) => {
      await upload(page, file(name, utf8(VALID)));
      await expectRejected(page, MSG.unreadable);
    });
  }

  for (const name of ["gammel.doc", "tekst.rtf", "uten-endelse"]) {
    test(`${name}: err.type, the file is never read`, async ({ page }) => {
      await upload(page, file(name, utf8(VALID)));
      await expectRejected(page, MSG.type);
      expect(await workersCreated(page)).toBe(0);
    });
  }

  test("over 10 × 1024 × 1024 bytes: err.size, the file is never read", async ({ page }) => {
    await upload(page, file("stor.txt", Buffer.alloc(10 * 1024 * 1024 + 1, 0x61)));
    await expectRejected(page, MSG.size);
    expect(await workersCreated(page)).toBe(0);
  });

  test("0 bytes: err.noText", async ({ page }) => {
    await upload(page, file("tom.txt", Buffer.alloc(0)));
    await expectRejected(page, MSG.noText);
  });

  test("whitespace only: err.noText", async ({ page }) => {
    await upload(page, file("tom.md", utf8(" \n\t\r\n   \n")));
    await expectRejected(page, MSG.noText);
  });

  test("under 150 words: err.tooShort", async ({ page }) => {
    await upload(page, file("kort.txt", utf8(words(149))));
    await expectRejected(page, MSG.tooShort);
  });

  test("over 15 000 words: err.tooLong", async ({ page }) => {
    await upload(page, file("lang.txt", utf8(words(15_001))));
    await expectRejected(page, MSG.tooLong);
  });

  test("the same rejection twice is shown and focused again", async ({ page }) => {
    await upload(page, file("a.doc", utf8("x")));
    await expectRejected(page, MSG.type);
    await page.getByRole("heading", { level: 1 }).focus();
    await upload(page, file("b.doc", utf8("x")));
    await expectRejected(page, MSG.type);
  });

  test("an error, then a valid file: the error and aria-invalid are cleared", async ({ page }) => {
    await upload(page, file("kort.txt", utf8(words(10))));
    await expectRejected(page, MSG.tooShort);
    await upload(page, file("notat.txt", utf8(VALID)));
    await expectAccepted(page, "notat.txt");
  });

  test("a valid file, then a rejected one: the Note meta and data-note-hash are cleared", async ({ page }) => {
    await upload(page, file("notat.txt", utf8(VALID)));
    await expectAccepted(page, "notat.txt");
    await upload(page, file("kort.txt", utf8(words(10))));
    await expectRejected(page, MSG.tooShort);
    await expect(status(page)).not.toHaveAttribute("data-note-hash");
  });
});

test("keyboard: Tab reaches the file input with a visible focus ring on the zone", async ({ page }) => {
  const zone = page.locator("label[for=note-file]");
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    if (await input(page).evaluate((el) => el === document.activeElement)) break;
  }
  await expect(input(page)).toBeFocused();
  const outline = await zone.evaluate((el) => {
    const s = getComputedStyle(el);
    return { width: s.outlineWidth, style: s.outlineStyle };
  });
  expect(outline).toEqual({ width: "3px", style: "solid" });
});

for (const width of [1280, 320]) {
  test(`error shown at ${width} px: axe has no serious/critical, no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await upload(page, file("gammel.doc", utf8("x")));
    await expectRejected(page, MSG.type);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations
      .filter((v) => v.impact === "serious" || v.impact === "critical")
      .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
    expect(blocking).toEqual([]);
  });
}
