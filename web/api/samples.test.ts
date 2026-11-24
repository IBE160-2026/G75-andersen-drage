// Story 1.14: the sample manifest and sample files (I/O matrix "Pick sample": fetch fails → err.unreadable,
// manifest fails → err.generation).
import { describe, expect, it, vi } from "vitest";
import { fetchSampleFile, fetchSampleManifest, MANIFEST_URL, type Sample } from "./samples";

const MANIFEST: Sample[] = [
  { file: "nb-smidig-scrum.md", title: "Smidig utvikling og Scrum", language: "nb" },
  { file: "en-unit-testing.pdf", title: "Unit testing", language: "en" },
];
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("fetchSampleManifest", () => {
  it("returns the validated manifest", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(MANIFEST));
    expect(await fetchSampleManifest({ fetchImpl })).toEqual({ ok: true, samples: MANIFEST });
    expect(fetchImpl.mock.calls[0][0]).toBe(MANIFEST_URL);
  });

  it.each([
    ["network error", async () => Promise.reject(new TypeError("Failed to fetch"))],
    ["HTTP 404", async () => json({}, 404)],
    ["non-JSON", async () => new Response("<html>")],
    ["empty list", async () => json([])],
    ["unknown language", async () => json([{ ...MANIFEST[0], language: "de" }])],
    ["path in file name", async () => json([{ ...MANIFEST[0], file: "../secret.md" }])],
    ["missing title", async () => json([{ file: "a.md", language: "nb" }])],
  ])("%s: err.generation", async (_name, impl) => {
    const fetchImpl = vi.fn<typeof fetch>(impl as typeof fetch);
    expect(await fetchSampleManifest({ fetchImpl })).toEqual({ ok: false, code: "err.generation" });
  });
});

describe("fetchSampleFile", () => {
  it("names the File '{title}.{ext}' and keeps the bytes", async () => {
    const bytes = new Uint8Array([1, 2, 3, 250]);
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(bytes));
    const result = await fetchSampleFile(MANIFEST[1], { fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toBe("/samples/en-unit-testing.pdf");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.file.name).toBe("Unit testing.pdf");
    expect(new Uint8Array(await result.file.arrayBuffer())).toEqual(bytes);
  });

  it.each([
    ["network error", async () => Promise.reject(new TypeError("Failed to fetch"))],
    ["HTTP 404", async () => new Response("", { status: 404 })],
  ])("%s: err.unreadable", async (_name, impl) => {
    const fetchImpl = vi.fn<typeof fetch>(impl as typeof fetch);
    expect(await fetchSampleFile(MANIFEST[0], { fetchImpl })).toEqual({ ok: false, code: "err.unreadable" });
  });
});
