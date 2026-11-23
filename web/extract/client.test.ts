// Main-thread checks and the worker round trip (spec 1.4): type and size before reading, 15 s kill switch.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkFile, EXTRACT_TIMEOUT_MS, extractInWorker, MAX_FILE_BYTES, type WorkerLike } from "./client";
import { extractNote, type ExtractResult } from "./text";

describe("checkFile", () => {
  it("fixes the limit at 10 × 1024 × 1024 bytes and the timeout at 15 s", () => {
    expect(MAX_FILE_BYTES).toBe(10 * 1024 * 1024);
    expect(EXTRACT_TIMEOUT_MS).toBe(15_000);
  });

  it.each(["notat.txt", "NOTAT.TXT", "a.MD", "x.docx", "y.PDF"])("accepts %s", (name) => {
    expect(checkFile({ name, size: 10 })).toBeNull();
  });

  it.each(["gammel.doc", "tekst.rtf", "uten-endelse"])("rejects %s with err.type", (name) => {
    expect(checkFile({ name, size: 10 })).toBe("err.type");
  });

  it("rejects more than 10 MB with err.size; exactly 10 MB passes", () => {
    expect(checkFile({ name: "stor.txt", size: MAX_FILE_BYTES + 1 })).toBe("err.size");
    expect(checkFile({ name: "stor.txt", size: MAX_FILE_BYTES })).toBeNull();
  });

  it("checks the type before the size", () => {
    expect(checkFile({ name: "stor.doc", size: MAX_FILE_BYTES + 1 })).toBe("err.type");
  });
});

/** A fake worker: `reply` decides what happens when a message is posted. */
function fakeWorker(reply: (worker: FakeWorker, message: unknown) => void) {
  const worker: FakeWorker = {
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    terminated: 0,
    posted: [],
    postMessage(message) {
      this.posted.push(message);
      reply(this, message);
    },
    terminate() {
      this.terminated++;
    },
  };
  return worker;
}
type FakeWorker = WorkerLike & { terminated: number; posted: unknown[] };

const file = (text: string, name = "notat.txt") => new File([text], name);
const words = (n: number) => Array.from({ length: n }, () => "ord").join(" ");

describe("extractInWorker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("posts the file, resolves with the worker's answer and terminates the worker", async () => {
    const worker = fakeWorker((w, message) => {
      const { file: f } = message as { file: File };
      void f.arrayBuffer().then(async (buf) => {
        const result = await extractNote(f.name, new Uint8Array(buf));
        w.onmessage?.({ data: result } as MessageEvent);
      });
    });
    const f = file(words(200));
    const result = await extractInWorker(f, { createWorker: () => worker });
    expect(worker.posted).toEqual([{ file: f }]);
    expect(result.ok).toBe(true);
    expect(worker.terminated).toBe(1);
  });

  it("passes rejection keys through", async () => {
    const worker = fakeWorker((w) => w.onmessage?.({ data: { ok: false, error: "err.tooShort" } } as MessageEvent));
    expect(await extractInWorker(file("kort"), { createWorker: () => worker })).toEqual({ ok: false, error: "err.tooShort" });
  });

  it("terminates a hanging worker at the timeout and gives err.unreadable", async () => {
    const worker = fakeWorker(() => {});
    const pending = extractInWorker(file("x"), { createWorker: () => worker });
    let settled: ExtractResult | undefined;
    void pending.then((r) => (settled = r));
    await vi.advanceTimersByTimeAsync(EXTRACT_TIMEOUT_MS - 1);
    expect(settled).toBeUndefined();
    expect(worker.terminated).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toEqual({ ok: false, error: "err.unreadable" });
    expect(worker.terminated).toBe(1);
  });

  it("honours a custom timeout", async () => {
    const worker = fakeWorker(() => {});
    const pending = extractInWorker(file("x"), { createWorker: () => worker, timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(50);
    expect(await pending).toEqual({ ok: false, error: "err.unreadable" });
  });

  it("gives err.unreadable and terminates on a worker error", async () => {
    const worker = fakeWorker((w) => w.onerror?.({} as ErrorEvent));
    expect(await extractInWorker(file("x"), { createWorker: () => worker })).toEqual({ ok: false, error: "err.unreadable" });
    expect(worker.terminated).toBe(1);
  });

  it("gives err.unreadable on a message that cannot be cloned or a malformed answer", async () => {
    const bad = fakeWorker((w) => w.onmessageerror?.({} as MessageEvent));
    expect(await extractInWorker(file("x"), { createWorker: () => bad })).toEqual({ ok: false, error: "err.unreadable" });
    const odd = fakeWorker((w) => w.onmessage?.({ data: { ok: true } } as MessageEvent));
    expect(await extractInWorker(file("x"), { createWorker: () => odd })).toEqual({ ok: false, error: "err.unreadable" });
  });

  it("gives err.unreadable when the worker cannot be created or posted to", async () => {
    expect(
      await extractInWorker(file("x"), {
        createWorker: () => {
          throw new Error("no workers");
        },
      }),
    ).toEqual({ ok: false, error: "err.unreadable" });
    const worker = fakeWorker(() => {
      throw new Error("DataCloneError");
    });
    expect(await extractInWorker(file("x"), { createWorker: () => worker })).toEqual({ ok: false, error: "err.unreadable" });
    expect(worker.terminated).toBe(1);
  });

  it("ignores a late answer after the timeout", async () => {
    const worker = fakeWorker(() => {});
    const pending = extractInWorker(file("x"), { createWorker: () => worker, timeoutMs: 10 });
    await vi.advanceTimersByTimeAsync(10);
    expect(await pending).toEqual({ ok: false, error: "err.unreadable" });
    expect(worker.onmessage).toBeNull();
    expect(worker.terminated).toBe(1);
  });
});
