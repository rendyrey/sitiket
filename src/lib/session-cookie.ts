/**
 * Name of the httpOnly cookie holding the SiTIKET backend session JWT.
 * Kept in its own module (no logic) so both `lib/api/client.ts` and
 * `lib/session.ts` can import it without a circular dependency between them.
 */
export const SESSION_COOKIE_NAME = "sitiket_session";

/** Matches the backend's default `JWT_EXPIRES_IN` (`"7d"`) — see backend/.env.example. */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
