import { formatPrice } from "@/data/events";
import { BankTransferInstructions, PaymentWindowCountdown } from "@/features/orders/components";
import type { MerchOrder, PaymentInstructions } from "@/lib/api/types";
import MerchOrderStatusBadge from "./merch-order-status-badge";
import MerchPaymentProofForm from "./merch-payment-proof-form";

type MerchOrderStatusViewProps = {
  order: MerchOrder;
  paymentInstructions: PaymentInstructions | null;
};

/**
 * The buyer's merch order page — mirrors the ticket order flow: a live
 * countdown on the (24-hour) payment window, the seller's transfer/QRIS
 * instructions, the "I have paid" proof upload, then per-status panels.
 */
export default function MerchOrderStatusView({ order, paymentInstructions }: MerchOrderStatusViewProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {order.status === "pending_payment" && (
          <>
            <PaymentWindowCountdown
              expiresAt={order.paymentExpiresAt}
              closedMessage="Your reserved items are being released back for sale, and we've emailed you to say so. You can order again any time — subject to what's still in stock."
              openMessage="Transfer the total and upload your proof of payment before this runs out. After that the items are released back for sale and you'd need to order again."
            />
            {paymentInstructions ? (
              <>
                <BankTransferInstructions instructions={paymentInstructions} />
                <MerchPaymentProofForm
                  orderId={order.id}
                  hasBankTransfer={paymentInstructions.bankAccounts.length > 0}
                  hasQris={paymentInstructions.qris !== null}
                />
              </>
            ) : (
              <p className="border-2 border-red-500/60 bg-red-500/5 p-5 text-sm font-semibold text-red-700">
                The seller hasn&apos;t set up a payment method yet — please check back shortly or contact them directly.
              </p>
            )}
          </>
        )}

        {order.status === "awaiting_verification" && (
          <div className="border-2 border-ink bg-white p-5 sm:p-7">
            <span className="tag">Reviewing your payment</span>
            <p className="mt-4 text-sm text-black/60">
              Your proof of transfer has been submitted and the seller has been notified. This page updates once
              they&apos;ve confirmed it.
            </p>
          </div>
        )}

        {order.status === "paid" && (
          <div className="border-2 border-ink bg-white p-5 sm:p-7">
            <span className="tag !bg-lime !text-black">Payment confirmed</span>
            <p className="mt-4 text-sm text-black/60">
              The seller confirmed your payment and is preparing your order for delivery to the address below.
              They&apos;ll reach you at {order.buyerPhone} if anything needs clarifying.
            </p>
          </div>
        )}

        {order.status === "expired" && (
          <p className="border-2 border-ink bg-paper p-5 text-sm font-semibold">
            This order&apos;s payment window expired before a proof of transfer was submitted, so its stock was
            released back for sale.
          </p>
        )}
        {order.status === "cancelled" && (
          <p className="border-2 border-ink bg-paper p-5 text-sm font-semibold">This order was cancelled.</p>
        )}

        {/* Shipping details */}
        <div className="border-2 border-ink bg-white p-5 sm:p-7">
          <span className="tag">Delivery details</span>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2 border-b border-black/10 pb-2">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-black/40">Recipient</dt>
              <dd className="font-bold">
                {order.buyerName} · {order.buyerPhone}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 border-b border-black/10 pb-2">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-black/40">Address</dt>
              <dd className="max-w-[70%] text-right font-semibold">
                {[
                  order.shippingAddress,
                  order.shippingVillage,
                  order.shippingDistrict,
                  order.shippingCity,
                  order.shippingProvince,
                  order.shippingPostalCode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </dd>
            </div>
            {order.courierName && (
              <div className="flex flex-wrap justify-between gap-2 border-b border-black/10 pb-2">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-black/40">Courier</dt>
                <dd className="max-w-[70%] text-right font-semibold">
                  {order.courierName}
                  {order.shippingEstimation && <span className="block text-xs font-normal text-black/45">est. {order.shippingEstimation}</span>}
                </dd>
              </div>
            )}
            {order.buyerNote && (
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-black/40">Note</dt>
                <dd className="max-w-[70%] text-right text-black/60">{order.buyerNote}</dd>
              </div>
            )}
          </dl>
          <p className="mt-4 border-t border-black/10 pt-3 text-xs text-black/45">
            {order.courierName
              ? "The seller hands your package to the courier once your payment is confirmed."
              : "The seller arranges delivery themselves once your payment is confirmed."}
          </p>
        </div>
      </div>

      <aside className="h-fit border-2 border-ink bg-ink p-5 text-white xs:p-7 lg:sticky lg:top-32">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-lime">Merch order</span>
          <MerchOrderStatusBadge status={order.status} />
        </div>
        <p className="mt-3 break-all text-xs text-white/40">#{order.id}</p>
        <div className="my-6 space-y-3 border-y border-white/15 py-5 text-sm">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 text-white/65">
              <span className="min-w-0">
                {item.productName}
                {item.variantLabel && <span className="block text-xs text-white/40">{item.variantLabel}</span>}
                <span className="block text-xs text-white/40">× {item.quantity}</span>
              </span>
              <span className="shrink-0">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 text-sm text-white/65">
          <div className="flex justify-between gap-3">
            <span>Items</span>
            <span>{formatPrice(order.subtotalAmount)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Shipping{order.courierName ? ` (${order.courierName})` : ""}</span>
            <span>{formatPrice(order.shippingCost)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-white/45">Total</span>
          <strong className="text-2xl text-lime">{formatPrice(order.totalAmount)}</strong>
        </div>
        <p className="mt-5 border-t border-white/15 pt-4 text-xs text-white/40">
          {order.buyerName} · {order.buyerEmail}
        </p>
      </aside>
    </div>
  );
}
