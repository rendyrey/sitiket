"use server";

import { apiFetch } from "@/lib/api/client";
import { toActionResult } from "@/lib/api/action-result";
import {
  toBankAccount,
  toEventImage,
  toEventStaff,
  toMerchOrderPayment,
  toOrderPayment,
  toOrganizerEmailConfig,
  toProduct,
  toProductImage,
  toPromoCode,
  toQrisConfig,
  toRefundRequest,
  toTicketType,
} from "@/lib/api/normalize";
import {
  listEventOrders,
  listMerchOrderPayments,
  listOrderPayments,
  listOrderRefundRequests,
  listSellingMerchOrders,
} from "@/features/admin/lib/api";
import type {
  CreateBankAccountRequest,
  CreateEventRequest,
  CreateProductRequest,
  CreatePromoCodeRequest,
  CreateTicketTypeRequest,
  Event,
  EventStatus,
  InviteEventStaffRequest,
  ListEventOrdersQuery,
  ListSellingMerchOrdersQuery,
  RawBankAccount,
  RawEventImage,
  RawEventStaff,
  RawMerchOrderPayment,
  RawOrderPayment,
  RawOrganizerEmailConfig,
  RawProduct,
  RawProductImage,
  RawPromoCode,
  RawQrisConfig,
  RawRefundRequest,
  RawTicketType,
  ReplaceVariantsRequest,
  SaveEmailConfigRequest,
  Ticket,
  UpdateBankAccountRequest,
  UpdateEventRequest,
  UpdateProductRequest,
  UpdatePromoCodeRequest,
  UpdateTicketTypeRequest,
} from "@/lib/api/types";

// ---- Events ----

export async function createEventAction(input: CreateEventRequest) {
  return toActionResult(() => apiFetch<Event>("/api/events", { method: "POST", body: input }));
}

export async function updateEventAction(eventId: string, input: UpdateEventRequest) {
  return toActionResult(() => apiFetch<Event>(`/api/events/${eventId}`, { method: "PATCH", body: input }));
}

export async function changeEventStatusAction(eventId: string, status: EventStatus) {
  return toActionResult(() => apiFetch<Event>(`/api/events/${eventId}/status`, { method: "PATCH", body: { status } }));
}

export async function setEventVisibilityAction(eventId: string, isVisible: boolean) {
  return toActionResult(() => apiFetch<Event>(`/api/events/${eventId}/visibility`, { method: "PATCH", body: { isVisible } }));
}

// ---- Ticket types ----

export async function createTicketTypeAction(eventId: string, input: CreateTicketTypeRequest) {
  return toActionResult(() => apiFetch<RawTicketType>(`/api/events/${eventId}/ticket-types`, { method: "POST", body: input }), toTicketType);
}

export async function updateTicketTypeAction(eventId: string, ticketTypeId: string, input: UpdateTicketTypeRequest) {
  return toActionResult(
    () => apiFetch<RawTicketType>(`/api/events/${eventId}/ticket-types/${ticketTypeId}`, { method: "PATCH", body: input }),
    toTicketType,
  );
}

// ---- Promo codes ----

export async function createPromoCodeAction(eventId: string, input: CreatePromoCodeRequest) {
  return toActionResult(() => apiFetch<RawPromoCode>(`/api/events/${eventId}/promo-codes`, { method: "POST", body: input }), toPromoCode);
}

export async function updatePromoCodeAction(eventId: string, promoCodeId: string, input: UpdatePromoCodeRequest) {
  return toActionResult(
    () => apiFetch<RawPromoCode>(`/api/events/${eventId}/promo-codes/${promoCodeId}`, { method: "PATCH", body: input }),
    toPromoCode,
  );
}

// ---- Event images ----

/** `formData` must contain an `image` file field, plus `isPoster` (`"true"`/`"false"`) if applicable. */
export async function uploadEventImageAction(eventId: string, formData: FormData) {
  return toActionResult(() => apiFetch<RawEventImage>(`/api/events/${eventId}/images`, { method: "POST", formData }), toEventImage);
}

export async function removeEventImageAction(eventId: string, imageId: string) {
  return toActionResult(() => apiFetch<void>(`/api/events/${eventId}/images/${imageId}`, { method: "DELETE" }));
}

// ---- Event staff (gate scanners) ----

export async function inviteEventStaffAction(eventId: string, input: InviteEventStaffRequest) {
  return toActionResult(() => apiFetch<RawEventStaff>(`/api/events/${eventId}/staff`, { method: "POST", body: input }), toEventStaff);
}

export async function removeEventStaffAction(eventId: string, staffId: string) {
  return toActionResult(() => apiFetch<void>(`/api/events/${eventId}/staff/${staffId}`, { method: "DELETE" }));
}

// ---- Bank accounts ----

export async function createBankAccountAction(input: CreateBankAccountRequest) {
  return toActionResult(() => apiFetch<RawBankAccount>("/api/bank-accounts", { method: "POST", body: input }), toBankAccount);
}

export async function updateBankAccountAction(bankAccountId: string, input: UpdateBankAccountRequest) {
  return toActionResult(() => apiFetch<RawBankAccount>(`/api/bank-accounts/${bankAccountId}`, { method: "PATCH", body: input }), toBankAccount);
}

// ---- QRIS config ----

/** `formData` must contain `merchantName`, plus a `qrisImage` file field (optional when only renaming). */
export async function saveQrisConfigAction(formData: FormData) {
  return toActionResult(() => apiFetch<RawQrisConfig>("/api/qris-config", { method: "PUT", formData }), toQrisConfig);
}

export async function removeQrisConfigAction() {
  return toActionResult(() => apiFetch<{ removed: boolean }>("/api/qris-config", { method: "DELETE" }));
}

// ---- Organizer email config ----

/** The backend live-verifies the SMTP credentials before saving — a slow round-trip is expected. */
export async function saveEmailConfigAction(input: SaveEmailConfigRequest) {
  return toActionResult(
    () => apiFetch<RawOrganizerEmailConfig>("/api/email-config", { method: "PUT", body: input }),
    toOrganizerEmailConfig,
  );
}

// ---- Payment review ----

export async function approvePaymentAction(paymentId: string, reviewerNotes?: string) {
  return toActionResult(
    () => apiFetch<RawOrderPayment>(`/api/order-payments/${paymentId}/approve`, { method: "POST", body: { reviewerNotes } }),
    toOrderPayment,
  );
}

export async function rejectPaymentAction(paymentId: string, reviewerNotes?: string) {
  return toActionResult(
    () => apiFetch<RawOrderPayment>(`/api/order-payments/${paymentId}/reject`, { method: "POST", body: { reviewerNotes } }),
    toOrderPayment,
  );
}

// ---- Refund review ----

export async function approveRefundAction(refundRequestId: string, notes?: string) {
  return toActionResult(
    () => apiFetch<RawRefundRequest>(`/api/refund-requests/${refundRequestId}/approve`, { method: "POST", body: { notes } }),
    toRefundRequest,
  );
}

export async function rejectRefundAction(refundRequestId: string, notes?: string) {
  return toActionResult(
    () => apiFetch<RawRefundRequest>(`/api/refund-requests/${refundRequestId}/reject`, { method: "POST", body: { notes } }),
    toRefundRequest,
  );
}

export async function completeRefundAction(refundRequestId: string, notes?: string) {
  return toActionResult(
    () => apiFetch<RawRefundRequest>(`/api/refund-requests/${refundRequestId}/complete`, { method: "POST", body: { notes } }),
    toRefundRequest,
  );
}

// ---- Orders (admin orders table) ----

/** Called directly from the client on every search/filter/sort/page change — keeps the orders table AJAX-driven. */
export async function listEventOrdersAction(eventId: string, query?: ListEventOrdersQuery) {
  return toActionResult(() => listEventOrders(eventId, query));
}

/** Permanently deletes a tier — the backend refuses (409) once any order references it. */
export async function deleteTicketTypeAction(eventId: string, ticketTypeId: string) {
  return toActionResult(() => apiFetch<void>(`/api/events/${eventId}/ticket-types/${ticketTypeId}`, { method: "DELETE" }));
}

/** The issued tickets (with QR payloads) of one order — organizer/super_admin only, fetched on expand. */
export async function getOrderTicketsAction(orderId: string) {
  return toActionResult(() => apiFetch<Ticket[]>(`/api/orders/${orderId}/tickets`));
}

/** Re-sends the buyer's ticket email for a paid order — the fix when the original never arrived. */
export async function resendOrderTicketsAction(orderId: string) {
  return toActionResult(() => apiFetch<{ sentTo: string; ticketCount: number }>(`/api/orders/${orderId}/tickets/resend`, { method: "POST" }));
}

/** Lazily fetched only when a row is expanded — payment proofs + refund requests for one order. */
export async function getOrderReviewAction(orderId: string) {
  return toActionResult(() =>
    Promise.all([listOrderPayments(orderId), listOrderRefundRequests(orderId)]).then(([payments, refundRequests]) => ({
      payments,
      refundRequests,
    })),
  );
}

// ---- Merch products ----

export async function createProductAction(input: CreateProductRequest) {
  return toActionResult(() => apiFetch<RawProduct>("/api/products", { method: "POST", body: input }), toProduct);
}

export async function updateProductAction(productId: string, input: UpdateProductRequest) {
  return toActionResult(() => apiFetch<RawProduct>(`/api/products/${productId}`, { method: "PATCH", body: input }), toProduct);
}

/** Enable/disable in the public catalog — data and order history stay intact. */
export async function setProductActiveAction(productId: string, isActive: boolean) {
  return toActionResult(
    () => apiFetch<RawProduct>(`/api/products/${productId}/status`, { method: "PATCH", body: { isActive } }),
    toProduct,
  );
}

/** Soft delete — past merch orders keep referencing the product. */
export async function deleteProductAction(productId: string) {
  return toActionResult(() => apiFetch<void>(`/api/products/${productId}`, { method: "DELETE" }));
}

/** Replaces the WHOLE option/variant matrix atomically. */
export async function replaceProductVariantsAction(productId: string, input: ReplaceVariantsRequest) {
  return toActionResult(() => apiFetch<unknown>(`/api/products/${productId}/variants`, { method: "PUT", body: input }));
}

/** `formData` must contain an `image` file field. Max 10 photos per product (backend-enforced). */
export async function uploadProductImageAction(productId: string, formData: FormData) {
  return toActionResult(() => apiFetch<RawProductImage>(`/api/products/${productId}/images`, { method: "POST", formData }), toProductImage);
}

export async function removeProductImageAction(productId: string, imageId: string) {
  return toActionResult(() => apiFetch<void>(`/api/products/${productId}/images/${imageId}`, { method: "DELETE" }));
}

// ---- Merch orders (seller review) ----

/** Called directly from the client on every search/filter/sort/page change — keeps the merch orders table AJAX-driven. */
export async function listSellingMerchOrdersAction(query?: ListSellingMerchOrdersQuery) {
  return toActionResult(() => listSellingMerchOrders(query));
}

/** Lazily fetched only when a row is expanded — payment proofs for one merch order. */
export async function getMerchOrderPaymentsAction(merchOrderId: string) {
  return toActionResult(() => listMerchOrderPayments(merchOrderId));
}

export async function approveMerchPaymentAction(paymentId: string, reviewerNotes?: string) {
  return toActionResult(
    () => apiFetch<RawMerchOrderPayment>(`/api/merch-order-payments/${paymentId}/approve`, { method: "POST", body: { reviewerNotes } }),
    toMerchOrderPayment,
  );
}

export async function rejectMerchPaymentAction(paymentId: string, reviewerNotes?: string) {
  return toActionResult(
    () => apiFetch<RawMerchOrderPayment>(`/api/merch-order-payments/${paymentId}/reject`, { method: "POST", body: { reviewerNotes } }),
    toMerchOrderPayment,
  );
}
