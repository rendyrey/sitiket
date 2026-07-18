/**
 * Thrown by services/controllers to produce a specific HTTP status + a
 * `{ error: { code, message, details } }` response body via
 * middleware/error-handler.js, instead of falling through to a generic 500.
 */
export class HttpError extends Error {
  /**
   * @param {number} statusCode - HTTP status to respond with. Example: `404`
   * @param {string} code - Stable machine-readable error code. Example: `"EVENT_NOT_FOUND"`
   * @param {string} message - Human-readable message safe to show to a client.
   * @param {unknown} [details] - Optional structured detail (e.g. Zod issues).
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (code, message) => new HttpError(404, code, message);
export const badRequest = (code, message, details) => new HttpError(400, code, message, details);
export const unauthorized = (code, message) => new HttpError(401, code, message);
export const forbidden = (code, message) => new HttpError(403, code, message);
export const conflict = (code, message) => new HttpError(409, code, message);
export const notImplemented = (code, message) => new HttpError(501, code, message);
