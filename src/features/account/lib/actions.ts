"use server";

import { apiFetch } from "@/lib/api/client";
import { toActionResult } from "@/lib/api/action-result";
import { toAdminApplication } from "@/lib/api/normalize";
import type { ApplyAdminRequest, RawAdminApplication } from "@/lib/api/types";

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
