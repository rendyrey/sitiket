import * as usersRepository from "../repositories/users-repository.js";
import { toPublicUser } from "../utils/presenters.js";
import { notFound } from "../utils/http-error.js";

/** GET /api/users — super_admin only; lists buyers and admins across the platform. */
export const list = async (request, response) => {
  const result = await usersRepository.list(request.query);
  response.status(200).json({
    data: result.rows.map(toPublicUser),
    meta: { total: result.total, page: result.page, pageSize: result.pageSize },
  });
};

/** PATCH /api/users/:id/status — super_admin only; suspend or reactivate an account. */
export const updateStatus = async (request, response) => {
  const user = await usersRepository.findById(request.params.id);
  if (!user) throw notFound("USER_NOT_FOUND", "User not found");

  await usersRepository.updateStatus(request.params.id, request.body.status);
  response.status(200).json({ data: toPublicUser(await usersRepository.findById(request.params.id)) });
};
