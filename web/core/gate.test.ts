// Story 1.3: send gate, one test per AD-20 branch.
import { describe, expect, it } from "vitest";
import { messages } from "../i18n/messages";
import { canSend } from "./gate";

const KEY = { keyConfigured: true };
const NO_KEY = { keyConfigured: false };

describe("canSend (AD-20)", () => {
  it("1. demo mode is always ok, even without Consent or key", () => {
    expect(canSend({}, null, "demo")).toEqual({ ok: true });
    expect(canSend({ consent: "declined" }, NO_KEY, "demo")).toEqual({ ok: true });
  });

  it("2. live without accepted Consent → consent.declined, checked before the key", () => {
    expect(canSend({}, KEY, "live")).toEqual({ ok: false, code: "consent.declined" });
    expect(canSend({ consent: "declined" }, NO_KEY, "live")).toEqual({ ok: false, code: "consent.declined" });
  });

  it("3. live with Consent but no key → err.noKey; a missing status counts as no key", () => {
    expect(canSend({ consent: "accepted" }, NO_KEY, "live")).toEqual({ ok: false, code: "err.noKey" });
    expect(canSend({ consent: "accepted" }, null, "live")).toEqual({ ok: false, code: "err.noKey" });
  });

  it("4. live with Consent and key → ok", () => {
    expect(canSend({ consent: "accepted" }, KEY, "live")).toEqual({ ok: true });
  });

  it("returns only codes that are message keys", () => {
    for (const code of ["consent.declined", "err.noKey"]) expect(Object.hasOwn(messages, code), code).toBe(true);
  });
});
