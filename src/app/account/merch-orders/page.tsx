import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/data/events";
import { MerchOrderStatusBadge } from "@/features/merch/components";
import { listMyMerchOrders } from "@/features/merch/lib/api";

export const metadata: Metadata = { title: "Merch orders" };

/** "22/08/2026, 09:05" — buyers scan history by date first. */
const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * The buyer's merch order history — every order with its product line items
 * (name, variant, unit price) and shipping as snapshotted at purchase time.
 */
export default async function MerchOrderHistoryPage() {
  const orders = await listMyMerchOrders();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Merch orders</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        Every merch purchase on this account, with what you bought at the time. Open one to pay, upload proof, or track
        its status.
      </p>

      <div className="mt-8 max-w-3xl space-y-4">
        {orders.length === 0 && (
          <p className="border-2 border-black/15 bg-white p-6 text-sm font-semibold text-black/50">
            No merch orders yet.{" "}
            <Link href="/merch" className="text-black underline decoration-lime decoration-2 underline-offset-4">
              Browse the merch store
            </Link>
            .
          </p>
        )}

        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/merch-orders/${order.id}`}
            className="block border-2 border-ink bg-white p-4 transition-colors hover:bg-paper sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs text-black/40">{formatDateTime(order.createdAt)}</p>
              <MerchOrderStatusBadge status={order.status} />
            </div>
            <ul className="mt-3 space-y-1 border-t border-black/10 pt-3 text-sm">
              {order.items?.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0 text-black/60">
                    {item.quantity}× {item.productName}
                    {item.variantLabel && <span className="text-black/40"> ({item.variantLabel})</span>}
                    <span className="text-black/35"> @ {formatPrice(item.unitPrice)}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{formatPrice(item.subtotal)}</span>
                </li>
              ))}
              {order.shippingCost > 0 && (
                <li className="flex justify-between gap-3 text-black/60">
                  <span>Shipping{order.courierName ? ` (${order.courierName})` : ""}</span>
                  <span className="font-semibold">{formatPrice(order.shippingCost)}</span>
                </li>
              )}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t-2 border-ink pt-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Total</span>
              <strong>{formatPrice(order.totalAmount)}</strong>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
