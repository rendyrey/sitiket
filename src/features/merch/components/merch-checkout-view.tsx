"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtom } from "jotai";
import ActionLink from "@/components/ui/action-link";
import { formatPrice } from "@/data/events";
import type { MerchOrder, User } from "@/lib/api/types";
import { createMerchOrdersAction } from "../lib/actions";
import { cartAtom, cartLineKey, cartTotal, groupBySeller } from "../lib/cart";

/**
 * Signed-in merch checkout. Shows the delivery address from the buyer's
 * profile (a hard prerequisite — the backend snapshots it onto each order),
 * groups the cart per seller, and — for multi-seller carts — interrupts with
 * a modal making clear that one order per seller is created and each must be
 * paid separately.
 */
export default function MerchCheckoutView({ user }: { user: User }) {
  const router = useRouter();
  const [items, setCart] = useAtom(cartAtom);
  const [buyerNote, setBuyerNote] = useState("");
  const [confirmingSplit, setConfirmingSplit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrders, setCreatedOrders] = useState<MerchOrder[] | null>(null);

  const groups = groupBySeller(items);
  const profileComplete = Boolean(user.phone && user.address);

  const placeOrders = async () => {
    setConfirmingSplit(false);
    setError(null);
    setSubmitting(true);
    const result = await createMerchOrdersAction({
      items: items.map((line) => ({
        productId: line.productId,
        ...(line.variantId ? { variantId: line.variantId } : {}),
        quantity: line.quantity,
      })),
      ...(buyerNote.trim() ? { buyerNote: buyerNote.trim() } : {}),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCart([]);
    if (result.data.length === 1) {
      router.push(`/merch-orders/${result.data[0].id}`);
      return;
    }
    // Multi-seller: show every created order so the buyer can pay each one.
    setCreatedOrders(result.data);
  };

  const handlePlaceOrder = () => {
    if (groups.length > 1) {
      setConfirmingSplit(true);
      return;
    }
    void placeOrders();
  };

  if (createdOrders) {
    return (
      <div className="mx-auto max-w-xl border-2 border-ink bg-white p-6 sm:p-8">
        <span className="tag !bg-lime !text-black">Orders created</span>
        <h2 className="mt-4 text-2xl font-black uppercase">Now pay each seller.</h2>
        <p className="mt-3 text-sm text-black/55">
          Your cart contained items from {createdOrders.length} sellers, so we created {createdOrders.length} separate
          orders. Each has its own payment instructions and 24-hour window.
        </p>
        <ul className="mt-6 space-y-3">
          {createdOrders.map((order, index) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink p-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-black/40">Order {index + 1}</p>
                <strong>{formatPrice(order.totalAmount)}</strong>
              </div>
              <ActionLink href={`/merch-orders/${order.id}`} variant="lime">
                Pay this order
              </ActionLink>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-black/45">You can also find these anytime under My account → Merch orders.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border-2 border-black/15 bg-white p-10 text-center">
        <p className="text-sm font-semibold text-black/50">Nothing to check out — your cart is empty.</p>
        <ActionLink href="/merch" variant="lime" className="mt-5">
          Browse merch
        </ActionLink>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* Delivery address */}
        <section className="border-2 border-ink bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="tag">Deliver to</span>
            <Link href="/account#profile" className="text-link text-xs">
              Edit in my account
            </Link>
          </div>
          {profileComplete ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="sr-only">Recipient</dt>
                <dd className="font-bold">
                  {user.name} · {user.phone}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Address</dt>
                <dd className="text-black/60">
                  {[user.address, user.city, user.province, user.postalCode].filter(Boolean).join(", ")}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 border-2 border-red-500/60 bg-red-500/5 p-4 text-sm font-semibold text-red-700">
              Your profile is missing a phone number or delivery address.{" "}
              <Link href="/account#profile" className="underline decoration-2 underline-offset-2">
                Complete it first
              </Link>{" "}
              — sellers need it to ship your merch.
            </p>
          )}
        </section>

        {/* Per-seller summary */}
        {groups.map((group) => (
          <section key={group.sellerId} className="border-2 border-ink bg-white">
            <header className="border-b-2 border-ink bg-paper px-4 py-3 sm:px-5">
              <span className="text-xs font-black uppercase tracking-widest">Sold by {group.sellerName}</span>
            </header>
            <ul className="divide-y divide-black/10">
              {group.items.map((line) => (
                <li key={cartLineKey(line)} className="flex items-baseline justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                  <span className="min-w-0">
                    <span className="font-bold">{line.name}</span>
                    {line.variantLabel && <span className="text-black/45"> — {line.variantLabel}</span>}
                    <span className="text-black/45"> × {line.quantity}</span>
                  </span>
                  <strong className="shrink-0">{formatPrice(line.unitPrice * line.quantity)}</strong>
                </li>
              ))}
            </ul>
            <footer className="flex items-center justify-between border-t-2 border-ink px-4 py-3 sm:px-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Pay {group.sellerName}</span>
              <strong>{formatPrice(cartTotal(group.items))}</strong>
            </footer>
          </section>
        ))}

        {/* Note to sellers */}
        <label className="field-label block">
          Note for the seller{groups.length > 1 ? "s" : ""} (optional)
          <textarea
            value={buyerNote}
            onChange={(event) => setBuyerNote(event.target.value)}
            maxLength={500}
            rows={2}
            placeholder="E.g. leave the package with security"
            className="text-field h-auto py-3"
          />
        </label>
      </div>

      <aside className="h-fit border-2 border-ink bg-ink p-5 text-white xs:p-7 lg:sticky lg:top-32">
        <span className="text-xs font-bold uppercase tracking-widest text-lime">Checkout</span>
        <div className="my-5 space-y-2 border-y border-white/15 py-4 text-sm text-white/65">
          {groups.map((group) => (
            <div key={group.sellerId} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{group.sellerName}</span>
              <span className="shrink-0">{formatPrice(cartTotal(group.items))}</span>
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-white/45">Total</span>
          <strong className="text-2xl text-lime">{formatPrice(cartTotal(items))}</strong>
        </div>
        {groups.length > 1 && (
          <p className="mt-4 border-t border-white/15 pt-4 text-xs text-white/50">
            {groups.length} sellers → {groups.length} separate orders and payments.
          </p>
        )}
        {error && <p className="mt-4 text-sm font-semibold text-red-400">{error}</p>}
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={submitting || !profileComplete}
          className="button button-lime button-large mt-6 w-full disabled:opacity-40"
        >
          {submitting ? "Placing order…" : "Place order"}
        </button>
        <p className="mt-3 text-center text-xs text-white/40">
          Stock is held for 24 hours while you complete the bank transfer / QRIS payment.
        </p>
      </aside>

      {/* Multi-seller confirmation modal */}
      {confirmingSplit && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/70 p-4" role="dialog" aria-modal="true" aria-labelledby="split-title">
          <div className="w-full max-w-md border-4 border-lime bg-white p-6 sm:p-8">
            <span className="tag">Heads up</span>
            <h2 id="split-title" className="mt-4 text-2xl font-black uppercase leading-tight">
              You&apos;re ordering from {groups.length} different sellers.
            </h2>
            <p className="mt-3 text-sm text-black/60">
              We&apos;ll create <strong>{groups.length} separate orders</strong> — one per seller — and you&apos;ll
              need to make <strong>{groups.length} separate payments</strong>, each to that seller&apos;s own bank
              account or QRIS. Is that OK?
            </p>
            <ul className="mt-4 space-y-1 border-y border-black/10 py-3 text-sm">
              {groups.map((group) => (
                <li key={group.sellerId} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold">{group.sellerName}</span>
                  <strong className="shrink-0">{formatPrice(cartTotal(group.items))}</strong>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setConfirmingSplit(false)} className="button button-outline">
                Go back
              </button>
              <button type="button" onClick={() => void placeOrders()} className="button button-lime">
                Yes, continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
