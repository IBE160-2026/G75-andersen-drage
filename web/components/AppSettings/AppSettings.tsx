"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchStatus, type Status } from "../../api/status";
import { format, t } from "../../i18n/messages";
import { readSettings, writeSettings, type ConsentDecision, type Settings } from "../../storage/settings";
import { MAIN_ID } from "../AppShell/ids";

type AppSettingsValue = {
  settings: Settings;
  /** null until /api/status answers (or for good, after 3 failed tries). */
  status: Status | null;
  /** "OpenRouter": {leverandør} in every string except consent.body. */
  provider: string;
  /** {leverandør} in consent.body: provider plus model once status has answered. */
  providerWithModel: string;
  consentOpen: boolean;
  accept(): void;
  decline(): void;
  /** Innstillinger › 'Trekk tilbake samtykke': same state as declining, no dialog. */
  withdraw(): void;
  /** Demo Mode on/off (Story 1.14): persisted at once; api/ reads it before every POST. */
  setDemoMode(on: boolean): void;
  /** Opens the Consent dialog; focus returns to `trigger` on close when it is still in the page. */
  openConsent(trigger?: HTMLElement | null): void;
  /** Where focus goes when the dialog closes (called by ConsentDialog's onCloseAutoFocus). */
  restoreFocus(): void;
};

/** Demovelger's route (Story 1.14). */
export const DEMO_PATH = "/demo";

const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export function useAppSettings(): AppSettingsValue {
  const value = useContext(AppSettingsContext);
  if (!value) throw new Error("useAppSettings outside AppSettingsProvider");
  return value;
}

function focusMainHeading() {
  document.querySelector<HTMLElement>(`#${MAIN_ID} h1`)?.focus();
}

/**
 * Settings, startup status and the Consent dialog state (spec 1.3). Mounted by AppShell
 * after mount, so localStorage is never read on the server.
 */
export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [settings, setSettings] = useState<Settings>(() => readSettings());
  const [status, setStatus] = useState<Status | null>(null);
  // First open: the gate shows until a decision is stored (AD-10, FR-5).
  const [consentOpen, setConsentOpen] = useState(() => settings.consent === undefined);
  const trigger = useRef<HTMLElement | null>(null);
  // True when the gate was shown without a trigger (first open): accept lands on Start, decline on
  // Demovelger (Story 1.14). A dialog reopened from a trigger returns focus there instead.
  const gate = useRef(consentOpen);
  const decision = useRef<ConsentDecision | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchStatus({ signal: controller.signal }).then((s) => {
      if (!controller.signal.aborted) setStatus(s);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.consent = settings.consent ?? "unset";
  }, [settings.consent]);

  /** Fresh read, patch, write: never drops a field another tab or screen wrote. */
  const update = useCallback((patch: Partial<Settings>) => {
    const next = { ...readSettings(), ...patch };
    writeSettings(next);
    setSettings(next);
  }, []);

  const decide = useCallback((consent: ConsentDecision) => update({ consent }), [update]);
  const setDemoMode = useCallback((demoMode: boolean) => update({ demoMode }), [update]);

  const close = useCallback(
    (consent: ConsentDecision) => {
      decide(consent);
      decision.current = consent;
      setConsentOpen(false);
    },
    [decide],
  );

  const restoreFocus = useCallback(() => {
    const target = trigger.current;
    trigger.current = null;
    const decided = decision.current;
    decision.current = null;
    if (gate.current) {
      gate.current = false;
      // First open (Story 1.14, decided by Tor 2026-11-24): 'Nei takk, vis demo' → Demovelger, accept → Start.
      const landing = decided === "declined" ? DEMO_PATH : "/";
      if (pathname !== landing) {
        router.push(landing);
        return;
      }
    }
    if (target && target.isConnected) target.focus();
    else focusMainHeading();
  }, [pathname, router]);

  const openConsent = useCallback((from?: HTMLElement | null) => {
    trigger.current = from ?? null;
    gate.current = false;
    setConsentOpen(true);
  }, []);

  const value = useMemo<AppSettingsValue>(() => {
    // Spec 1.3, Decisions: outside consent.body, {leverandør} is always just "OpenRouter".
    const provider = t("consent.provider.fallback");
    const providerWithModel = status
      ? format("consent.provider.model", { provider: status.provider, model: status.model })
      : t("consent.provider.fallback");
    return {
      settings,
      status,
      provider,
      providerWithModel,
      consentOpen,
      accept: () => close("accepted"),
      decline: () => close("declined"),
      withdraw: () => decide("declined"),
      setDemoMode,
      openConsent,
      restoreFocus,
    };
  }, [settings, status, consentOpen, close, decide, setDemoMode, openConsent, restoreFocus]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}
