"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TIME_ZONE_COOKIE,
  isValidTimeZone,
  timeZoneCookieOptions,
} from "@/lib/utils/time-zone";

/**
 * Tells the server which zone the viewer is in.
 *
 * The browser is the only thing that knows, and a server that guesses gets
 * the wrong day for anyone far enough from it: see lib/utils/time-zone.ts.
 * So this writes it into a cookie the dashboard reads on the next request.
 *
 * It renders nothing, and does nothing at all once the cookie matches, which
 * is every visit after the first. When it does write one, the page beside it
 * was rendered in the fallback zone, so it asks for a re-render rather than
 * leaving the wrong day on screen until the next navigation — and because
 * the cookie now matches, that re-render writes nothing and does not ask
 * again.
 */
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // A browser that can't name its own zone has nothing useful to send.
    if (!zone || !isValidTimeZone(zone)) return;

    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TIME_ZONE_COOKIE}=`))
      ?.slice(TIME_ZONE_COOKIE.length + 1);
    if (current === zone) return;

    const options = timeZoneCookieOptions(window.location.protocol === "https:");
    // Written raw rather than encoded: IANA names are already made of
    // cookie-safe characters, and encoding here would need decoding there.
    document.cookie = [
      `${TIME_ZONE_COOKIE}=${zone}`,
      `path=${options.path}`,
      `max-age=${options.maxAge}`,
      `samesite=${options.sameSite}`,
      ...(options.secure ? ["secure"] : []),
    ].join("; ");

    router.refresh();
  }, [router]);

  return null;
}
