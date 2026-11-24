// POST /api/study-set (AD-6, AD-7, AD-11, AD-20). Never throws, never retries.
// Order: send gate with freshly read settings → single-flight per Note Hash → POST with a 90 s
// browser timeout merged with the caller's signal → guarded parse of the StudySet.
import { z } from "zod";
import { canSend, type GateResult } from "../core/gate";
import { readSettings } from "../storage/settings";
import type { components } from "./schema";
import type { Status } from "./status";

export type StudySet = components["schemas"]["StudySet"];
type StudySetRequest = components["schemas"]["StudySetRequest"];
type Passage = components["schemas"]["Passage"];

/** FR-11, AD-7: the browser gives up after 90 s (the Proxy deadline is 85 s). */
export const STUDY_SET_TIMEOUT_MS = 90_000;

export type StudySetErrorCode = "consent.declined" | "err.noKey" | "err.generation";
export type StudySetResult = { ok: true; studySet: StudySet } | { ok: false; code: StudySetErrorCode };

const GENERATION_FAILED: StudySetResult = { ok: false, code: "err.generation" };

const QuoteRef = { passageId: z.string(), quote: z.string() };
/** Runtime guard for the contract type; typed against schema.d.ts so the two cannot drift silently. */
const StudySetSchema: z.ZodType<StudySet> = z.object({
  concepts: z.array(
    z.object({
      name: z.string(),
      centralityRank: z.number(),
      flashcards: z.array(z.object({ front: z.string(), back: z.string(), ...QuoteRef })),
      quizQuestions: z.array(
        z.object({ question: z.string(), options: z.array(z.string()), correctIndex: z.number(), ...QuoteRef }),
      ),
    }),
  ),
  summaryPoints: z.array(z.object({ text: z.string(), ...QuoteRef })),
  language: z.string(),
  model: z.string(),
  promptVersion: z.string(),
});

/** AD-20 for a live send, with settings read now (Consent may have changed since startup). */
export function checkSendGate(status: Status | null): GateResult {
  return canSend(readSettings(), status, "live");
}

type RequestOptions = {
  noteHash: string;
  passages: readonly Passage[];
  /** `useAppSettings().status`; null (no answer yet) counts as no key. */
  status: Status | null;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const pending = new Map<string, Promise<StudySetResult>>();

/**
 * One live generation. A second call for the same Note Hash while one is in flight returns the
 * pending promise (no second request). Aborting the caller's signal aborts the request, frees the
 * Note Hash at once and resolves to `err.generation`; every non-2xx, network, timeout or parse
 * failure is `err.generation` too.
 */
export function requestStudySet({
  noteHash,
  passages,
  status,
  signal,
  fetchImpl = fetch,
  timeoutMs = STUDY_SET_TIMEOUT_MS,
}: RequestOptions): Promise<StudySetResult> {
  const gate = checkSendGate(status);
  if (!gate.ok) return Promise.resolve({ ok: false, code: gate.code });

  if (signal?.aborted) return Promise.resolve(GENERATION_FAILED);
  const inFlight = pending.get(noteHash);
  if (inFlight) return inFlight;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const release = () => {
    if (pending.get(noteHash) === promise) pending.delete(noteHash);
  };
  const onAbort = () => {
    release();
    controller.abort();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  const body: StudySetRequest = { mode: "live", noteHash, passages: passages.map((p) => ({ id: p.id, text: p.text })) };
  const promise: Promise<StudySetResult> = post(fetchImpl, body, controller.signal).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
    release();
  });
  pending.set(noteHash, promise);
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
    // 429, 5xx, 503 err.noKey, unknown codes: all err.generation here (the gate covers no key up front).
    if (!res.ok) return GENERATION_FAILED;
    const parsed = StudySetSchema.safeParse(await res.json());
    if (signal.aborted) return GENERATION_FAILED;
    return parsed.success ? { ok: true, studySet: parsed.data } : GENERATION_FAILED;
  } catch {
    // Network error, abort (caller or timeout), non-JSON body.
    return GENERATION_FAILED;
  }
}
