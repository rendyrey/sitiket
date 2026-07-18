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
