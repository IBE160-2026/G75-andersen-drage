// POST /api/study-set (AD-6, AD-7, AD-11, AD-20). Never throws, never retries.
// Order: mode and send gate from freshly read settings → single-flight per mode and Note Hash → POST with a
// 90 s browser timeout merged with the caller's signal → guarded parse of the StudySet.
// Story 1.14: `demoMode` in the settings makes the POST `mode: "demo"` with `passages: []` (the Proxy serves a Fixture).
import { z } from "zod";
import { canSend, type GateResult, type SendMode } from "../core/gate";
import { readSettings, type Settings } from "../storage/settings";
import type { components } from "./schema";
import type { Status } from "./status";

export type StudySet = components["schemas"]["StudySet"];
type StudySetRequest = components["schemas"]["StudySetRequest"];
type Passage = components["schemas"]["Passage"];

/** FR-11, AD-7: the browser gives up after 90 s (the Proxy deadline is 85 s). */
export const STUDY_SET_TIMEOUT_MS = 90_000;

export type StudySetErrorCode = "consent.declined" | "err.noKey" | "err.demoOnly" | "err.generation";
/** `mode` is what was sent: the caller stores a demo answer under `demo:` keys (AD-9). */
export type StudySetResult = { ok: true; studySet: StudySet; mode: SendMode } | { ok: false; code: StudySetErrorCode };

const GENERATION_FAILED: StudySetResult = { ok: false, code: "err.generation" };
const NO_KEY: StudySetResult = { ok: false, code: "err.noKey" };
const DEMO_ONLY: StudySetResult = { ok: false, code: "err.demoOnly" };

const QuoteRef = { passageId: z.string(), quote: z.string() };
/**
 * Runtime guard for the contract type; typed against schema.d.ts so the two cannot drift silently. As
 * strict as the Proxy (Story 2.3, epic-1 retro R3): integer `centralityRank` and `correctIndex`, exactly
 * 4 options, `0 ≤ correctIndex ≤ 3`.
 */
const StudySetSchema: z.ZodType<StudySet> = z.object({
  concepts: z.array(
    z.object({
      name: z.string(),
      centralityRank: z.number().int(),
      flashcards: z.array(z.object({ front: z.string(), back: z.string(), ...QuoteRef })),
      quizQuestions: z.array(
        z.object({
          question: z.string(),
          options: z.array(z.string()).length(4),
          correctIndex: z.number().int().min(0).max(3),
          ...QuoteRef,
        }),
      ),
    }),
  ),
  summaryPoints: z.array(z.object({ text: z.string(), ...QuoteRef })),
  language: z.string(),
  model: z.string(),
  promptVersion: z.string(),
});

/** Demo Mode on → `"demo"`, else `"live"` (AD-20: api/ derives the mode, no screen decides it). */
export function sendMode(settings: Settings): SendMode {
  return settings.demoMode === true ? "demo" : "live";
}

/**
 * True when the gate's answer depends on /api/status: a live request with Consent accepted. Demo Mode
 * and a missing Consent decide without it, so they never wait for the status (AD-6).
 */
export function gateNeedsStatus(): boolean {
  const settings = readSettings();
  return sendMode(settings) === "live" && settings.consent === "accepted";
}

/** AD-20 with settings read now (Consent or Demo Mode may have changed since startup). */
export function checkSendGate(status: Status | null): GateResult {
  const settings = readSettings();
  return canSend(settings, status, sendMode(settings));
}

type RequestOptions = {
  noteHash: string;
  passages: readonly Passage[];
  /**
   * The settled status from `useAppSettings().waitForStatus()` (never the live `status` field, which is
   * null while the answer is pending). null (never answered, or not needed) counts as no key.
   */
  status: Status | null;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const pending = new Map<string, Promise<StudySetResult>>();

/**
 * One generation, live or demo by the current settings. In Demo Mode `passages` is not sent (the body
 * carries `passages: []`; the Proxy serves the Fixture by Note Hash). A second call for the same mode and Note Hash
 * while one is in flight returns the pending promise (no second request). Aborting the caller's signal aborts the request, frees the
 * Note Hash at once and resolves to `err.generation`; every network, timeout or parse failure and
 * every non-2xx is `err.generation` too, except a 503 `{code: "err.noKey"}`, which stays `err.noKey`, and a
 * 404 `{code: "err.demoOnly"}` (no Fixture for this Note in Demo Mode), which stays `err.demoOnly`.
 */
export function requestStudySet({
  noteHash,
  passages,
  status,
  signal,
  fetchImpl = fetch,
  timeoutMs = STUDY_SET_TIMEOUT_MS,
}: RequestOptions): Promise<StudySetResult> {
  const settings = readSettings();
  const mode = sendMode(settings);
  const gate = canSend(settings, status, mode);
  if (!gate.ok) return Promise.resolve({ ok: false, code: gate.code });

  if (signal?.aborted) return Promise.resolve(GENERATION_FAILED);
  const flightKey = `${mode}:${noteHash}`;
  const inFlight = pending.get(flightKey);
  if (inFlight) return inFlight;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const release = () => {
    if (pending.get(flightKey) === promise) pending.delete(flightKey);
  };
  const onAbort = () => {
    release();
    controller.abort();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  // Demo Mode sends no Passages: the Proxy serves a Fixture by Note Hash alone, and Demo needs no Consent,
  // so an own Note's text must never leave the browser in Demo Mode (epic-1 retro R1, D-21).
  const sent = mode === "demo" ? [] : passages.map((p) => ({ id: p.id, text: p.text }));
  const body: StudySetRequest = { mode, noteHash, passages: sent };
  const promise: Promise<StudySetResult> = post(fetchImpl, body, controller.signal).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
    release();
  });
  pending.set(flightKey, promise);
  return promise;
}

async function post(fetchImpl: typeof fetch, body: StudySetRequest, signal: AbortSignal): Promise<StudySetResult> {
  try {
    const res = await fetchImpl("/api/study-set", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    // The gate covers no key up front; a 503 err.noKey means the key was removed after startup.
    // Every other non-2xx (429, 5xx, unknown or missing code) is err.generation.
    if (!res.ok) {
      if (res.status === 503 || res.status === 404) {
        const code = await errorCode(res);
        if (signal.aborted) return GENERATION_FAILED;
        if (res.status === 503 && code === "err.noKey") return NO_KEY;
        if (res.status === 404 && code === "err.demoOnly") return DEMO_ONLY;
      }
      return GENERATION_FAILED;
    }
    const parsed = StudySetSchema.safeParse(await res.json());
    if (signal.aborted) return GENERATION_FAILED;
    return parsed.success ? { ok: true, studySet: parsed.data, mode: body.mode } : GENERATION_FAILED;
  } catch {
    // Network error, abort (caller or timeout), non-JSON body.
    return GENERATION_FAILED;
  }
}

/** The `{code}` of an error body, or null for a missing, non-JSON or other-shaped body. */
async function errorCode(res: Response): Promise<string | null> {
  try {
    const body: unknown = await res.json();
    if (typeof body === "object" && body !== null && "code" in body && typeof body.code === "string") return body.code;
    return null;
  } catch {
    return null;
  }
}
