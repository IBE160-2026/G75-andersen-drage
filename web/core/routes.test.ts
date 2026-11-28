// The route builders (Stories 2.1, 2.4): every route keeps the Note key's demo: prefix.
import { describe, expect, it } from "vitest";
import { notePath, resultPath, roundPath } from "./routes";

describe("roundPath", () => {
  it("keeps the demo: prefix of the Note key", () => {
    expect(roundPath("demo:abc", "r-1")).toBe("/notat/demo:abc/runde/r-1");
    expect(roundPath("abc", "r-1")).toBe("/notat/abc/runde/r-1");
  });
});

describe("notePath / resultPath (Story 2.4)", () => {
  it("Resultat is the Round route + /resultat, keeping the demo: prefix", () => {
    expect(notePath("demo:abc")).toBe("/notat/demo:abc");
    expect(resultPath("demo:abc", "r-1")).toBe("/notat/demo:abc/runde/r-1/resultat");
    expect(resultPath("abc", "r-1")).toBe("/notat/abc/runde/r-1/resultat");
  });
});
