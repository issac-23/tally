/**
 * The viewer's time zone, carried in a cookie.
 *
 * Transactions are stored under the day key the user was on when they logged
 * them. Working out which day "today" is, is the one calculation that needs
 * to know where they are: on a server in UTC, a US evening is already
 * tomorrow, so Today shows nothing and every trailing window is a day out.
 *
 * It is a cookie rather than a column on the profile because a zone belongs
 * to the device, not the account — someone who flies to Tokyo should see
 * Tokyo's today — and because it needs no migration and works for everyone
 * who is already signed in. It is not httpOnly: the browser is the only
 * thing that knows the answer, so client JS has to write it
 * (components/time-zone-sync.tsx).
 *
 * It is not a credential. The worst a forged one can do is show its owner
 * the wrong day's totals.
 */

export const TIME_ZONE_COOKIE = "tally_tz";

/**
 * What a zone falls back to when the cookie is missing, stale or nonsense.
 * UTC is what a server with nothing to go on already used, so a visitor who
 * never gets the cookie set sees exactly what they saw before.
 */
export const FALLBACK_TIME_ZONE = "UTC";

/** A year: long enough to survive a lull, short enough to age out. */
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export function timeZoneCookieOptions(secure: boolean) {
  return {
    // The browser writes this one, so it can't be hidden from scripts.
    httpOnly: false,
    sameSite: "lax" as const,
    path: "/",
    secure,
    maxAge: ONE_YEAR_SECONDS,
  };
}

/**
 * IANA names are letters, digits and `+`, `-`, `_`, `/`. Checked before Intl
 * sees the value so an oversized or odd cookie is cheap to turn away, and so
 * nothing surprising reaches a formatter.
 */
const IANA_NAME = /^[A-Za-z0-9+_/-]{1,64}$/;

/** Whether `Intl` itself will accept this as a zone. */
export function isValidTimeZone(value: string): boolean {
  if (!IANA_NAME.test(value)) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    // RangeError: not a zone this runtime knows.
    return false;
  }
}

/**
 * The zone to read day keys in, from the raw cookie value.
 *
 * Validated here rather than trusted: an unrecognised zone reaching
 * `Intl.DateTimeFormat` throws a RangeError, which would turn a bad cookie
 * into a 500 on the dashboard.
 */
export function readTimeZone(value: string | undefined): string {
  if (value && isValidTimeZone(value)) return value;
  return FALLBACK_TIME_ZONE;
}
