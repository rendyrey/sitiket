import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Order, PaymentInstructions } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/session";

/**
 * Server-only. Resolves an order for whoever is viewing it: the signed-in
 * buyer/event-owner/super_admin via the authenticated endpoint, or a guest
 * via the id+email pair (their only "credential" — see
 * docs/business/PAYMENT_VERIFICATION.md). Returns `null` if neither path
 * resolves — not found, or the viewer isn't entitled to see it.
 */
export const getOrderForViewer = async (orderId: string, guestEmail?: string): Promise<{ order: Order; isGuest: boolean } | null> => {
  const user = await getCurrentUser();

  if (user) {
    try {
      return { order: await apiFetch<Order>(`/api/orders/${orderId}`), isGuest: false };
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      // Fall through to the guest lookup only if an email was also supplied.
    }
  }

  if (guestEmail) {
    try {
      return { order: await apiFetch<Order>(`/api/orders/${orderId}/guest`, { query: { email: guestEmail } }), isGuest: true };
    } catch (error) {
      if (error instanceof ApiError) return null;
      throw error;
    }
  }

  return null;
};

/** Server-only. `null` if the organizer has no payout account configured yet. */
export const getPaymentInstructions = async (orderId: string, guestEmail?: string): Promise<PaymentInstructions | null> => {
  try {
    return await apiFetch<PaymentInstructions>(`/api/orders/${orderId}/payments/instructions`, {
      query: guestEmail ? { guestEmail } : undefined,
    });
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
};
