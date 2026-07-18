import * as authService from "../services/auth-service.js";
import * as usersRepository from "../repositories/users-repository.js";
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
