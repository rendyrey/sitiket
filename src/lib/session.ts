import { cache } from "react";
import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";
import type { User } from "@/lib/api/types";

/** Server-only. Returns the raw session JWT string, or `null` if not signed in. */
export const getSessionToken = async (): Promise<string | null> => (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;

/**
 * Server-only. Resolves the signed-in user's fresh profile from the backend
 * (`GET /api/auth/me`), or `null` for a guest. Wrapped in React's `cache()`
 * so multiple Server Components calling this within the same request
 * dedupe into a single backend round-trip.
 *
 * Deliberately re-fetches rather than decoding the JWT client-side: the
 * token's `role` claim is stale-by-design after a role change (see
 * BACKEND.md § Known gaps) — this always reflects the account's current
 * role/status.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    return await apiFetch<User>("/api/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

/** Server-only. Throws-free convenience for pages that just need a role check. */
export const requireRole = async (...roles: User["role"][]): Promise<User | null> => {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role)) return null;
  return user;
};
