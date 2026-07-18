import { apiFetch, apiFetchPage } from "@/lib/api/client";
import { toAdminApplication, toTaxonomyItem } from "@/lib/api/normalize";
import type {
  AdminApplication,
  AdminApplicationStatus,
  ListUsersQuery,
  RawAdminApplication,
  RawTaxonomy,
  TaxonomyItem,
  User,
} from "@/lib/api/types";

export const listAdminApplications = async (status?: AdminApplicationStatus): Promise<AdminApplication[]> => {
  const { data } = await apiFetchPage<RawAdminApplication>("/api/admin-applications", { query: status ? { status } : undefined });
  return data.map(toAdminApplication);
};

export const listUsers = async (query?: ListUsersQuery): Promise<{ users: User[]; total: number }> => {
  const { data, meta } = await apiFetchPage<User>("/api/users", { query: { pageSize: 100, ...query } });
  return { users: data, total: meta.total };
};

/** `includeInactive` only takes effect for a super_admin caller — matches the backend's own rule. */
export const listEventCategoriesAll = async (): Promise<TaxonomyItem[]> => {
  const raw = await apiFetch<RawTaxonomy[]>("/api/event-categories", { query: { includeInactive: true } });
  return raw.map(toTaxonomyItem);
};

export const listTicketCategoriesAll = async (): Promise<TaxonomyItem[]> => {
  const raw = await apiFetch<RawTaxonomy[]>("/api/ticket-categories", { query: { includeInactive: true } });
  return raw.map(toTaxonomyItem);
};
