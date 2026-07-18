import * as ticketService from "../services/ticket-service.js";
import { toPublicTicket } from "../utils/presenters.js";

/** GET /api/tickets/mine — the current user's tickets, across all their orders. */
export const listMine = async (request, response) => {
  const tickets = await ticketService.listMyTickets(request.user.sub);
  response.status(200).json({ data: tickets.map(toPublicTicket) });
};

/** GET /api/orders/:orderId/tickets */
export const listForOrder = async (request, response) => {
  const tickets = await ticketService.listForOrder(request.params.orderId, request.user);
  response.status(200).json({ data: tickets.map(toPublicTicket) });
};

/** POST /api/check-ins/scan — gate staff scans a buyer's QR. */
export const scan = async (request, response) => {
  const { result, ticket } = await ticketService.scanTicket(request.user, request.body);
  response.status(200).json({ data: { result, ticket: ticket ? toPublicTicket(ticket) : null } });
};
