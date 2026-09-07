import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetWikipediaPhotoCacheForTests, fetchWikipediaPhoto } from "./wikipediaPhoto";

function mockFetchOnce(response: Partial<Response> & { jsonBody?: unknown }) {
  const { jsonBody, ...rest } = response;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => jsonBody,
      ...rest,
    } as Response),
  );
}

describe("fetchWikipediaPhoto", () => {
  beforeEach(() => {
    _resetWikipediaPhotoCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the thumbnail source when the article has one", async () => {
    mockFetchOnce({ jsonBody: { type: "standard", thumbnail: { source: "https://example.com/photo.jpg" } } });
    await expect(fetchWikipediaPhoto("Krapina")).resolves.toBe("https://example.com/photo.jpg");
  });

  it("resolves to undefined when the article has no thumbnail", async () => {
    mockFetchOnce({ jsonBody: { type: "standard" } });
    await expect(fetchWikipediaPhoto("Some obscure place")).resolves.toBeUndefined();
  });

  it("resolves to undefined for a disambiguation page rather than guessing a wrong photo", async () => {
    mockFetchOnce({ jsonBody: { type: "disambiguation", thumbnail: { source: "https://example.com/wrong.jpg" } } });
    await expect(fetchWikipediaPhoto("Springfield")).resolves.toBeUndefined();
  });

  it("resolves to undefined, not a rejection, when the article doesn't exist (404)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) } as Response));
    await expect(fetchWikipediaPhoto("Definitely Not A Real Place Xyzzy")).resolves.toBeUndefined();
  });

  it("resolves to undefined, not a rejection, on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(fetchWikipediaPhoto("Krapina")).resolves.toBeUndefined();
  });

  it("resolves to undefined for an empty/blank title without calling fetch at all", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(fetchWikipediaPhoto("   ")).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("caches by title — a second call for the same place doesn't refetch", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ thumbnail: { source: "https://example.com/a.jpg" } }) } as Response);
    vi.stubGlobal("fetch", fetchSpy);
    await fetchWikipediaPhoto("Krapina");
    await fetchWikipediaPhoto("Krapina");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
