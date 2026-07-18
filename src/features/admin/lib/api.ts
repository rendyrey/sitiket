import { apiFetch, apiFetchPage } from "@/lib/api/client";
import {
  toBankAccount,
  toEventStaff,
  toOrderPayment,
  toPromoCode,
  toRefundRequest,
  toTicketType,
} from "@/lib/api/normalize";
import type {
  ApiPageMeta,
  BankAccount,
  Event,
  EventStaff,
  ListEventsQuery,
  Order,
  OrderPayment,
  PromoCode,
  RawBankAccount,
  RawEventStaffWithUser,
  RawOrderPayment,
  RawPromoCode,
  RawRefundRequest,
  RawRefundRequestWithOrderContext,
  RawTicketType,
  RefundRequest,
  TicketType,
} from "@/lib/api/types";

// ---- Events (owner-scoped) ----

/** Server-only. The signed-in admin's own events, any status. */
export const listMyEvents = async (query?: ListEventsQuery): Promise<{ events: Event[]; meta: ApiPageMeta }> => {
  const { data, meta } = await apiFetchPage<Event>("/api/events/mine", { query });
  return { events: data, meta };
};

// ---- Ticket types ----

/** Server-only. Every ticket type for an event, including inactive ones (owner view). */
export const listAllTicketTypes = async (eventId: string): Promise<TicketType[]> => {
  const raw = await apiFetch<RawTicketType[]>(`/api/events/${eventId}/ticket-types/mine`);
  return raw.map(toTicketType);
};

// ---- Promo codes ----

export const listPromoCodes = async (eventId: string): Promise<PromoCode[]> => {
  const raw = await apiFetch<RawPromoCode[]>(`/api/events/${eventId}/promo-codes`);
  return raw.map(toPromoCode);
};

// ---- Event staff (gate scanners) ----

export const listEventStaff = async (eventId: string): Promise<EventStaff[]> => {
  const raw = await apiFetch<RawEventStaffWithUser[]>(`/api/events/${eventId}/staff`);
  return raw.map(toEventStaff);
};

// ---- Bank accounts ----

export const listBankAccounts = async (): Promise<BankAccount[]> => {
  const raw = await apiFetch<RawBankAccount[]>("/api/bank-accounts");
  return raw.map(toBankAccount);
};

// ---- Orders / payments / refunds for an event ----

/** Server-only. Buyers for one event — no `items`/`tickets` embedded (see BACKEND.md). */
export const listEventOrders = (eventId: string): Promise<Order[]> => apiFetch<Order[]>(`/api/events/${eventId}/orders`);

export const listOrderPayments = async (orderId: string): Promise<OrderPayment[]> => {
  const raw = await apiFetch<RawOrderPayment[]>(`/api/orders/${orderId}/payments`);
  return raw.map(toOrderPayment);
};

export const listOrderRefundRequests = async (orderId: string): Promise<RefundRequest[]> => {
  const raw = await apiFetch<RawRefundRequest[]>(`/api/orders/${orderId}/refund-requests`);
  return raw.map(toRefundRequest);
};

/** Server-only. Refund requests across every event this admin owns. */
export const listMyRefundRequests = async (): Promise<RefundRequest[]> => {
  const raw = await apiFetch<RawRefundRequestWithOrderContext[]>("/api/refund-requests/mine");
  return raw.map(toRefundRequest);
};
