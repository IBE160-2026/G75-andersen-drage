// Story 1.3: startup status fetch (I/O matrix rows Status answers, Status down; AD-6).
import { describe, expect, it, vi } from "vitest";
import { fetchStatus, STATUS_INTERVAL_MS, type Status } from "./status";

const STATUS: Status = { keyConfigured: false, model: "anthropic/claude-haiku-5.5", provider: "OpenRouter", promptVersion: "1" };

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

describe("fetchStatus", () => {
  it("returns the status on the first answer without waiting", async () => {
    const fetchImpl = vi.fn(async () => ok(STATUS));
    const delay = vi.fn(async () => {});
    expect(await fetchStatus({ fetchImpl, delay })).toEqual(STATUS);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]).toContain("/api/status");
    expect(delay).not.toHaveBeenCalled();
  });

  it("retries after failures, 1 s apart, and returns the later answer", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockResolvedValueOnce(ok(STATUS));
    const delay = vi.fn(async () => {});
    expect(await fetchStatus({ fetchImpl, delay })).toEqual(STATUS);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(delay.mock.calls).toEqual([[STATUS_INTERVAL_MS], [STATUS_INTERVAL_MS]]);
  });

  it("returns null after 3 failed tries", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("network"));
    const delay = vi.fn(async () => {});
    expect(await fetchStatus({ fetchImpl, delay })).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(delay).toHaveBeenCalledTimes(2);
  });

  it("treats a non-JSON or wrongly shaped body as a failed try", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("<html>", { status: 200 }))
      .mockResolvedValueOnce(ok({ keyConfigured: "yes" }))
      .mockResolvedValueOnce(ok({}));
    expect(await fetchStatus({ fetchImpl, delay: async () => {} })).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn<typeof fetch>();
    expect(await fetchStatus({ fetchImpl, delay: async () => {}, signal: controller.signal })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
