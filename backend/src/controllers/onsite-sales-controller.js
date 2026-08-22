import * as onsiteSalesService from "../services/onsite-sales-service.js";

/** camelCase presenter for an `onsite_ticket_sales` row (with joined names). */
const toPublicOnsiteSale = (sale) => ({
  id: sale.id,
  eventId: sale.event_id,
  ticketTypeId: sale.ticket_type_id,
  ticketTypeName: sale.ticket_type_name ?? null,
  quantity: sale.quantity,
  unitPrice: sale.unit_price,
  note: sale.note,
  recordedBy: sale.recorded_by,
  recordedByName: sale.recorded_by_name ?? null,
  createdAt: sale.created_at,
});

/** GET /api/events/:eventId/onsite-sales */
export const list = async (request, response) => {
  const sales = await onsiteSalesService.list(request.params.eventId, request.user);
  response.status(200).json({ data: sales.map(toPublicOnsiteSale) });
};

/** POST /api/events/:eventId/onsite-sales */
export const record = async (request, response) => {
  const sale = await onsiteSalesService.record(request.params.eventId, request.user, request.body);
  response.status(201).json({ data: toPublicOnsiteSale(sale) });
};

/** DELETE /api/events/:eventId/onsite-sales/:saleId */
export const remove = async (request, response) => {
  await onsiteSalesService.remove(request.params.eventId, request.user, request.params.saleId);
  response.status(204).send();
};
