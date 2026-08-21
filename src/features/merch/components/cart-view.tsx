"use client";

import Image from "next/image";
import Link from "next/link";
import { useAtom } from "jotai";
import ActionLink from "@/components/ui/action-link";
import { formatPrice } from "@/data/events";
import { useSession } from "@/features/auth/lib/use-session";
import { toAssetUrl } from "@/lib/public-env";
import { cartAtom, cartLineKey, cartTotal, groupBySeller, type CartItem } from "../lib/cart";

/**
 * Tokopedia/Shopee-style cart, grouped per seller — the same product with
 * different options is separate lines. Checkout happens on /merch/checkout;
 * the multi-seller "you'll make several payments" confirmation lives there.
 */
export default function CartView() {
  const [items, setCart] = useAtom(cartAtom);
  const user = useSession();

  const updateQuantity = (line: CartItem, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          cartLineKey(item) === cartLineKey(line)
            ? { ...item, quantity: Math.max(1, Math.min(item.quantity + delta, item.maxQuantity || 99)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeLine = (line: CartItem) =>
    setCart((current) => current.filter((item) => cartLineKey(item) !== cartLineKey(line)));

  if (items.length === 0) {
    return (
      <div className="border-2 border-black/15 bg-white p-10 text-center">
        <p className="text-sm font-semibold text-black/50">Your cart is empty.</p>
        <ActionLink href="/merch" variant="lime" className="mt-5">
          Browse merch
        </ActionLink>
      </div>
    );
  }

  const groups = groupBySeller(items);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.sellerId} className="border-2 border-ink bg-white">
            <header className="border-b-2 border-ink bg-paper px-4 py-3 sm:px-5">
              <span className="text-xs font-black uppercase tracking-widest">Sold by {group.sellerName}</span>
            </header>
            <ul>
              {group.items.map((line) => (
                <li key={cartLineKey(line)} className="flex gap-4 border-b border-black/10 p-4 last:border-b-0 sm:p-5">
                  <Link href={`/merch/${line.slug}`} className="relative block h-20 w-20 shrink-0 overflow-hidden border-2 border-ink bg-paper">
                    {line.imageUrl ? (
                      <Image src={toAssetUrl(line.imageUrl)} alt="" fill sizes="80px" className="object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-2xl font-black text-black/15">
                        {line.name.charAt(0)}
                      </span>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/merch/${line.slug}`} className="line-clamp-2 text-sm font-extrabold uppercase leading-tight">
                        {line.name}
                      </Link>
                      {line.variantLabel && <p className="mt-0.5 text-xs font-semibold text-black/45">{line.variantLabel}</p>}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => updateQuantity(line, -1)} className="quantity-button" aria-label={`Decrease ${line.name} quantity`}>
                          −
                        </button>
                        <span className="min-w-[2ch] text-center text-sm font-black tabular-nums">{line.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(line, 1)} className="quantity-button" aria-label={`Increase ${line.name} quantity`}>
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(line)}
                          className="ml-2 text-xs font-bold uppercase tracking-wide text-black/40 underline decoration-2 underline-offset-2 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <strong className="text-sm">{formatPrice(line.unitPrice * line.quantity)}</strong>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <footer className="flex items-center justify-between border-t-2 border-ink px-4 py-3 sm:px-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Seller subtotal</span>
              <strong>{formatPrice(cartTotal(group.items))}</strong>
            </footer>
          </section>
        ))}
      </div>

      <aside className="h-fit border-2 border-ink bg-ink p-5 text-white xs:p-7 lg:sticky lg:top-32">
        <span className="text-xs font-bold uppercase tracking-widest text-lime">Cart summary</span>
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
            You&apos;re ordering from {groups.length} different sellers — checkout creates one order per seller, each
            paid separately.
          </p>
        )}
        {user ? (
          <ActionLink href="/merch/checkout" variant="lime" size="large" className="mt-6 w-full">
            Checkout
          </ActionLink>
        ) : (
          <>
            <ActionLink href="/login?redirect=/merch/checkout" variant="lime" size="large" className="mt-6 w-full">
              Sign in to checkout
            </ActionLink>
            <p className="mt-3 text-center text-xs text-white/40">Merch checkout requires a SiTIKET account.</p>
          </>
        )}
      </aside>
    </div>
  );
}
