// FR-17: one test per row of the Mastery State table (Story 2.2).
import { describe, expect, it } from "vitest";
import { updateMastery } from "./mastery";

describe("updateMastery (FR-17)", () => {
  it("new + correct → known", () => {
    expect(updateMastery("new", "correct")).toBe("known");
  });

  it("new + wrong → shaky", () => {
    expect(updateMastery("new", "wrong")).toBe("shaky");
  });

  it("shaky + correct → known", () => {
    expect(updateMastery("shaky", "correct")).toBe("known");
  });

  it("shaky + wrong → shaky", () => {
    expect(updateMastery("shaky", "wrong")).toBe("shaky");
  });

  it("known + correct → known", () => {
    expect(updateMastery("known", "correct")).toBe("known");
  });

  it("known + wrong → shaky", () => {
    expect(updateMastery("known", "wrong")).toBe("shaky");
  });
});
