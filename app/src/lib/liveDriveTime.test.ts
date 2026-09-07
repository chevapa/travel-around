import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetLiveDriveTimeCacheForTests, fetchLiveDriveTime } from "./liveDriveTime";

const ORIGIN = { lat: 45.815, lon: 15.9819 }; // Zagreb
const DEST = { lat: 46.16, lon: 15.87 }; // Krapina-ish

describe("fetchLiveDriveTime", () => {
  beforeEach(() => {
    _resetLiveDriveTimeCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns rounded minutes and km from the OSRM route response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ routes: [{ duration: 2521, distance: 41200 }] }),
      } as Response),
    );
    await expect(fetchLiveDriveTime(ORIGIN, DEST)).resolves.toEqual({ minutes: 42, km: 41 });
  });

  it("resolves to undefined, not a rejection, when the response has no routes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ routes: [] }) } as Response));
    await expect(fetchLiveDriveTime(ORIGIN, DEST)).resolves.toBeUndefined();
  });

  it("resolves to undefined, not a rejection, on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as Response));
    await expect(fetchLiveDriveTime(ORIGIN, DEST)).resolves.toBeUndefined();
  });

  it("resolves to undefined, not a rejection, on a network error/timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("aborted")));
    await expect(fetchLiveDriveTime(ORIGIN, DEST)).resolves.toBeUndefined();
  });

  it("caches by origin/destination pair — a second call doesn't refetch", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ routes: [{ duration: 600, distance: 10000 }] }) } as Response);
    vi.stubGlobal("fetch", fetchSpy);
    await fetchLiveDriveTime(ORIGIN, DEST);
    await fetchLiveDriveTime(ORIGIN, DEST);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("treats a different destination as a different cache entry", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ routes: [{ duration: 600, distance: 10000 }] }) } as Response);
    vi.stubGlobal("fetch", fetchSpy);
    await fetchLiveDriveTime(ORIGIN, DEST);
    await fetchLiveDriveTime(ORIGIN, { lat: 44.0, lon: 15.0 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
