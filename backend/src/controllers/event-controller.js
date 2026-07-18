import * as eventService from "../services/event-service.js";
import { toPublicEvent } from "../utils/presenters.js";

/** Maps the validated `{ category, city, search, status, page, pageSize }` query to repository filter names. */
const toEventFilters = ({ category, ...rest }) => ({ ...rest, categorySlug: category });

/** GET /api/events — public catalog (published + visible only). */
export const listPublic = async (request, response) => {
  const result = await eventService.listPublicEvents(toEventFilters(request.query));
  response.status(200).json({
    data: result.rows.map(toPublicEvent),
    meta: { total: result.total, page: result.page, pageSize: result.pageSize },
  });
};

/** GET /api/events/mine — the current admin's own events, any status. */
export const listMine = async (request, response) => {
  const result = await eventService.listMyEvents(request.user.sub, toEventFilters(request.query));
  response.status(200).json({
    data: result.rows.map(toPublicEvent),
    meta: { total: result.total, page: result.page, pageSize: result.pageSize },
  });
};

/** GET /api/events/:slug — public detail, gated by visibility unless the caller owns it. */
export const getBySlug = async (request, response) => {
  const event = await eventService.getEventBySlugForViewer(request.params.slug, request.user ?? null);
  response.status(200).json({ data: toPublicEvent(event) });
};

/** POST /api/events — admin/super_admin. */
export const create = async (request, response) => {
  const event = await eventService.createEvent(request.user.sub, request.body);
  response.status(201).json({ data: toPublicEvent(event) });
};

/** PATCH /api/events/:id */
export const update = async (request, response) => {
  const event = await eventService.updateEvent(request.params.id, request.user, request.body);
  response.status(200).json({ data: toPublicEvent(event) });
};

/** PATCH /api/events/:id/status */
export const changeStatus = async (request, response) => {
  const event = await eventService.changeEventStatus(request.params.id, request.user, request.body.status);
  response.status(200).json({ data: toPublicEvent(event) });
};

/** PATCH /api/events/:id/visibility */
export const setVisibility = async (request, response) => {
  const event = await eventService.setEventVisibility(request.params.id, request.user, request.body.isVisible);
  response.status(200).json({ data: toPublicEvent(event) });
};
