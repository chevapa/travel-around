import { describe, expect, it } from "vitest";
import { haversineKm, migratePlace, parseDriveMinutes, HOME, type RawPlace } from "./migrate";

describe("parseDriveMinutes", () => {
  it("parses minutes only", () => {
    expect(parseDriveMinutes("50 мин")).toBe(50);
  });

  it("parses hours only", () => {
    expect(parseDriveMinutes("1 ч")).toBe(60);
  });

  it("parses hours and minutes", () => {
    expect(parseDriveMinutes("2 ч 15 мин")).toBe(135);
  });

  it("returns null for unparseable text", () => {
    expect(parseDriveMinutes("рядом")).toBeNull();
  });
});

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm(HOME, HOME)).toBe(0);
  });

  it("matches a known distance within rounding tolerance (Zagreb-ish to Ljubljana-ish, ~130km)", () => {
    const ljubljana = { lat: 46.0569, lon: 14.5058 };
    const km = haversineKm(HOME, ljubljana);
    expect(km).toBeGreaterThan(115);
    expect(km).toBeLessThan(145);
  });
});

function rawPlace(overrides: Partial<RawPlace> = {}): RawPlace {
  return {
    id: "abc123",
    name: "Test",
    lat: 45.9,
    lng: 15.7,
    cats: ["castle"],
    ...overrides,
  };
}

describe("migratePlace", () => {
  it("maps cat: loved -> state: loved, no issues", () => {
    const { frame, issues } = migratePlace(rawPlace({ cat: "loved", drive: "50 мин" }));
    expect(frame.state).toBe("loved");
    expect(frame.driveMinutes).toBe(50);
    expect(issues).toEqual([]);
  });

  it("maps cat: ok -> state: fine", () => {
    const { frame } = migratePlace(rawPlace({ cat: "ok" }));
    expect(frame.state).toBe("fine");
  });

  it("maps cat: plan -> state: unprinted", () => {
    const { frame } = migratePlace(rawPlace({ cat: "plan" }));
    expect(frame.state).toBe("unprinted");
  });

  it("maps a missing cat -> state: unprinted, matching the site's own default", () => {
    const { frame, issues } = migratePlace(rawPlace({ cat: undefined, drive: "50 мин" }));
    expect(frame.state).toBe("unprinted");
    // absence of `cat` is the documented default, not an error — no issue for it
    expect(issues.some((i) => i.includes("cat"))).toBe(false);
  });

  it("flags an unrecognized cat value and still defaults to unprinted", () => {
    const { frame, issues } = migratePlace(rawPlace({ cat: "maybe" }));
    expect(frame.state).toBe("unprinted");
    expect(issues.some((i) => i.includes("unrecognized cat"))).toBe(true);
  });

  it("estimates driveMinutes from distance and logs it when drive is missing", () => {
    const { frame, issues } = migratePlace(rawPlace({ drive: undefined }));
    expect(frame.driveMinutes).toBeGreaterThan(0);
    expect(issues.some((i) => i.includes("no drive field"))).toBe(true);
  });

  it("estimates and logs when drive text doesn't parse", () => {
    const { issues } = migratePlace(rawPlace({ drive: "рядом, пешком" }));
    expect(issues.some((i) => i.includes("could not parse drive text"))).toBe(true);
  });

  it("carries tags from cats with no emoji introduced", () => {
    const { frame } = migratePlace(rawPlace({ cats: ["castle", "view"] }));
    expect(frame.tags).toEqual(["castle", "view"]);
  });

  it("defaults tags to an empty array when cats is absent", () => {
    const { frame } = migratePlace(rawPlace({ cats: undefined }));
    expect(frame.tags).toEqual([]);
  });
});
