import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPrice } from "@/data/events";
import { listMyOrders } from "@/features/account/lib/api";
import { MerchOrderStatusBadge } from "@/features/merch/components";
import { listMyMerchOrders } from "@/features/merch/lib/api";
import { OrderStatusBadge } from "@/features/orders/components";
import type { MerchOrder, Order } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Transaction history" };

/** "22/08/2026, 09:05" — buyers scan history by date first. */
const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * One merged history row — ticket orders and merch orders interleave into a
 * single reverse-chronological transaction list.
 */
type Transaction = { kind: "tickets"; order: Order } | { kind: "merch"; order: MerchOrder };

/**
 * The buyer's full transaction history: every ticket order and merch order,
 * newest first, each with the line items (what was bought, at what price) as
 * they were at purchase time — snapshots survive later renames/deletions.
 */
export default async function TransactionHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/account/orders");

  const [orders, merchOrders] = await Promise.all([listMyOrders(), listMyMerchOrders()]);
  const transactions: Transaction[] = [
    ...orders.map((order): Transaction => ({ kind: "tickets", order })),
    ...merchOrders.map((order): Transaction => ({ kind: "merch", order })),
  ].sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime());

  return (
    <div className="bg-paper py-10 sm:py-16">
      <div className="site-container">
        <span className="section-index">MY ACCOUNT</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl">Transaction history.</h1>
        <p className="mt-3 text-black/50">
          Every ticket and merch purchase on this account, with what you bought at the time.{" "}
          <Link href="/account" className="text-black underline decoration-lime decoration-2 underline-offset-4">
            Back to my tickets
          </Link>
        </p>

        <div className="mt-10 max-w-3xl space-y-4">
          {transactions.length === 0 && (
            <p className="border-2 border-black/15 bg-white p-6 text-sm font-semibold text-black/50">
              No transactions yet.{" "}
              <Link href="/events" className="text-black underline decoration-lime decoration-2 underline-offset-4">
                Find something to go to
              </Link>{" "}
              or{" "}
              <Link href="/merch" className="text-black underline decoration-lime decoration-2 underline-offset-4">
                browse the merch store
              </Link>
              .
            </p>
          )}

          {transactions.map((transaction) =>
            transaction.kind === "tickets" ? (
              <Link
                key={transaction.order.id}
                href={`/orders/${transaction.order.id}`}
                className="block border-2 border-ink bg-white p-4 transition-colors hover:bg-paper sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="tag">Event tickets</span>
                  <OrderStatusBadge status={transaction.order.status} />
                </div>
                <p className="mt-3 font-black uppercase leading-tight">{transaction.order.eventName ?? "Event order"}</p>
                <p className="mt-1 text-xs text-black/40">{formatDateTime(transaction.order.createdAt)}</p>
                <ul className="mt-3 space-y-1 border-t border-black/10 pt-3 text-sm">
                  {transaction.order.items?.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="min-w-0 text-black/60">
                        {item.quantity}× {item.ticketTypeName ?? "Ticket"}
                        <span className="text-black/35"> @ {formatPrice(item.unitPrice)}</span>
                      </span>
                      <span className="shrink-0 font-semibold">{formatPrice(item.subtotal)}</span>
                    </li>
                  ))}
                  {transaction.order.discountAmount > 0 && (
                    <li className="flex justify-between gap-3 text-black/60">
                      <span>Promo discount</span>
                      <span className="font-semibold">−{formatPrice(transaction.order.discountAmount)}</span>
                    </li>
                  )}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t-2 border-ink pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Total</span>
                  <strong>{formatPrice(transaction.order.totalAmount)}</strong>
                </div>
              </Link>
            ) : (
              <Link
                key={transaction.order.id}
                href={`/merch-orders/${transaction.order.id}`}
                className="block border-2 border-ink bg-white p-4 transition-colors hover:bg-paper sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="tag">Merch</span>
                  <MerchOrderStatusBadge status={transaction.order.status} />
                </div>
                <p className="mt-1 text-xs text-black/40">{formatDateTime(transaction.order.createdAt)}</p>
                <ul className="mt-3 space-y-1 border-t border-black/10 pt-3 text-sm">
                  {transaction.order.items?.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="min-w-0 text-black/60">
                        {item.quantity}× {item.productName}
                        {item.variantLabel && <span className="text-black/40"> ({item.variantLabel})</span>}
                        <span className="text-black/35"> @ {formatPrice(item.unitPrice)}</span>
                      </span>
                      <span className="shrink-0 font-semibold">{formatPrice(item.subtotal)}</span>
                    </li>
                  ))}
                  {transaction.order.shippingCost > 0 && (
                    <li className="flex justify-between gap-3 text-black/60">
                      <span>Shipping{transaction.order.courierName ? ` (${transaction.order.courierName})` : ""}</span>
                      <span className="font-semibold">{formatPrice(transaction.order.shippingCost)}</span>
                    </li>
                  )}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t-2 border-ink pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Total</span>
                  <strong>{formatPrice(transaction.order.totalAmount)}</strong>
                </div>
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
