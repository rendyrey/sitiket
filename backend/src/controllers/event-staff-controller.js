import * as eventStaffService from "../services/event-staff-service.js";

/** GET /api/events/:eventId/staff */
export const list = async (request, response) => {
  const staff = await eventStaffService.list(request.params.eventId, request.user);
  response.status(200).json({ data: staff });
};

/** POST /api/events/:eventId/staff */
export const invite = async (request, response) => {
  const staff = await eventStaffService.invite(request.params.eventId, request.user, request.body.email);
  response.status(201).json({ data: staff });
};

/** DELETE /api/events/:eventId/staff/:staffId */
export const remove = async (request, response) => {
  await eventStaffService.remove(request.params.eventId, request.user, request.params.staffId);
  response.status(204).send();
};

/** GET /api/staff-invitations — the caller's own gate-staff invitations. */
export const listMine = async (request, response) => {
  const invitations = await eventStaffService.listMine(request.user.sub);
  response.status(200).json({ data: invitations });
};

/** POST /api/staff-invitations/:staffId/respond — accept or decline. */
export const respond = async (request, response) => {
  const staff = await eventStaffService.respond(request.params.staffId, request.user, request.body.decision);
  response.status(200).json({ data: staff });
};
