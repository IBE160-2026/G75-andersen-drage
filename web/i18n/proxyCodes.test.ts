// Story 1.10: every error code the Proxy can send is a Microcopy key (AD-6, NFR-9), so the browser can
// always show it. The test image copies proxy/ next to web/ (e2e/Dockerfile), as in the repository.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { messages } from "./messages";

const PROXY_APP = fileURLToPath(new URL("../../proxy/app", import.meta.url));

function proxyCodes(): Set<string> {
  const codes = new Set<string>();
  for (const name of readdirSync(PROXY_APP).filter((f) => f.endsWith(".py"))) {
    const source = readFileSync(join(PROXY_APP, name), "utf8");
    for (const match of source.matchAll(/["'](err\.[A-Za-z][\w.]*)["']/g)) codes.add(match[1]);
    for (const match of source.matchAll(/^GENERATION_ERROR\s*=\s*["']([^"']+)["']/gm)) codes.add(match[1]);
  }
  return codes;
}

describe("Proxy error codes", () => {
  const codes = proxyCodes();

  it("are found, including the three known codes", () => {
    expect(codes.size).toBeGreaterThan(0);
    for (const known of ["err.generation", "err.noKey", "err.demoOnly"]) expect(codes).toContain(known);
  });

  it("are all Microcopy keys", () => {
    expect([...codes].filter((code) => !Object.hasOwn(messages, code))).toEqual([]);
  });
});
