// Main-thread side of extraction (Story 1.4): the type and size checks that run before any byte
// is read, and the Web Worker round trip with its 15 s kill switch (AD-8). Never rejects.
import { fileType, type ExtractErrorKey, type ExtractResult } from "./text";

/** FR-3: files over 10 MB are rejected before they are read. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const EXTRACT_TIMEOUT_MS = 15_000;

/** Type (extension, case-insensitive) first, then size. Null when the file may be read. */
export function checkFile(file: { name: string; size: number }): ExtractErrorKey | null {
  if (!fileType(file.name)) return "err.type";
  if (file.size > MAX_FILE_BYTES) return "err.size";
  return null;
}

/** The parts of Worker that extraction uses, so tests can pass a fake. */
export type WorkerLike = {
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
};

export function createExtractWorker(): WorkerLike {
  return new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
}

const UNREADABLE: ExtractResult = { ok: false, error: "err.unreadable" };

function isResult(value: unknown): value is ExtractResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { ok?: unknown; error?: unknown; note?: unknown; noteHash?: unknown };
  return v.ok === true ? typeof v.noteHash === "string" && typeof v.note === "object" : typeof v.error === "string";
}

/** Extracts `file` in a fresh worker. A timeout, a worker error or a malformed answer → `err.unreadable`. */
export function extractInWorker(
  file: File,
  {
    createWorker = createExtractWorker,
    timeoutMs = EXTRACT_TIMEOUT_MS,
  }: { createWorker?: () => WorkerLike; timeoutMs?: number } = {},
): Promise<ExtractResult> {
  return new Promise((resolve) => {
    let worker: WorkerLike;
    try {
      worker = createWorker();
    } catch {
      resolve(UNREADABLE);
      return;
    }
    let done = false;
    const finish = (result: ExtractResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(() => finish(UNREADABLE), timeoutMs);
    worker.onmessage = (event) => finish(isResult(event.data) ? event.data : UNREADABLE);
    worker.onerror = () => finish(UNREADABLE);
    worker.onmessageerror = () => finish(UNREADABLE);
    try {
      worker.postMessage({ file });
    } catch {
      finish(UNREADABLE);
    }
  });
}
