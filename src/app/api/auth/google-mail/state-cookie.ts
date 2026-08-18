/**
 * CSRF state cookie for the "Connect Gmail" OAuth round-trip — set by the
 * start route, checked and cleared by the callback route. Lives in its own
 * module because Next.js route files may only export route handlers.
 */
export const GMAIL_OAUTH_STATE_COOKIE = "sitiket_gmail_oauth_state";
