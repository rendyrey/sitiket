import * as merchOrderService from "../services/merch-order-service.js";
import * as merchPaymentService from "../services/merch-payment-service.js";
import { badRequest } from "../utils/http-error.js";

/**
 * POST /api/merch-orders — signed-in checkout. A multi-seller cart returns
 * MULTIPLE orders (one per seller), each with its own payment window.
 */
export const create = async (request, response) => {
  const orders = await merchOrderService.createOrders(request.user, request.body);
  response.status(201).json({ data: orders });
};

/** GET /api/merch-orders/mine — the buyer's purchase history. */
export const listMine = async (request, response) => {
  const orders = await merchOrderService.listMyOrders(request.user.sub);
  response.status(200).json({ data: orders });
};

/** GET /api/merch-orders/selling — the seller's incoming orders (buyer details included). */
export const listSelling = async (request, response) => {
  const { rows, total, page, pageSize } = await merchOrderService.listSellingOrders(request.user.sub, request.query);
  response.status(200).json({ data: rows, meta: { total, page, pageSize } });
};

/** GET /api/merch-orders/:id */
export const getById = async (request, response) => {
  const order = await merchOrderService.getOrderForViewer(request.params.id, request.user);
  response.status(200).json({ data: order });
};

/** POST /api/merch-orders/:id/cancel */
export const cancel = async (request, response) => {
  const order = await merchOrderService.cancelOrder(request.params.id, request.user);
  response.status(200).json({ data: order });
};

/** GET /api/merch-orders/:orderId/payments/instructions — where + how much to transfer. */
export const getInstructions = async (request, response) => {
  const instructions = await merchPaymentService.getPaymentInstructions(request.params.orderId, request.user);
  response.status(200).json({ data: instructions });
};

/** POST /api/merch-orders/:orderId/payments — multipart upload, field name "proof". */
export const submitPayment = async (request, response) => {
  if (!request.file) throw badRequest("PROOF_IMAGE_REQUIRED", 'A file is required in the "proof" field');
  const payment = await merchPaymentService.submitProof(request.params.orderId, request.user, {
    file: request.file,
    transferNote: request.body.transferNote,
    method: request.body.method,
  });
  response.status(201).json({ data: payment });
};

/** GET /api/merch-orders/:orderId/payments */
export const listPayments = async (request, response) => {
  const payments = await merchPaymentService.listForOrder(request.params.orderId, request.user);
  response.status(200).json({ data: payments });
};

/** POST /api/merch-order-payments/:id/approve */
export const approvePayment = async (request, response) => {
  const payment = await merchPaymentService.reviewProof(request.params.id, request.user, "approved", request.body.reviewerNotes);
  response.status(200).json({ data: payment });
};

/** POST /api/merch-order-payments/:id/reject */
export const rejectPayment = async (request, response) => {
  const payment = await merchPaymentService.reviewProof(request.params.id, request.user, "rejected", request.body.reviewerNotes);
  response.status(200).json({ data: payment });
};
