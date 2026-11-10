import { describe, it, expect } from "vitest";
import { GET as enter } from "./route";
import { GET as exit } from "./exit/route";

describe("GET /demo", () => {
  it("sets a session-lifetime, httpOnly demo cookie and goes to the dashboard", async () => {
    const response = await enter(new Request("http://localhost:3000/demo"));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/dashboard");
    const cookie = response.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^tally_demo=1;/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).not.toMatch(/Max-Age|Expires/i);
    expect(cookie).not.toMatch(/Secure/i);
  });

  it("marks the cookie Secure when the site is served over https", async () => {
    const response = await enter(new Request("https://tally.example/demo"));
    expect(response.headers.get("set-cookie")).toMatch(/Secure/i);
  });
});

describe("GET /demo/exit", () => {
  it("clears the cookie and goes back to the landing page", async () => {
    const response = await exit(new Request("http://localhost:3000/demo/exit"));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/");
    expect(response.headers.get("set-cookie")).toMatch(/^tally_demo=;/);
  });
});
