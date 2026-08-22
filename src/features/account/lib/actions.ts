"use server";

import { apiFetch } from "@/lib/api/client";
import { toActionResult } from "@/lib/api/action-result";
import { toAdminApplication, toEventStaff, toStaffInvitation } from "@/lib/api/normalize";
import type { ApplyAdminRequest, RawAdminApplication, RawEventStaff, RawStaffInvitation, UpdateProfileRequest, User } from "@/lib/api/types";

/**
 * Submits an Admin (event owner) application for the current user — requires
 * Super Admin approval, see docs/business/SYSTEM_OVERVIEW.md §3. There is no
 * endpoint to re-fetch "my application status" later (only super_admin can
 * list applications) — the confirmation shown right after submitting is the
 * only status the frontend can currently surface.
 */
export async function applyAdminAction(input: ApplyAdminRequest) {
  return toActionResult(() => apiFetch<RawAdminApplication>("/api/admin-applications", { method: "POST", body: input }), toAdminApplication);
}

/**
 * Updates the signed-in user's contact + delivery address. The address is a
 * prerequisite for merch checkout — it becomes each merch order's shipping
 * snapshot.
 */
export async function updateProfileAction(input: UpdateProfileRequest) {
  return toActionResult(() => apiFetch<User>("/api/auth/me", { method: "PATCH", body: input }));
}

/** The signed-in user's own gate-staff invitations (any status), newest first. */
export async function listMyStaffInvitationsAction() {
  return toActionResult(
    () => apiFetch<RawStaffInvitation[]>("/api/staff-invitations"),
    (rows) => rows.map(toStaffInvitation),
  );
}

/** Accepts or declines one pending gate-staff invitation. */
export async function respondStaffInvitationAction(staffId: string, decision: "accept" | "decline") {
  return toActionResult(() => apiFetch<RawEventStaff>(`/api/staff-invitations/${staffId}/respond`, { method: "POST", body: { decision } }), toEventStaff);
}
