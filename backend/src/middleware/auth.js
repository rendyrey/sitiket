import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import * as usersRepository from "../repositories/users-repository.js";
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
 * The role is re-read from the DB, not trusted from the JWT: the token's
 * `role` claim is frozen at sign-in, so a freshly promoted admin (or a
 * demoted one) would otherwise be judged by their old role until re-login.
 * `request.user.role` is refreshed so downstream ownership checks agree.
 * @param {...("user" | "admin" | "super_admin")} roles
 */
export const requireRole =
  (...roles) =>
  async (request, response, next) => {
    try {
      const user = request.user && (await usersRepository.findById(request.user.sub));
      if (!user || !roles.includes(user.role)) {
        next(forbidden("FORBIDDEN", `Requires one of roles: ${roles.join(", ")}`));
        return;
      }
      request.user.role = user.role;
      next();
    } catch (error) {
      next(error);
    }
  };
