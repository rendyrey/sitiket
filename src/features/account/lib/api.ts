import { apiFetch } from "@/lib/api/client";
import type { Order, Ticket } from "@/lib/api/types";

/** Server-only. The signed-in user's purchase history (no `items`/`tickets` embedded — see BACKEND.md). */
export const listMyOrders = (): Promise<Order[]> => apiFetch<Order[]>("/api/orders/mine");

/** Server-only. Every ticket across all of the signed-in user's orders. */
export const listMyTickets = (): Promise<Ticket[]> => apiFetch<Ticket[]>("/api/tickets/mine");
