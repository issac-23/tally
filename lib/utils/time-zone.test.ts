import { describe, it, expect } from "vitest";
import {
  FALLBACK_TIME_ZONE,
  isValidTimeZone,
  readTimeZone,
  timeZoneCookieOptions,
} from "./time-zone";

describe("readTimeZone", () => {
  it("keeps a zone Intl recognises", () => {
    expect(readTimeZone("America/New_York")).toBe("America/New_York");
    expect(readTimeZone("Asia/Tokyo")).toBe("Asia/Tokyo");
    expect(readTimeZone("UTC")).toBe("UTC");
  });

  it("keeps a legacy alias a browser might still report", () => {
    // Intl.supportedValuesOf lists canonical names only, so a check built on
    // it would turn these away even though Intl formats them happily.
    expect(readTimeZone("Asia/Calcutta")).toBe("Asia/Calcutta");
  });

  it("falls back on anything else", () => {
    for (const bad of [
      undefined,
      "",
      "Not/AZone",
      "Europe/London; DROP TABLE",
      "../../etc/passwd",
      "x".repeat(500),
    ]) {
      expect(readTimeZone(bad)).toBe(FALLBACK_TIME_ZONE);
    }
  });

  it("falls back to UTC, which is what a server with no zone did before", () => {
    expect(FALLBACK_TIME_ZONE).toBe("UTC");
  });
});

describe("isValidTimeZone", () => {
  it("turns a value away before Intl can throw on it", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("America/New_York")).toBe(true);
  });
});

describe("timeZoneCookieOptions", () => {
  it("stays readable to scripts, since the browser writes it", () => {
    expect(timeZoneCookieOptions(true).httpOnly).toBe(false);
  });

  it("carries secure only where the request did", () => {
    expect(timeZoneCookieOptions(true).secure).toBe(true);
    expect(timeZoneCookieOptions(false).secure).toBe(false);
  });
});
