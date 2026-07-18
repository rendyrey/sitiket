"use server";

import { apiFetch } from "@/lib/api/client";
import { toActionResult } from "@/lib/api/action-result";
import {
  toBankAccount,
  toEventImage,
  toEventStaff,
  toOrderPayment,
  toPromoCode,
  toRefundRequest,
  toTicketType,
} from "@/lib/api/normalize";
import { listEventOrders, listOrderPayments, listOrderRefundRequests } from "@/features/admin/lib/api";
import type {
  CreateBankAccountRequest,
  CreateEventRequest,
  CreatePromoCodeRequest,
  CreateTicketTypeRequest,
  Event,
  EventStatus,
  InviteEventStaffRequest,
  ListEventOrdersQuery,
  RawBankAccount,
  RawEventImage,
  RawEventStaff,
  RawOrderPayment,
  RawPromoCode,
  RawRefundRequest,
  RawTicketType,
  UpdateBankAccountRequest,
  UpdateEventRequest,
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

/** Lazily fetched only when a row is expanded — payment proofs + refund requests for one order. */
export async function getOrderReviewAction(orderId: string) {
  return toActionResult(() =>
    Promise.all([listOrderPayments(orderId), listOrderRefundRequests(orderId)]).then(([payments, refundRequests]) => ({
      payments,
      refundRequests,
    })),
  );
}
