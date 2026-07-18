import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { forbidden, unauthorized } from "../utils/http-error.js";

/**
 * Reads and verifies the `Authorization: Bearer <jwt>` header, returning its
 * decoded payload, or `null` if the header is absent.
 * @param {import("express").Request} request
 * @returns {{ sub: string, role: "user" | "admin" | "super_admin", email: string } | null}
 * @throws {import("../utils/http-error.js").HttpError} 401 if a token is present but invalid/expired.
 */
const readBearerToken = (request) => {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length);
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw unauthorized("INVALID_TOKEN", "Session token is invalid or expired");
  }
};

/** Attaches `request.user` when a valid session token is present; otherwise leaves it `null`. Never rejects. */
export const optionalAuth = (request, response, next) => {
  request.user = readBearerToken(request);
  next();
};

/** Requires a valid session token; otherwise responds 401. */
export const requireAuth = (request, response, next) => {
  const user = readBearerToken(request);
  if (!user) {
    next(unauthorized("AUTHENTICATION_REQUIRED", "Sign in required"));
    return;
  }
  request.user = user;
  next();
};

/**
 * Requires `requireAuth` to have run first, then restricts to the given roles.
 * @param {...("user" | "admin" | "super_admin")} roles
 */
export const requireRole =
  (...roles) =>
  (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      next(forbidden("FORBIDDEN", `Requires one of roles: ${roles.join(", ")}`));
      return;
    }
    next();
  };
