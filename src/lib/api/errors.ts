import type { ApiErrorBody } from "./types";

/**
 * Thrown by `apiFetch`/`apiRequest` for any non-2xx backend response.
 * `code` is the backend's stable machine-readable code (e.g.
 * `"EVENT_NOT_FOUND"`, `"VALIDATION_ERROR"`) — safe to switch on for
 * targeted error UI; `message` is safe to show directly to a user.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}
