// copy-samples.ts (Story 1.14, I/O matrix "Build"): byte-identical copies, a three-entry manifest,
// and a missing source that fails and names the file.
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { copySamples, MANIFEST_FILE, SAMPLES } from "./copy-samples";

const REFERENCE_NOTES = fileURLToPath(new URL("../../reference-notes/", import.meta.url));
const dirs: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "copy-samples-"));
  dirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("copySamples", () => {
  it("copies the three reference notes byte for byte and writes the manifest", () => {
    const out = join(tempDir(), "samples");
    const result = copySamples(REFERENCE_NOTES, out);
    expect(result).toEqual({ ok: true, copied: ["nb-smidig-scrum.md", "nb-digital-verden.docx", "en-unit-testing.pdf"] });
    for (const { file } of SAMPLES) {
      expect(readFileSync(join(out, file)).equals(readFileSync(join(REFERENCE_NOTES, file))), file).toBe(true);
    }
    expect(readdirSync(out).sort()).toEqual([...SAMPLES.map((s) => s.file), MANIFEST_FILE].sort());
    expect(JSON.parse(readFileSync(join(out, MANIFEST_FILE), "utf8"))).toEqual([
      { file: "nb-smidig-scrum.md", title: "Smidig utvikling og Scrum", language: "nb" },
      { file: "nb-digital-verden.docx", title: "Den digitale verden", language: "nb" },
      { file: "en-unit-testing.pdf", title: "Unit testing", language: "en" },
    ]);
  });

  it("fails on a missing source, names it and writes nothing", () => {
    const src = tempDir();
    writeFileSync(join(src, "nb-smidig-scrum.md"), "x");
    const out = join(tempDir(), "samples");
    const result = copySamples(src, out);
    expect(result).toEqual({ ok: false, missing: join(src, "nb-digital-verden.docx") });
    expect(() => readdirSync(out)).toThrow();
  });
});

