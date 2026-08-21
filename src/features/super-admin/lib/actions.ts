"use server";

import { apiFetch } from "@/lib/api/client";
import { toActionResult } from "@/lib/api/action-result";
import { toAdminApplication, toTaxonomyItem } from "@/lib/api/normalize";
import type {
  CreateTaxonomyRequest,
  RawAdminApplication,
  RawTaxonomy,
  UpdateTaxonomyRequest,
  User,
} from "@/lib/api/types";

export type TaxonomyResource = "event-categories" | "ticket-categories";

export async function approveAdminApplicationAction(applicationId: string, reviewNotes?: string) {
  return toActionResult(
    () => apiFetch<RawAdminApplication>(`/api/admin-applications/${applicationId}/approve`, { method: "POST", body: { reviewNotes } }),
    toAdminApplication,
  );
}

export async function rejectAdminApplicationAction(applicationId: string, reviewNotes?: string) {
  return toActionResult(
    () => apiFetch<RawAdminApplication>(`/api/admin-applications/${applicationId}/reject`, { method: "POST", body: { reviewNotes } }),
    toAdminApplication,
  );
}

export async function updateUserStatusAction(userId: string, status: User["status"]) {
  return toActionResult(() => apiFetch<User>(`/api/users/${userId}/status`, { method: "PATCH", body: { status } }));
}

export async function createTaxonomyAction(resource: TaxonomyResource, input: CreateTaxonomyRequest) {
  return toActionResult(() => apiFetch<RawTaxonomy>(`/api/${resource}`, { method: "POST", body: input }), toTaxonomyItem);
}

export async function updateTaxonomyAction(resource: TaxonomyResource, id: string, input: UpdateTaxonomyRequest) {
  return toActionResult(() => apiFetch<RawTaxonomy>(`/api/${resource}/${id}`, { method: "PATCH", body: input }), toTaxonomyItem);
}

// ---- Merch categories (same taxonomy shape, plus guarded delete) ----

export async function createMerchCategoryAction(input: CreateTaxonomyRequest) {
  return toActionResult(() => apiFetch<RawTaxonomy>("/api/merch-categories", { method: "POST", body: input }), toTaxonomyItem);
}

export async function updateMerchCategoryAction(id: string, input: UpdateTaxonomyRequest) {
  return toActionResult(() => apiFetch<RawTaxonomy>(`/api/merch-categories/${id}`, { method: "PATCH", body: input }), toTaxonomyItem);
}

/** Fails with `CATEGORY_IN_USE` while any live product still references the category. */
export async function deleteMerchCategoryAction(id: string) {
  return toActionResult(() => apiFetch<void>(`/api/merch-categories/${id}`, { method: "DELETE" }));
}
