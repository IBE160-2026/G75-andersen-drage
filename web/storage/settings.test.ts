// Story 1.3: settings storage (I/O matrix rows Corrupt setting, Storage blocked; AD-10).
import { describe, expect, it } from "vitest";
import { createSettingsStore, DEFAULT_SETTINGS, SETTINGS_KEY } from "./settings";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe("settings storage", () => {
  it("returns defaults when nothing is stored", () => {
    const store = createSettingsStore(() => fakeStorage());
    expect(store.read()).toEqual(DEFAULT_SETTINGS);
    expect(store.read().consent).toBeUndefined();
  });

  it("round-trips a Consent decision with schemaVersion", () => {
    const s = fakeStorage();
    const store = createSettingsStore(() => s);
    store.write({ schemaVersion: 1, consent: "accepted" });
    expect(JSON.parse(s.data.get(SETTINGS_KEY)!)).toEqual({ schemaVersion: 1, consent: "accepted" });
    expect(store.read()).toEqual({ schemaVersion: 1, consent: "accepted" });
  });

  it("keeps unknown fields", () => {
    const s = fakeStorage({ [SETTINGS_KEY]: JSON.stringify({ schemaVersion: 1, consent: "declined", demoMode: true }) });
    const store = createSettingsStore(() => s);
    const read = store.read();
    expect(read).toEqual({ schemaVersion: 1, consent: "declined", demoMode: true });
    store.write({ ...read, consent: "accepted" });
    expect(JSON.parse(s.data.get(SETTINGS_KEY)!)).toEqual({ schemaVersion: 1, consent: "accepted", demoMode: true });
  });

  it.each([
    ["invalid JSON", "{nope"],
    ["wrong consent value", JSON.stringify({ schemaVersion: 1, consent: "maybe" })],
    ["missing schemaVersion", JSON.stringify({ consent: "accepted" })],
    ["unknown schemaVersion", JSON.stringify({ schemaVersion: 2, consent: "accepted" })],
    ["not an object", JSON.stringify("accepted")],
  ])("treats %s as no decision and resets the setting", (_name, raw) => {
    const s = fakeStorage({ [SETTINGS_KEY]: raw });
    const store = createSettingsStore(() => s);
    expect(store.read()).toEqual(DEFAULT_SETTINGS);
    expect(s.data.has(SETTINGS_KEY)).toBe(false);
  });

  it("falls back to memory when storage access throws", () => {
    const store = createSettingsStore(() => {
      throw new Error("SecurityError");
    });
    expect(store.read()).toEqual(DEFAULT_SETTINGS);
    store.write({ schemaVersion: 1, consent: "accepted" });
    expect(store.read().consent).toBe("accepted");
    expect(store.usingMemory()).toBe(true);
  });

  it("falls back to memory when getItem / setItem throw", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    };
    const store = createSettingsStore(() => throwing);
    expect(store.read()).toEqual(DEFAULT_SETTINGS);
    store.write({ schemaVersion: 1, consent: "declined" });
    expect(store.read().consent).toBe("declined");
    expect(store.usingMemory()).toBe(true);
  });

  it("falls back to memory when there is no storage", () => {
    const store = createSettingsStore(() => undefined);
    store.write({ schemaVersion: 1, consent: "accepted" });
    expect(store.read().consent).toBe("accepted");
  });
});
