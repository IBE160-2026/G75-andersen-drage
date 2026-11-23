// Send gate (AD-20). Pure: the api/ client calls it with fresh settings before every POST
// (wired in Story 1.9). Order: demo → ok; no Consent → consent.declined; no key → err.noKey.

export type SendMode = "live" | "demo";

/** Structural subsets, so core/ does not depend on storage/ or api/. */
export type GateSettings = { consent?: "accepted" | "declined" };
export type GateStatus = { keyConfigured: boolean };

export type GateResult = { ok: true } | { ok: false; code: "consent.declined" | "err.noKey" };

/** `status` is null while /api/status has not answered; it then counts as no key configured. */
export function canSend(settings: GateSettings, status: GateStatus | null, mode: SendMode): GateResult {
  if (mode === "demo") return { ok: true };
  if (settings.consent !== "accepted") return { ok: false, code: "consent.declined" };
  if (!status?.keyConfigured) return { ok: false, code: "err.noKey" };
  return { ok: true };
}
