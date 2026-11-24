// The bundled sample notes (Story 1.14, FR-23): GET /samples/manifest.json and one sample file, both
// written into public/samples/ at build time by scripts/copy-samples.ts. Never throws.
// The browser only lists and loads them; whether a Note is a sample is decided by the Proxy (Note Hash).
import { z } from "zod";

export type SampleLanguage = "nb" | "en";
export type Sample = { file: string; title: string; language: SampleLanguage };

export const SAMPLES_BASE = "/samples/";
export const MANIFEST_URL = `${SAMPLES_BASE}manifest.json`;

// A file name only (no path parts), with one of the upload extensions.
const SampleSchema = z.object({
  file: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*\.(txt|md|docx|pdf)$/),
  title: z.string().min(1),
  language: z.enum(["nb", "en"]),
});
const ManifestSchema = z.array(SampleSchema).min(1);

export type ManifestResult = { ok: true; samples: Sample[] } | { ok: false; code: "err.generation" };
export type SampleFileResult = { ok: true; file: File } | { ok: false; code: "err.unreadable" };

type Options = { fetchImpl?: typeof fetch; signal?: AbortSignal };

/** The manifest, validated. Any network, HTTP or shape failure is `err.generation` (D-16). */
export async function fetchSampleManifest({ fetchImpl = fetch, signal }: Options = {}): Promise<ManifestResult> {
  try {
    const res = await fetchImpl(MANIFEST_URL, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) return { ok: false, code: "err.generation" };
    const parsed = ManifestSchema.safeParse(await res.json());
    return parsed.success ? { ok: true, samples: parsed.data } : { ok: false, code: "err.generation" };
  } catch {
    return { ok: false, code: "err.generation" };
  }
}

/** The extension of the sample's file, for the File name. */
function extension(file: string): string {
  return file.slice(file.lastIndexOf(".") + 1);
}

/**
 * The sample as a `File` named "{title}.{ext}" (spec Design Notes): the Note Hash depends only on the
 * Passages, so the Fixture still matches, and the title reads well in the top bar and source label.
 * Any network or HTTP failure is `err.unreadable`.
 */
export async function fetchSampleFile(sample: Sample, { fetchImpl = fetch, signal }: Options = {}): Promise<SampleFileResult> {
  try {
    const res = await fetchImpl(`${SAMPLES_BASE}${encodeURIComponent(sample.file)}`, { signal });
    if (!res.ok) return { ok: false, code: "err.unreadable" };
    const bytes = await res.arrayBuffer();
    return { ok: true, file: new File([bytes], `${sample.title}.${extension(sample.file)}`) };
  } catch {
    return { ok: false, code: "err.unreadable" };
  }
}
