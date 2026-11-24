// Story 1.14 (FR-23, AD-12): copies the bundled sample notes from reference-notes/ into public/samples/
// and writes public/samples/manifest.json = [{file, title, language}] for Demovelger.
// Runs before `next build` and `next dev` (`prebuild` / `predev`). The files are copied byte for byte:
// the browser extracts them with the normal pipeline, so their Note Hashes match the Fixtures.
// Usage: `npm run samples` (from web/). A missing source note exits non-zero and names the file.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Sample } from "../api/samples";
import { isMain } from "./isMain";

/** Names decided by Tor 2026-11-24 (D-16). The order is the order Demovelger lists them in. */
export const SAMPLES: readonly Sample[] = [
  { file: "nb-smidig-scrum.md", title: "Smidig utvikling og Scrum", language: "nb" },
  { file: "nb-digital-verden.docx", title: "Den digitale verden", language: "nb" },
  { file: "en-unit-testing.pdf", title: "Unit testing", language: "en" },
];

export const MANIFEST_FILE = "manifest.json";

export type CopyResult = { ok: true; copied: string[] } | { ok: false; missing: string };

/** Checks every source first, so a missing one leaves `outDir` untouched. */
export function copySamples(srcDir: string, outDir: string, samples: readonly Sample[] = SAMPLES): CopyResult {
  for (const { file } of samples) {
    if (!existsSync(join(srcDir, file))) return { ok: false, missing: join(srcDir, file) };
  }
  mkdirSync(outDir, { recursive: true });
  for (const { file } of samples) copyFileSync(join(srcDir, file), join(outDir, file));
  writeFileSync(join(outDir, MANIFEST_FILE), JSON.stringify(samples, null, 2) + "\n", "utf8");
  return { ok: true, copied: samples.map((s) => s.file) };
}

function main(): number {
  const src = fileURLToPath(new URL("../../reference-notes/", import.meta.url));
  const out = fileURLToPath(new URL("../public/samples/", import.meta.url));
  const result = copySamples(src, out);
  if (!result.ok) {
    console.error(`copy-samples: missing sample note ${result.missing}`);
    return 1;
  }
  console.log(`copy-samples: ${result.copied.length} samples and ${MANIFEST_FILE} in ${out}`);
  return 0;
}

if (isMain(import.meta.url)) {
  let code = 1;
  try {
    code = main();
  } catch {
    console.error("copy-samples: unexpected failure");
  }
  process.exit(code);
}
