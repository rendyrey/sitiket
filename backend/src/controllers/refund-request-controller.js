import * as refundRequestService from "../services/refund-request-service.js";

/** POST /api/orders/:orderId/refund-requests */
export const create = async (request, response) => {
  const identity = request.user ? { userId: request.user.sub } : { guestEmail: request.body.guestEmail };
  const refundRequest = await refundRequestService.request(request.params.orderId, identity, request.body.reason);
  response.status(201).json({ data: refundRequest });
};

/** GET /api/orders/:orderId/refund-requests */
export const listForOrder = async (request, response) => {
  const refundRequests = await refundRequestService.listForOrder(request.params.orderId, request.user);
  response.status(200).json({ data: refundRequests });
};

/** GET /api/refund-requests/mine — the current admin's own events' refund requests. */
export const listMine = async (request, response) => {
  const refundRequests = await refundRequestService.listForEventOwner(request.user.sub);
  response.status(200).json({ data: refundRequests });
};

/** POST /api/refund-requests/:id/approve */
export const approve = async (request, response) => {
  const refundRequest = await refundRequestService.approve(request.params.id, request.user, request.body.notes);
  response.status(200).json({ data: refundRequest });
};

/** POST /api/refund-requests/:id/reject */
export const reject = async (request, response) => {
  const refundRequest = await refundRequestService.reject(request.params.id, request.user, request.body.notes);
  response.status(200).json({ data: refundRequest });
};

/** POST /api/refund-requests/:id/complete */
export const complete = async (request, response) => {
  const refundRequest = await refundRequestService.markCompleted(request.params.id, request.user, request.body.notes);
  response.status(200).json({ data: refundRequest });
};
