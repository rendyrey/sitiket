import * as authService from "../services/auth-service.js";
import * as usersRepository from "../repositories/users-repository.js";
import { buildAddressFields } from "../services/regional-service.js";
import { toPublicUser } from "../utils/presenters.js";

/** POST /api/auth/google — verifies a Google ID token, upserts the user, issues a session JWT. */
export const googleLogin = async (request, response) => {
  const { token, user } = await authService.loginWithGoogle(request.body.idToken);
  response.status(200).json({ data: { token, user: toPublicUser(user) } });
};

/** GET /api/auth/me — the authenticated caller's own profile. */
export const me = async (request, response) => {
  const user = await usersRepository.findById(request.user.sub);
  response.status(200).json({ data: toPublicUser(user) });
};

/** PATCH /api/auth/me — self-service contact + delivery-address update (merch checkout prerequisite). */
export const updateMe = async (request, response) => {
  const { villageCode, postalCode, ...patch } = request.body;
  if (villageCode) {
    // The region hierarchy is resolved server-side from the chosen village —
    // names/codes are never free-typed (see services/regional-service.js).
    Object.assign(patch, await buildAddressFields(villageCode, postalCode));
  } else if (postalCode !== undefined) {
    patch.postalCode = postalCode;
  }
  const user = await usersRepository.updateProfile(request.user.sub, patch);
  response.status(200).json({ data: toPublicUser(user) });
};
