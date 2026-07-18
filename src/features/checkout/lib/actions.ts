"use server";

import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getSessionToken } from "@/lib/session";
import type { CreateOrderRequest, Order } from "@/lib/api/types";

export type CreateOrderActionResult =
  | { ok: true; order: Order; devOtpCode?: string; isGuest: boolean }
  | { ok: false; message: string };

/** Creates a checkout order — guest or logged-in, resolved from the session cookie automatically. */
export async function createOrderAction(input: CreateOrderRequest): Promise<CreateOrderActionResult> {
  try {
    const isGuest = !(await getSessionToken());
    const json = await apiRequest<{ data: Order; meta?: { devOtpCode: string } }>("/api/orders", {
      method: "POST",
      body: input,
    });
    return { ok: true, order: json.data, devOtpCode: json.meta?.devOtpCode, isGuest };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
}
