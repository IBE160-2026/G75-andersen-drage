// Story 1.9: the time-based Genererer progress (spec Design Notes, D-11).
import { describe, expect, it } from "vitest";
import { progressAt } from "./Generating";

describe("progressAt", () => {
  it("rises from 0 to 90 over the first 60 s, then holds at 90", () => {
    expect(progressAt(0)).toBe(0);
    expect(progressAt(30_000)).toBe(45);
    expect(progressAt(60_000)).toBe(90);
    expect(progressAt(89_000)).toBe(90);
  });
});
