"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAtom } from "jotai";
import ActionLink from "@/components/ui/action-link";
import { formatPrice } from "@/data/events";
import { getShippingQuotesAction } from "@/features/shipping/lib/actions";
import type { CourierOption, MerchOrder, MerchPromoValidation, ShippingQuote, User } from "@/lib/api/types";
import { createMerchOrdersAction, validateMerchPromoCodeAction } from "../lib/actions";
import { cartAtom, cartLineKey, cartTotal, groupBySeller } from "../lib/cart";

/** Whole-Rupiah discount for a seller subtotal — mirrors the backend `calculateDiscount`, clamped to the subtotal. */
const previewDiscount = (promo: MerchPromoValidation, subtotal: number): number => {
  const raw =
    promo.discountType === "percentage" ? Math.round((subtotal * promo.discountValue) / 100) : Math.round(promo.discountValue);
  return Math.min(raw, subtotal);
};

/**
 * Signed-in merch checkout. Shows the delivery address from the buyer's
 * profile (a hard prerequisite — the backend snapshots it onto each order),
 * groups the cart per seller, quotes each seller's shipping couriers from
 * their departure address to the buyer's village, and — for multi-seller
 * carts — interrupts with a modal making clear that one order per seller is
 * created and each must be paid separately.
 */
export default function MerchCheckoutView({ user }: { user: User }) {
  const router = useRouter();
  const [items, setCart] = useAtom(cartAtom);
  const [buyerNote, setBuyerNote] = useState("");
  const [confirmingSplit, setConfirmingSplit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrders, setCreatedOrders] = useState<MerchOrder[] | null>(null);

  /**
   * The last quote response, tagged with the cart serialization it was
   * requested for — a mismatched key means the cart changed and a fresh quote
   * is in flight (that mismatch IS the loading state, so the effect never has
   * to reset state synchronously).
   */
  const [quoteState, setQuoteState] = useState<{ key: string; quotes?: ShippingQuote[]; error?: string } | null>(null);
  /** Map of sellerId → the buyer's chosen courier code. */
  const [selectedCouriers, setSelectedCouriers] = useState<Record<string, string>>({});

  // Per-seller promo code state (codes are seller-scoped; a cart splits into one
  // order per seller). `promoDrafts` is the input text; `appliedPromos` holds a
  // validated code once "Apply" succeeds — the authoritative discount is still
  // recomputed server-side at checkout.
  const [promoDrafts, setPromoDrafts] = useState<Record<string, string>>({});
  const [appliedPromos, setAppliedPromos] = useState<Record<string, MerchPromoValidation>>({});
  const [promoErrors, setPromoErrors] = useState<Record<string, string | null>>({});
  const [applyingPromo, setApplyingPromo] = useState<Record<string, boolean>>({});

  const groups = groupBySeller(items);
  // The village code is what shipping quotes key on — without it there is no
  // shipping cost, so checkout requires the full region-picked address.
  const profileComplete = Boolean(user.phone && user.address && user.villageCode);

  /** Request payload lines — stable-stringified so the quote effect only refires on real cart changes. */
  const requestItems = useMemo(
    () =>
      items.map((line) => ({
        productId: line.productId,
        ...(line.variantId ? { variantId: line.variantId } : {}),
        quantity: line.quantity,
      })),
    [items],
  );
  const requestItemsKey = JSON.stringify(requestItems);

  // Quote shipping whenever the cart contents change (server-side DB cache
  // makes repeat quotes free). Resets stale courier picks for sellers whose
  // options changed.
  useEffect(() => {
    if (!profileComplete || requestItems.length === 0) return;
    let cancelled = false;
    void getShippingQuotesAction(requestItems).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setQuoteState({ key: requestItemsKey, error: result.message });
        return;
      }
      setQuoteState({ key: requestItemsKey, quotes: result.data });
      // Preselect the cheapest courier per seller — standard e-commerce default.
      setSelectedCouriers((previous) => {
        const next: Record<string, string> = {};
        for (const quote of result.data) {
          const stillValid = quote.couriers.some((courier) => courier.courierCode === previous[quote.sellerId]);
          const cheapest = [...quote.couriers].sort((a, b) => a.price - b.price)[0];
          const chosen = stillValid ? previous[quote.sellerId] : cheapest?.courierCode;
          if (chosen) next[quote.sellerId] = chosen;
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestItemsKey is the stable serialization of requestItems
  }, [profileComplete, requestItemsKey]);

  // Only a response for the CURRENT cart counts — anything else is stale.
  const quotes = quoteState?.key === requestItemsKey ? (quoteState.quotes ?? null) : null;
  const quoteError = quoteState?.key === requestItemsKey ? (quoteState.error ?? null) : null;

  /** The quote for one seller group, or undefined while quotes load. */
  const quoteFor = (sellerId: string): ShippingQuote | undefined => quotes?.find((quote) => quote.sellerId === sellerId);

  /** The chosen courier entry for one seller, or undefined until picked. */
  const chosenCourier = (sellerId: string): CourierOption | undefined =>
    quoteFor(sellerId)?.couriers.find((courier) => courier.courierCode === selectedCouriers[sellerId]);

  const shippingTotal = groups.reduce((sum, group) => sum + (chosenCourier(group.sellerId)?.price ?? 0), 0);
  const everySellerHasCourier = groups.every((group) => Boolean(chosenCourier(group.sellerId)));

  /** The applied discount for one seller group, priced against its current subtotal. */
  const discountFor = (sellerId: string): number => {
    const promo = appliedPromos[sellerId];
    const group = groups.find((entry) => entry.sellerId === sellerId);
    if (!promo || !group) return 0;
    return previewDiscount(promo, cartTotal(group.items));
  };
  const discountTotal = groups.reduce((sum, group) => sum + discountFor(group.sellerId), 0);

  const applyPromo = async (sellerId: string) => {
    const code = (promoDrafts[sellerId] ?? "").trim();
    if (!code) return;
    setApplyingPromo((previous) => ({ ...previous, [sellerId]: true }));
    setPromoErrors((previous) => ({ ...previous, [sellerId]: null }));
    const result = await validateMerchPromoCodeAction({ sellerId, code });
    setApplyingPromo((previous) => ({ ...previous, [sellerId]: false }));
    if (!result.ok) {
      setPromoErrors((previous) => ({ ...previous, [sellerId]: result.message }));
      return;
    }
    setAppliedPromos((previous) => ({ ...previous, [sellerId]: result.data }));
  };

  const removePromo = (sellerId: string) => {
    setAppliedPromos((previous) => {
      const next = { ...previous };
      delete next[sellerId];
      return next;
    });
    setPromoDrafts((previous) => ({ ...previous, [sellerId]: "" }));
    setPromoErrors((previous) => ({ ...previous, [sellerId]: null }));
  };

  const placeOrders = async () => {
    setConfirmingSplit(false);
    setError(null);
    setSubmitting(true);
    const promoCodes = groups
      .filter((group) => appliedPromos[group.sellerId])
      .map((group) => ({ sellerId: group.sellerId, code: appliedPromos[group.sellerId].code }));
    const result = await createMerchOrdersAction({
      items: requestItems,
      shipping: groups.map((group) => ({
        sellerId: group.sellerId,
        courierCode: selectedCouriers[group.sellerId],
      })),
      ...(promoCodes.length > 0 ? { promoCodes } : {}),
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
            <Link href="/account/profile" className="text-link text-xs">
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
                  {[user.address, user.village, user.district, user.city, user.province, user.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 border-2 border-red-500/60 bg-red-500/5 p-4 text-sm font-semibold text-red-700">
              Your profile is missing a phone number or a full delivery address (down to the village).{" "}
              <Link href="/account/profile" className="underline decoration-2 underline-offset-2">
                Complete it first
              </Link>{" "}
              — shipping costs are calculated from it.
            </p>
          )}
        </section>

        {/* Per-seller summary + courier choice */}
        {groups.map((group) => {
          const quote = quoteFor(group.sellerId);
          const courier = chosenCourier(group.sellerId);
          return (
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

              {/* Shipping courier — quoted from the seller's departure address to the buyer's village. */}
              <div className="border-t-2 border-ink px-4 py-4 sm:px-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
                  Shipping{quote ? ` — ${quote.weightKg} kg` : ""}
                </span>
                {!profileComplete ? (
                  <p className="mt-2 text-xs text-black/45">Complete your delivery address to see shipping options.</p>
                ) : quoteError ? (
                  <p className="mt-2 text-sm font-semibold text-red-600">{quoteError}</p>
                ) : !quote ? (
                  <p className="mt-2 text-xs text-black/45">Calculating shipping options…</p>
                ) : quote.couriers.length === 0 ? (
                  <p className="mt-2 text-sm font-semibold text-red-600">
                    No courier serves this route yet — this seller can&apos;t ship to your address.
                  </p>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {quote.couriers.map((option) => (
                      <label
                        key={option.courierCode}
                        className={`flex cursor-pointer items-center justify-between gap-3 border-2 p-3 text-sm ${
                          selectedCouriers[group.sellerId] === option.courierCode
                            ? "border-ink bg-lime/20"
                            : "border-black/15 hover:border-ink"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <input
                            type="radio"
                            name={`courier-${group.sellerId}`}
                            checked={selectedCouriers[group.sellerId] === option.courierCode}
                            onChange={() =>
                              setSelectedCouriers((previous) => ({ ...previous, [group.sellerId]: option.courierCode }))
                            }
                          />
                          <span className="min-w-0">
                            <span className="block font-bold">{option.courierName}</span>
                            {option.estimation && <span className="block text-xs text-black/45">{option.estimation}</span>}
                          </span>
                        </span>
                        <strong className="shrink-0">{formatPrice(option.price)}</strong>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Promo code — seller-scoped, discounts this seller's items only. */}
              <div className="border-t-2 border-ink px-4 py-4 sm:px-5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Promo code</span>
                {appliedPromos[group.sellerId] ? (
                  <div className="mt-2 flex items-center justify-between gap-3 border-2 border-lime bg-lime/15 p-3 text-sm">
                    <span className="min-w-0">
                      <span className="font-black uppercase">{appliedPromos[group.sellerId].code}</span>
                      <span className="text-green-700"> — {formatPrice(discountFor(group.sellerId))} off</span>
                    </span>
                    <button type="button" onClick={() => removePromo(group.sellerId)} className="text-link shrink-0 text-xs">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={promoDrafts[group.sellerId] ?? ""}
                      onChange={(event) =>
                        setPromoDrafts((previous) => ({ ...previous, [group.sellerId]: event.target.value.toUpperCase() }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void applyPromo(group.sellerId);
                        }
                      }}
                      placeholder="Have a code?"
                      className="text-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => void applyPromo(group.sellerId)}
                      disabled={applyingPromo[group.sellerId] || !(promoDrafts[group.sellerId] ?? "").trim()}
                      className="button button-dark shrink-0 disabled:opacity-40"
                    >
                      {applyingPromo[group.sellerId] ? "…" : "Apply"}
                    </button>
                  </div>
                )}
                {promoErrors[group.sellerId] && (
                  <p className="mt-2 text-xs font-semibold text-red-600">{promoErrors[group.sellerId]}</p>
                )}
              </div>

              <footer className="space-y-1 border-t-2 border-ink px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between text-xs text-black/55">
                  <span>Items</span>
                  <span>{formatPrice(cartTotal(group.items))}</span>
                </div>
                {discountFor(group.sellerId) > 0 && (
                  <div className="flex items-center justify-between text-xs text-green-700">
                    <span>Discount ({appliedPromos[group.sellerId].code})</span>
                    <span>-{formatPrice(discountFor(group.sellerId))}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-black/55">
                  <span>Shipping{courier ? ` (${courier.courierName})` : ""}</span>
                  <span>{courier ? formatPrice(courier.price) : "—"}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Pay {group.sellerName}</span>
                  <strong>{formatPrice(cartTotal(group.items) - discountFor(group.sellerId) + (courier?.price ?? 0))}</strong>
                </div>
              </footer>
            </section>
          );
        })}

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
          {discountTotal > 0 && (
            <div className="flex justify-between gap-3 border-t border-white/15 pt-2 text-lime">
              <span className="min-w-0 truncate">Discount</span>
              <span className="shrink-0">-{formatPrice(discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-white/15 pt-2">
            <span className="min-w-0 truncate">Shipping</span>
            <span className="shrink-0">{everySellerHasCourier ? formatPrice(shippingTotal) : "—"}</span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-white/45">Total</span>
          <strong className="text-2xl text-lime">{formatPrice(cartTotal(items) - discountTotal + shippingTotal)}</strong>
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
          disabled={submitting || !profileComplete || !everySellerHasCourier}
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
                  <strong className="shrink-0">
                    {formatPrice(cartTotal(group.items) - discountFor(group.sellerId) + (chosenCourier(group.sellerId)?.price ?? 0))}
                  </strong>
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
