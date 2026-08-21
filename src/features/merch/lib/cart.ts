"use client";

import { atomWithStorage } from "jotai/utils";

/**
 * One cart line — a (product, variant) pair. The same product with two
 * different variants is two separate lines (Tokopedia/Shopee behavior).
 * Prices here are display hints only; the backend recomputes everything at
 * checkout from the live catalog.
 */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  variantId?: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
  /** Backend-relative path (`/uploads/...`) or null. */
  imageUrl: string | null;
  sellerId: string;
  sellerName: string;
  /** Remaining stock at add-to-cart time — bounds the quantity stepper. */
  maxQuantity: number;
}

export const cartLineKey = (item: Pick<CartItem, "productId" | "variantId">) =>
  `${item.productId}:${item.variantId ?? "base"}`;

/**
 * Cart state, persisted per-browser in localStorage. Server renders see the
 * empty default; cart UI is client-only, so there is no hydration mismatch
 * to worry about beyond the badge count (which mounts client-side).
 */
export const cartAtom = atomWithStorage<CartItem[]>("sitiket-merch-cart", []);

/** Adds a line, merging quantity into an existing (product, variant) line. */
export const addCartItem = (items: CartItem[], next: CartItem): CartItem[] => {
  const key = cartLineKey(next);
  const existing = items.find((item) => cartLineKey(item) === key);
  if (!existing) return [...items, next];
  return items.map((item) =>
    cartLineKey(item) === key
      ? { ...item, quantity: Math.min(item.quantity + next.quantity, next.maxQuantity), maxQuantity: next.maxQuantity, unitPrice: next.unitPrice }
      : item,
  );
};

/** Groups cart lines per seller — checkout creates one order per group. */
export const groupBySeller = (items: CartItem[]): { sellerId: string; sellerName: string; items: CartItem[] }[] => {
  const groups = new Map<string, { sellerId: string; sellerName: string; items: CartItem[] }>();
  for (const item of items) {
    if (!groups.has(item.sellerId)) {
      groups.set(item.sellerId, { sellerId: item.sellerId, sellerName: item.sellerName, items: [] });
    }
    groups.get(item.sellerId)!.items.push(item);
  }
  return Array.from(groups.values());
};

export const cartTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
export const cartCount = (items: CartItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);
