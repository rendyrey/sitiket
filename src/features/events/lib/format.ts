const JAKARTA_TIME_ZONE = "Asia/Jakarta";

/** Formats an ISO datetime as `"20 Jun 2026"` in the Jakarta timezone. */
export const formatEventDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: JAKARTA_TIME_ZONE }).format(
    new Date(iso),
  );

/** Formats an ISO datetime as `"16:00 WIB"` in the Jakarta timezone. */
export const formatEventTime = (iso: string): string =>
  `${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: JAKARTA_TIME_ZONE }).format(new Date(iso))} WIB`;
