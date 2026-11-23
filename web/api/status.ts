// GET /api/status at startup (AD-6): 3 tries, 1 s apart. `null` means the status never
// answered: live submit stays disabled and Consent uses the fallback provider name.
import type { components } from "./schema";

export type Status = components["schemas"]["Status"];

export const STATUS_TRIES = 3;
export const STATUS_INTERVAL_MS = 1000;

type FetchStatusOptions = {
  fetchImpl?: typeof fetch;
  delay?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isStatus(body: unknown): body is Status {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.keyConfigured === "boolean" &&
    typeof b.model === "string" &&
    typeof b.provider === "string" &&
    typeof b.promptVersion === "string"
  );
}

/** Never throws. Returns the Status, or null after STATUS_TRIES failed tries (or on abort). */
export async function fetchStatus({ fetchImpl = fetch, delay = wait, signal }: FetchStatusOptions = {}): Promise<Status | null> {
  for (let attempt = 1; attempt <= STATUS_TRIES; attempt++) {
    if (signal?.aborted) return null;
    try {
      const res = await fetchImpl("/api/status", { signal, headers: { Accept: "application/json" } });
      if (res.ok) {
        const body: unknown = await res.json();
        if (isStatus(body)) return body;
      }
    } catch {
      // Network error, abort or non-JSON body: try again.
    }
    if (attempt < STATUS_TRIES) await delay(STATUS_INTERVAL_MS);
  }
  return null;
}
