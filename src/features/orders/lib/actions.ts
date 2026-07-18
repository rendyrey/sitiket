"use server";

import { apiFetch } from "@/lib/api/client";
import { toActionResult, type ActionResult } from "@/lib/api/action-result";
import { toOrderPayment, toRefundRequest } from "@/lib/api/normalize";
import type { Order, RawOrderPayment, RawRefundRequest } from "@/lib/api/types";

/** Verifies a guest checkout's email OTP so the order can proceed to payment. */
export async function verifyGuestOtpAction(orderId: string, code: string): Promise<ActionResult<Order>> {
  return toActionResult(() => apiFetch<Order>(`/api/orders/${orderId}/verify-guest-email`, { method: "POST", body: { code } }));
}

/** `formData` must contain a `proof` file field, plus `transferNote`/`guestEmail` as needed. */
export async function submitPaymentProofAction(orderId: string, formData: FormData) {
  return toActionResult(() => apiFetch<RawOrderPayment>(`/api/orders/${orderId}/payments`, { method: "POST", formData }), toOrderPayment);
}

export async function requestRefundAction(orderId: string, input: { reason: string; guestEmail?: string }) {
  return toActionResult(
    () => apiFetch<RawRefundRequest>(`/api/orders/${orderId}/refund-requests`, { method: "POST", body: input }),
    toRefundRequest,
  );
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult<Order>> {
  return toActionResult(() => apiFetch<Order>(`/api/orders/${orderId}/cancel`, { method: "POST" }));
}
