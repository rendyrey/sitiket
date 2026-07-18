import * as orderPaymentService from "../services/order-payment-service.js";
import { badRequest } from "../utils/http-error.js";

/** POST /api/orders/:orderId/payments — multipart upload, field name "proof". */
export const submit = async (request, response) => {
  if (!request.file) throw badRequest("PROOF_IMAGE_REQUIRED", 'A file is required in the "proof" field');

  const identity = request.user ? { userId: request.user.sub } : { guestEmail: request.body.guestEmail };
  const payment = await orderPaymentService.submitProof(request.params.orderId, identity, {
    file: request.file,
    transferNote: request.body.transferNote,
  });
  response.status(201).json({ data: payment });
};

/** GET /api/orders/:orderId/payments/instructions — where + how much to transfer. */
export const getInstructions = async (request, response) => {
  const identity = request.user ? { userId: request.user.sub } : { guestEmail: request.query.guestEmail };
  const instructions = await orderPaymentService.getPaymentInstructions(request.params.orderId, identity);
  response.status(200).json({ data: instructions });
};

/** GET /api/orders/:orderId/payments */
export const list = async (request, response) => {
  const payments = await orderPaymentService.listForOrder(request.params.orderId, request.user);
  response.status(200).json({ data: payments });
};

/** POST /api/order-payments/:id/approve */
export const approve = async (request, response) => {
  const payment = await orderPaymentService.reviewProof(request.params.id, request.user, "approved", request.body.reviewerNotes);
  response.status(200).json({ data: payment });
};

/** POST /api/order-payments/:id/reject */
export const reject = async (request, response) => {
  const payment = await orderPaymentService.reviewProof(request.params.id, request.user, "rejected", request.body.reviewerNotes);
  response.status(200).json({ data: payment });
};
