import { badRequest } from "../utils/http-error.js";

/**
 * Validates `request[source]` against a Zod schema, replacing it with the
 * parsed (and type-coerced) value on success, or forwarding a 400 with the
 * Zod issues on failure. Used at every route boundary per BACKEND.md's
 * "validate params, queries, bodies" rule.
 *
 * Express 5 makes `request.query` a getter-only accessor (no setter), so it
 * can't be reassigned like `body`/`params` — its own properties are mutated
 * in place instead.
 *
 * @param {import("zod").ZodTypeAny} schema
 * @param {"body" | "query" | "params"} [source="body"]
 */
export const validate = (schema, source = "body") => (request, response, next) => {
  const result = schema.safeParse(request[source]);

  if (!result.success) {
    next(badRequest("VALIDATION_ERROR", "Request validation failed", result.error.issues));
    return;
  }

  if (source === "query") {
    for (const key of Object.keys(request.query)) delete request.query[key];
    Object.assign(request.query, result.data);
  } else {
    request[source] = result.data;
  }
  next();
};
