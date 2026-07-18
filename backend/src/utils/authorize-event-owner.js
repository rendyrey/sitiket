import { forbidden } from "./http-error.js";

/**
 * Shared authorization check reused by every event-scoped service (images,
 * ticket types, promo codes, staff, payment review, check-in): only the
 * event's owner or a super_admin may act on it.
 * @param {{ owner_id: string }} event
 * @param {{ sub: string, role: string }} requester - `request.user` from the auth middleware
 * @throws {import("./http-error.js").HttpError} 403 if neither condition holds
 */
export const assertEventOwnerOrSuperAdmin = (event, requester) => {
  if (requester.role === "super_admin") return;
  if (event.owner_id === requester.sub) return;
  throw forbidden("NOT_EVENT_OWNER", "Only the event owner or a super_admin can perform this action");
};
