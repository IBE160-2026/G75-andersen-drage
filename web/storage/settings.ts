// Settings in localStorage (AD-10). This module is the only code that touches
// localStorage; the pre-paint script in app/layout.tsx reads the same key read-only.
import { z } from "zod";

/** Inlined into the pre-paint script in app/layout.tsx; keep the two readers in step. */
export const SETTINGS_KEY = "torsa.settings";
export const SETTINGS_SCHEMA_VERSION = 1;

/** Unknown fields are kept (AD-10: readers ignore them, writers must not drop them). */
const SettingsSchema = z.looseObject({
  schemaVersion: z.literal(SETTINGS_SCHEMA_VERSION),
  consent: z.enum(["accepted", "declined"]).optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type ConsentDecision = NonNullable<Settings["consent"]>;

export const DEFAULT_SETTINGS: Settings = { schemaVersion: SETTINGS_SCHEMA_VERSION };

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SettingsStore = {
  /** Never throws. Invalid JSON or schema → the settings object is reset and defaults returned. */
  read(): Settings;
  /** Never throws. If storage fails, the value is kept in memory for this session. */
  write(settings: Settings): void;
  /** True once storage has failed and the in-memory fallback is in use (Story 3.7 reports it). */
  usingMemory(): boolean;
};

/** `getStorage` may throw or return null (blocked or missing storage): memory fallback. */
export function createSettingsStore(getStorage: () => KeyValueStore | null | undefined): SettingsStore {
  let memory: Settings | null = null;
  let fallback = false;

  function storage(): KeyValueStore | null {
    if (fallback) return null;
    try {
      const s = getStorage();
      if (s) return s;
    } catch {
      // Blocked storage (for example a SecurityError on access).
    }
    fallback = true;
    return null;
  }

  function read(): Settings {
    const s = storage();
    if (!s) return memory ?? { ...DEFAULT_SETTINGS };
    try {
      const raw = s.getItem(SETTINGS_KEY);
      if (raw === null) return { ...DEFAULT_SETTINGS };
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }
      const result = SettingsSchema.safeParse(parsed);
      if (result.success) return result.data;
      s.removeItem(SETTINGS_KEY);
      return { ...DEFAULT_SETTINGS };
    } catch {
      fallback = true;
      return memory ?? { ...DEFAULT_SETTINGS };
    }
  }

  function write(settings: Settings): void {
    memory = { ...settings };
    const s = storage();
    if (!s) return;
    try {
      s.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      fallback = true;
    }
  }

  return { read, write, usingMemory: () => fallback };
}

const browserStore = createSettingsStore(() => globalThis.localStorage);

export function readSettings(): Settings {
  return browserStore.read();
}

export function writeSettings(settings: Settings): void {
  browserStore.write(settings);
}
