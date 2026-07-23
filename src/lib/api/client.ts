import { cookies, headers as nextHeaders } from "next/headers";
import { env } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";
import { ApiError } from "./errors";
import type { ApiPageMeta } from "./types";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** JSON-serializable request body. Mutually exclusive with `formData`. */
  body?: unknown;
  /** multipart/form-data body (event image / payment proof uploads). */
  formData?: FormData;
  /** Any plain query-params object (e.g. a `ListEventsQuery`) — values are stringified, `undefined`/`null` are skipped. */
  query?: object;
  /**
   * Explicit bearer token override. Normally omitted — the httpOnly session
   * cookie is read automatically. Pass `null` to force an unauthenticated
   * request even if a session cookie is present.
   */
  token?: string | null;
}

const buildUrl = (path: string, query?: object): URL => {
  const url = new URL(path, env.API_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url;
};

/**
 * Low-level request to the SiTIKET backend. Reads the httpOnly session
 * cookie automatically — server-only, call this from Server Components,
 * Server Actions, or Route Handlers, never from a `"use client"` component.
 *
 * Returns the full parsed JSON response body (the backend's
 * `{ data, meta? }` envelope, or `undefined` for a 204). Throws
 * {@link ApiError} for any non-2xx response.
 */
export const apiRequest = async <TResponse = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> => {
  const token = options.token !== undefined ? options.token : ((await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  // Forward the real client IP to the backend. Every backend call is made
  // server-to-server (this Next.js server -> backend at 127.0.0.1), so without
  // this the backend sees the loopback address and its per-IP rate limiters
  // (authLimiter on sign-in, writeLimiter on orders/check-in) would bucket
  // every visitor together. nginx sets X-Real-IP / X-Forwarded-For on the
  // inbound request; we relay that single client IP onward. Wrapped in
  // try/catch because `nextHeaders()` throws outside a request scope (e.g. at
  // build time), where there is no client IP to forward.
  try {
    const incoming = await nextHeaders();
    // Prefer X-Real-IP (nginx sets it to the untrusted $remote_addr, so it is
    // not client-spoofable); fall back to the last X-Forwarded-For entry, which
    // is the address our own nginx appended. Example: "1.2.3.4".
    const forwardedFor = incoming.get("x-forwarded-for");
    const clientIp = incoming.get("x-real-ip") ?? forwardedFor?.split(",").pop()?.trim();
    if (clientIp) {
      headers["X-Forwarded-For"] = clientIp;
      headers["X-Real-IP"] = clientIp;
    }
  } catch {
    // No request scope (build/prerender) — nothing to forward.
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    // Do not set Content-Type manually — fetch derives the multipart boundary itself.
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? (body ? "POST" : "GET"),
    headers,
    body,
    cache: "no-store",
  });

  if (response.status === 204) return undefined as TResponse;

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = json?.error ?? { code: "UNKNOWN_ERROR", message: "Something went wrong. Please try again." };
    throw new ApiError(response.status, errorBody);
  }

  return json as TResponse;
};

/** Fetch and unwrap `{ data: T }` — the common single-resource case. */
export const apiFetch = async <T>(path: string, options?: ApiRequestOptions): Promise<T> => {
  const json = await apiRequest<{ data: T }>(path, options);
  return json.data;
};

/** Fetch and unwrap `{ data: T[], meta }` — every paginated list endpoint. */
export const apiFetchPage = async <T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<{ data: T[]; meta: ApiPageMeta }> => apiRequest<{ data: T[]; meta: ApiPageMeta }>(path, options);
