import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { isMain } from "./isMain";

const original = process.argv;
const setArgv1 = (value: string | undefined) => {
  process.argv = value === undefined ? [original[0]] : [original[0], value];
};

describe("isMain", () => {
  afterEach(() => {
    process.argv = original;
  });

  it("is true when process.argv[1] is the module's file", () => {
    setArgv1(fileURLToPath(import.meta.url));
    expect(isMain(import.meta.url)).toBe(true);
  });

  it("is false for another script", () => {
    setArgv1(fileURLToPath(new URL("./evaluate.ts", import.meta.url)));
    expect(isMain(import.meta.url)).toBe(false);
  });

  it("is false when process.argv[1] is missing", () => {
    setArgv1(undefined);
    expect(isMain(import.meta.url)).toBe(false);
  });
});
