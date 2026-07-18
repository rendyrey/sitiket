import * as adminApplicationService from "../services/admin-application-service.js";

/** POST /api/admin-applications — the current user applies to become an Admin. */
export const apply = async (request, response) => {
  const application = await adminApplicationService.apply(request.user.sub, request.body);
  response.status(201).json({ data: application });
};

/** GET /api/admin-applications — super_admin only. */
export const list = async (request, response) => {
  const result = await adminApplicationService.list(request.query);
  response.status(200).json({ data: result.rows, meta: { total: result.total, page: result.page, pageSize: result.pageSize } });
};

/** POST /api/admin-applications/:id/approve — super_admin only. */
export const approve = async (request, response) => {
  const application = await adminApplicationService.approve(request.params.id, request.user.sub, request.body.reviewNotes);
  response.status(200).json({ data: application });
};

/** POST /api/admin-applications/:id/reject — super_admin only. */
export const reject = async (request, response) => {
  const application = await adminApplicationService.reject(request.params.id, request.user.sub, request.body.reviewNotes);
  response.status(200).json({ data: application });
};
