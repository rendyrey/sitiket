import * as bankAccountService from "../services/bank-account-service.js";

/** GET /api/bank-accounts — the current admin's own payout accounts. */
export const list = async (request, response) => {
  const accounts = await bankAccountService.list(request.user.sub);
  response.status(200).json({ data: accounts });
};

/** POST /api/bank-accounts */
export const create = async (request, response) => {
  const account = await bankAccountService.create(request.user.sub, request.body);
  response.status(201).json({ data: account });
};

/** PATCH /api/bank-accounts/:id */
export const update = async (request, response) => {
  const account = await bankAccountService.update(request.params.id, request.user, request.body);
  response.status(200).json({ data: account });
};
