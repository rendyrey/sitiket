import * as ticketTypeService from "../services/ticket-type-service.js";

/** GET /api/events/:eventId/ticket-types — public, active tiers only. */
export const listPublic = async (request, response) => {
  const ticketTypes = await ticketTypeService.listPublic(request.params.eventId);
  response.status(200).json({ data: ticketTypes });
};

/** GET /api/events/:eventId/ticket-types/mine — owner view, all tiers. */
export const listMine = async (request, response) => {
  const ticketTypes = await ticketTypeService.listForOwner(request.params.eventId, request.user);
  response.status(200).json({ data: ticketTypes });
};

/** POST /api/events/:eventId/ticket-types */
export const create = async (request, response) => {
  const ticketType = await ticketTypeService.create(request.params.eventId, request.user, request.body);
  response.status(201).json({ data: ticketType });
};

/** PATCH /api/events/:eventId/ticket-types/:ticketTypeId */
export const update = async (request, response) => {
  const ticketType = await ticketTypeService.update(
    request.params.eventId,
    request.user,
    request.params.ticketTypeId,
    request.body,
  );
  response.status(200).json({ data: ticketType });
};
