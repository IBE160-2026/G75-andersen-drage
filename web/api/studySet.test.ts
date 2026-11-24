// Story 1.9: the live generation client (spec I/O matrix rows gate, HTTP error, timeout, double submit; AD-6, AD-7, AD-11, AD-20).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Settings } from "../storage/settings";
import type { Status } from "./status";
import { checkSendGate, gateNeedsStatus, requestStudySet, STUDY_SET_TIMEOUT_MS, type StudySet } from "./studySet";

let settings: Settings = { schemaVersion: 1, consent: "accepted" };
vi.mock("../storage/settings", () => ({ readSettings: () => settings }));

const STATUS: Status = { keyConfigured: true, model: "anthropic/claude-haiku-5.5", provider: "OpenRouter", promptVersion: "2" };
const PASSAGES = [{ id: "p1", text: "Scrum er et rammeverk for team." }];
const STUDY_SET: StudySet = {
  concepts: [
    {
      name: "Scrum",
      centralityRank: 1,
      flashcards: [{ front: "Hva?", back: "Et rammeverk.", passageId: "p1", quote: "Scrum er et rammeverk for team." }],
      quizQuestions: [
        { question: "Hva?", options: ["a", "b", "c", "d"], correctIndex: 0, passageId: "p1", quote: "Scrum er et rammeverk" },
      ],
    },
  ],
  summaryPoints: [{ text: "Scrum.", passageId: "p1", quote: "Scrum er et rammeverk for team." }],
  language: "nb",
  model: "anthropic/claude-haiku-5.5",
  promptVersion: "2",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let n = 0;
/** A fresh Note Hash per test, so the module's single-flight map never leaks between tests. */
const hash = () => `${++n}`.padStart(64, "0");

/** A fetch that never answers until its signal aborts, then rejects like the browser. */
const hanging = () =>
  vi.fn<typeof fetch>(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
  );

beforeEach(() => {
  settings = { schemaVersion: 1, consent: "accepted" };
});
afterEach(() => {
  vi.useRealTimers();
});

describe("send gate (AD-20)", () => {
  it("no Consent: consent.declined, no request", async () => {
    settings = { schemaVersion: 1, consent: "declined" };
    const fetchImpl = vi.fn<typeof fetch>();
    expect(await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl })).toEqual({
      ok: false,
      code: "consent.declined",
    });
    settings = { schemaVersion: 1 };
    expect(await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl })).toEqual({
      ok: false,
      code: "consent.declined",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("no key, or no status yet: err.noKey, no request", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    for (const status of [null, { ...STATUS, keyConfigured: false }]) {
      expect(await requestStudySet({ noteHash: hash(), passages: PASSAGES, status, fetchImpl })).toEqual({
        ok: false,
        code: "err.noKey",
      });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads the settings on every call", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(STUDY_SET));
    expect((await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl })).ok).toBe(true);
    settings = { schemaVersion: 1, consent: "declined" };
    expect(await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl })).toEqual({
      ok: false,
      code: "consent.declined",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  // Epic 1 retrospective R5: only a live request with Consent waits for /api/status.
  it.each<[Settings, boolean]>([
    [{ schemaVersion: 1, consent: "accepted" }, true],
    [{ schemaVersion: 1, consent: "accepted", demoMode: false }, true],
    [{ schemaVersion: 1, consent: "accepted", demoMode: true }, false],
    [{ schemaVersion: 1, consent: "declined" }, false],
    [{ schemaVersion: 1 }, false],
    [{ schemaVersion: 1, consent: "declined", demoMode: true }, false],
  ])("gateNeedsStatus with %j: %s", (next, expected) => {
    settings = next;
    expect(gateNeedsStatus()).toBe(expected);
  });
});

describe("request and response", () => {
  it("happy: one live POST with the Passages; the StudySet comes back", async () => {
    const noteHash = hash();
    const fetchImpl = vi.fn<typeof fetch>(async () => json(STUDY_SET));
    expect(await requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl })).toEqual({
      ok: true,
      studySet: STUDY_SET,
      mode: "live",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("/api/study-set");
    expect(init?.method).toBe("POST");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toEqual({ mode: "live", noteHash, passages: PASSAGES });
  });

  it.each([
    [429, { code: "err.generation" }],
    [500, { code: "err.generation" }],
    [502, { code: "err.generation" }],
    [503, { code: "err.generation" }],
    [503, { code: "err.somethingNew" }],
    [503, {}],
    [500, { code: "err.noKey" }],
    [504, { code: "err.generation" }],
    [400, { code: "err.somethingNew" }],
    [404, { code: "err.generation" }],
    [404, {}],
    [500, { code: "err.demoOnly" }],
  ])("HTTP %i %j: err.generation", async (status, body) => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(body, status));
    expect(await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl })).toEqual({
      ok: false,
      code: "err.generation",
    });
  });

  it("HTTP 503 err.noKey (key removed after startup): err.noKey", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json({ code: "err.noKey" }, 503));
    expect(await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl })).toEqual({
      ok: false,
      code: "err.noKey",
    });
  });

  it("HTTP 503 with a non-JSON body: err.generation", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("<html>", { status: 503 }));
    expect(await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl })).toEqual({
      ok: false,
      code: "err.generation",
    });
  });

  it.each([
    ["network error", async () => Promise.reject(new TypeError("Failed to fetch"))],
    ["non-JSON body", async () => new Response("<html>", { status: 200 })],
    ["wrong shape", async () => json({ concepts: "nope" })],
    ["empty body", async () => new Response(null, { status: 200 })],
  ])("%s: err.generation", async (_name, impl) => {
    const fetchImpl = vi.fn<typeof fetch>(impl as typeof fetch);
    expect(await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl })).toEqual({
      ok: false,
      code: "err.generation",
    });
  });

  it("drops unknown response fields", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json({ ...STUDY_SET, extra: 1 }));
    const result = await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl });
    expect(result.ok && result.studySet).toEqual(STUDY_SET);
  });
});

describe("abort and timeout", () => {
  it("no answer within 90 s: aborted, then err.generation", async () => {
    vi.useFakeTimers();
    const fetchImpl = hanging();
    const result = requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl });
    await vi.advanceTimersByTimeAsync(STUDY_SET_TIMEOUT_MS - 1);
    expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(await result).toEqual({ ok: false, code: "err.generation" });
  });

  it("the caller's abort aborts the request and frees the Note Hash at once", async () => {
    const noteHash = hash();
    const controller = new AbortController();
    const fetchImpl = hanging();
    const first = requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, signal: controller.signal, fetchImpl });
    controller.abort();
    expect(fetchImpl.mock.calls[0][1]?.signal?.aborted).toBe(true);
    // A new screen for the same Note (for example a remount) starts a fresh request.
    const again = vi.fn<typeof fetch>(async () => json(STUDY_SET));
    const second = requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl: again });
    expect(await first).toEqual({ ok: false, code: "err.generation" });
    expect((await second).ok).toBe(true);
    expect(again).toHaveBeenCalledOnce();
  });

  it("an already aborted signal does not get the pending promise of another caller", async () => {
    const noteHash = hash();
    let answer!: (res: Response) => void;
    const fetchImpl = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => (answer = resolve)));
    const first = requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl });
    const controller = new AbortController();
    controller.abort();
    const late = requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, signal: controller.signal, fetchImpl });
    expect(late).not.toBe(first);
    answer(json(STUDY_SET));
    expect(await late).toEqual({ ok: false, code: "err.generation" });
    expect((await first).ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("an already aborted signal sends nothing", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn<typeof fetch>();
    expect(
      await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, signal: controller.signal, fetchImpl }),
    ).toEqual({ ok: false, code: "err.generation" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("single-flight per Note Hash (AD-11)", () => {
  it("a second call while pending returns the same promise: exactly 1 request", async () => {
    const noteHash = hash();
    let answer!: (res: Response) => void;
    const fetchImpl = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => (answer = resolve)));
    const first = requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl });
    const second = requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl });
    expect(second).toBe(first);
    expect(fetchImpl).toHaveBeenCalledOnce();
    answer(json(STUDY_SET));
    expect((await first).ok).toBe(true);
  });

  it("another Note Hash is its own request; after an answer the hash is free again", async () => {
    const noteHash = hash();
    const fetchImpl = vi.fn<typeof fetch>(async () => json(STUDY_SET));
    await Promise.all([
      requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl }),
      requestStudySet({ noteHash: hash(), passages: PASSAGES, status: STATUS, fetchImpl }),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("the gate runs before the pending map: a declined Consent is not answered by a pending success", async () => {
    const noteHash = hash();
    const fetchImpl = hanging();
    const controller = new AbortController();
    void requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, signal: controller.signal, fetchImpl });
    settings = { schemaVersion: 1, consent: "declined" };
    expect(await requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl })).toEqual({
      ok: false,
      code: "consent.declined",
    });
    controller.abort();
  });
});

describe("Demo Mode (Story 1.14, FR-23, AD-20)", () => {
  it("demoMode on with a key configured: the POST is mode demo and the result says so", async () => {
    settings = { schemaVersion: 1, consent: "accepted", demoMode: true };
    const noteHash = hash();
    const fetchImpl = vi.fn<typeof fetch>(async () => json(STUDY_SET));
    expect(await requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl })).toEqual({
      ok: true,
      studySet: STUDY_SET,
      mode: "demo",
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[0][1]?.body))).toEqual({ mode: "demo", noteHash, passages: PASSAGES });
  });

  it("demo passes the gate with no Consent decision, declined Consent and no key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(STUDY_SET));
    for (const consent of [undefined, "declined"] as const) {
      settings = { schemaVersion: 1, consent, demoMode: true };
      for (const status of [null, { ...STATUS, keyConfigured: false }]) {
        expect(checkSendGate(status)).toEqual({ ok: true });
        const result = await requestStudySet({ noteHash: hash(), passages: PASSAGES, status, fetchImpl });
        expect(result.ok && result.mode).toBe("demo");
      }
    }
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("demoMode false or absent stays live (Demo off: unchanged gate)", () => {
    settings = { schemaVersion: 1, consent: "declined", demoMode: false };
    expect(checkSendGate(STATUS)).toEqual({ ok: false, code: "consent.declined" });
    settings = { schemaVersion: 1, consent: "accepted" };
    expect(checkSendGate(null)).toEqual({ ok: false, code: "err.noKey" });
  });

  it("HTTP 404 err.demoOnly (a Note without a Fixture): err.demoOnly", async () => {
    settings = { schemaVersion: 1, demoMode: true };
    const fetchImpl = vi.fn<typeof fetch>(async () => json({ code: "err.demoOnly" }, 404));
    expect(await requestStudySet({ noteHash: hash(), passages: PASSAGES, status: null, fetchImpl })).toEqual({
      ok: false,
      code: "err.demoOnly",
    });
  });

  it("single-flight is per mode: a demo call does not get a pending live promise for the same Note", async () => {
    const noteHash = hash();
    let answer!: (res: Response) => void;
    const fetchImpl = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => (answer = resolve)));
    const live = requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl });
    const liveAnswer = answer;
    settings = { schemaVersion: 1, consent: "accepted", demoMode: true };
    const demo = requestStudySet({ noteHash, passages: PASSAGES, status: STATUS, fetchImpl });
    expect(demo).not.toBe(live);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    liveAnswer(json(STUDY_SET));
    answer(json(STUDY_SET));
    expect((await live).ok).toBe(true);
    const [l, d] = [await live, await demo];
    expect(l.ok && l.mode).toBe("live");
    expect(d.ok && d.mode).toBe("demo");
  });
});
