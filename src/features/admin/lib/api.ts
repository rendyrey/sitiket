import { apiFetch, apiFetchPage } from "@/lib/api/client";
import {
  toBankAccount,
  toEventStaff,
  toMerchOrder,
  toMerchOrderPayment,
  toMerchPromoCode,
  toOrderPayment,
  toOrganizerEmailConfig,
  toProduct,
  toProductDetail,
  toPromoCode,
  toQrisConfig,
  toRefundRequest,
  toTicketType,
} from "@/lib/api/normalize";
import type {
  ApiPageMeta,
  BankAccount,
  Event,
  EventAttendanceReport,
  EventStaff,
  ExportOrdersQuery,
  ListEventOrdersQuery,
  ListEventsQuery,
  ListSellingMerchOrdersQuery,
  MerchOrder,
  MerchOrderPayment,
  MerchPromoCode,
  Order,
  OrderPayment,
  OrganizerEmailConfig,
  Product,
  ProductDetail,
  PromoCode,
  QrisConfig,
  RawBankAccount,
  RawEventStaffWithUser,
  RawMerchOrder,
  RawMerchOrderPayment,
  RawMerchPromoCode,
  RawOrderPayment,
  RawOrganizerEmailConfig,
  RawProduct,
  RawProductDetail,
  RawPromoCode,
  RawQrisConfig,
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

// ---- Attendance (tickets sold vs. gate scans) ----

/**
 * Server-only. The owner-scoped attendance report powering
 * `/dashboard/admin/events/[slug]/attendance`. Already camelCase from the
 * backend, so it needs no `normalize.ts` mapper.
 */
export const getEventAttendance = (eventId: string): Promise<EventAttendanceReport> =>
  apiFetch<EventAttendanceReport>(`/api/events/${eventId}/attendance`);

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

// ---- Merch promo codes (seller-scoped) ----

export const listMerchPromoCodes = async (): Promise<MerchPromoCode[]> => {
  const raw = await apiFetch<RawMerchPromoCode[]>("/api/merch-promo-codes");
  return raw.map(toMerchPromoCode);
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

// ---- QRIS config ----

/** Server-only. The signed-in admin's QRIS code, or `null` if not set up. */
export const getMyQrisConfig = async (): Promise<QrisConfig | null> => {
  const raw = await apiFetch<RawQrisConfig | null>("/api/qris-config");
  return raw ? toQrisConfig(raw) : null;
};

// ---- Organizer email config ----

/** Server-only. The signed-in admin's outbound email config (password never included), or `null`. */
export const getMyEmailConfig = async (): Promise<OrganizerEmailConfig | null> => {
  const raw = await apiFetch<RawOrganizerEmailConfig | null>("/api/email-config");
  return raw ? toOrganizerEmailConfig(raw) : null;
};

// ---- Orders / payments / refunds for an event ----

/**
 * Server-only. Buyers for one event, paginated/filterable — no
 * `items`/`tickets` embedded (see BACKEND.md). Backs the admin orders table's
 * server-side search/filter/sort/pagination so a large event never ships its
 * full order list to the browser.
 */
export const listEventOrders = async (
  eventId: string,
  query?: ListEventOrdersQuery,
): Promise<{ orders: Order[]; meta: ApiPageMeta }> => {
  const { data, meta } = await apiFetchPage<Order>(`/api/events/${eventId}/orders`, { query });
  return { orders: data, meta };
};

/** Server-only. Every order across every event this admin owns within a date range — powers the Excel sales report. */
export const getMyOrdersExport = async (query: ExportOrdersQuery): Promise<Order[]> =>
  apiFetch<Order[]>("/api/orders/export", { query });

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

// ---- Merch (seller-scoped) ----

/** Server-only. The signed-in seller's products, with units sold + revenue from paid orders. */
export const listMyProducts = async (): Promise<Product[]> => {
  const raw = await apiFetch<RawProduct[]>("/api/products/mine");
  return raw.map(toProduct);
};

/** Server-only. Owner detail: product + gallery + option/variant config in one payload. */
export const getMyProduct = async (productId: string): Promise<ProductDetail> => {
  const raw = await apiFetch<RawProductDetail>(`/api/products/${productId}`);
  return toProductDetail(raw);
};

/**
 * Server-only. Incoming merch orders (buyer details + items included) —
 * search/status/sort/pagination run server-side, mirroring the events
 * orders table.
 */
export const listSellingMerchOrders = async (
  query?: ListSellingMerchOrdersQuery,
): Promise<{ orders: MerchOrder[]; meta: ApiPageMeta }> => {
  const { data, meta } = await apiFetchPage<RawMerchOrder>("/api/merch-orders/selling", { query });
  return { orders: data.map(toMerchOrder), meta };
};

export const listMerchOrderPayments = async (merchOrderId: string): Promise<MerchOrderPayment[]> => {
  const raw = await apiFetch<RawMerchOrderPayment[]>(`/api/merch-orders/${merchOrderId}/payments`);
  return raw.map(toMerchOrderPayment);
};

/** Server-only. Every selling order within a date range, items included — powers the Excel sales report. */
export const getSellingMerchOrdersExport = async (query: ExportOrdersQuery): Promise<MerchOrder[]> => {
  const raw = await apiFetch<RawMerchOrder[]>("/api/merch-orders/export", { query });
  return raw.map(toMerchOrder);
};

/** Server-only. One order, buyer + shipping details + items — the packing-label print view. */
export const getMerchOrderForSeller = async (merchOrderId: string): Promise<MerchOrder> => {
  const raw = await apiFetch<RawMerchOrder>(`/api/merch-orders/${merchOrderId}`);
  return toMerchOrder(raw);
};
