import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import * as usersRepository from "../repositories/users-repository.js";
import { badRequest, unauthorized } from "../utils/http-error.js";

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

/**
 * Verifies a Google Identity Services ID token (obtained client-side) and
 * returns its verified profile claims.
 * @param {string} idToken
 * @returns {Promise<{ sub: string, email: string, email_verified: boolean, name: string, picture?: string }>}
 * @throws {import("../utils/http-error.js").HttpError} 401 if the token is invalid/expired; 500 if Google OAuth isn't configured.
 */
const verifyGoogleIdToken = async (idToken) => {
  if (!googleClient) {
    throw badRequest("GOOGLE_OAUTH_NOT_CONFIGURED", "GOOGLE_CLIENT_ID is not configured on this server");
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  } catch {
    throw unauthorized("INVALID_GOOGLE_TOKEN", "Google sign-in token is invalid or expired");
  }

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw unauthorized("INVALID_GOOGLE_TOKEN", "Google sign-in token did not include an email");
  }

  return payload;
};

/**
 * @param {object} user - a `users` row
 * @returns {string} a signed JWT carrying `{ sub, role, email }`
 */
export const issueSessionToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

/**
 * Verifies a Google ID token, finds-or-creates the matching user (Google
 * emails are pre-verified, so `email_verified_at` is set immediately on
 * first sign-in), and issues a SiTIKET session JWT.
 * @param {string} idToken
 * @returns {Promise<{ token: string, user: object }>}
 */
export const loginWithGoogle = async (idToken) => {
  const profile = await verifyGoogleIdToken(idToken);

  let user = await usersRepository.findByGoogleSub(profile.sub);
  if (!user) {
    user = await usersRepository.create({
      googleSub: profile.sub,
      email: profile.email,
      name: profile.name ?? profile.email,
      avatarUrl: profile.picture,
      emailVerified: Boolean(profile.email_verified),
    });
  }

  return { token: issueSessionToken(user), user };
};
