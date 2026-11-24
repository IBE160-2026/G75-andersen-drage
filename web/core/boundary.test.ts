// Story 1.8: core/ is pure (AD-2), so its source files import only sibling modules (`./…`).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const CORE = fileURLToPath(new URL(".", import.meta.url));
const sources = readdirSync(CORE).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));

describe("core/ import boundary", () => {
  it("finds the core sources", () => {
    expect(sources).toContain("verifyStudySet.ts");
  });

  it.each(sources)("%s imports only ./ paths", (file) => {
    const { importedFiles } = ts.preProcessFile(readFileSync(join(CORE, file), "utf8"), true, true);
    const outside = importedFiles
      .map((i) => i.fileName)
      .filter((name) => !name.startsWith("./") || name.split(/[/\\]/).includes(".."));
    expect(outside).toEqual([]);
  });
});
