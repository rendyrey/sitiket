import { formatPrice } from "@/data/events";
import type { Order, PaymentInstructions } from "@/lib/api/types";
import BankTransferInstructions from "./bank-transfer-instructions";
import GuestOtpForm from "./guest-otp-form";
import OrderStatusBadge from "./order-status-badge";
import PaymentProofForm from "./payment-proof-form";
import RefundRequestPanel from "./refund-request-panel";
import TicketsList from "./tickets-list";

type OrderStatusViewProps = {
  guestEmail?: string;
  isGuest: boolean;
  order: Order;
  paymentInstructions: PaymentInstructions | null;
};

export default function OrderStatusView({ guestEmail, isGuest, order, paymentInstructions }: OrderStatusViewProps) {
  const needsGuestVerification = isGuest && !order.guestEmailVerifiedAt;
  const canSubmitProof = !needsGuestVerification && ["pending_payment", "awaiting_verification"].includes(order.status);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {order.status === "pending_payment" && needsGuestVerification && <GuestOtpForm orderId={order.id} />}

        {order.status === "pending_payment" && !needsGuestVerification && (
          <>
            {paymentInstructions ? (
              <BankTransferInstructions instructions={paymentInstructions} />
            ) : (
              <p className="border-2 border-red-500/60 bg-red-500/5 p-5 text-sm font-semibold text-red-700">
                The organizer hasn&apos;t set up a payout account yet — please check back shortly or contact them
                directly.
              </p>
            )}
            {paymentInstructions && <PaymentProofForm orderId={order.id} guestEmail={guestEmail} />}
          </>
        )}

        {order.status === "awaiting_verification" && (
          <div className="border-2 border-ink bg-white p-5 sm:p-7">
            <span className="tag">Reviewing your payment</span>
            <p className="mt-4 text-sm text-black/60">
              Your proof of transfer has been submitted. The organizer is reviewing it — this page updates once
              they&apos;ve confirmed.
            </p>
          </div>
        )}

        {(order.status === "paid" || order.status === "refund_requested" || order.status === "refunded") && (
          <div>
            <h2 className="text-xl font-black uppercase">Your tickets</h2>
            <div className="mt-4">
              <TicketsList tickets={order.tickets ?? []} />
            </div>
          </div>
        )}

        {order.status === "paid" && <RefundRequestPanel orderId={order.id} guestEmail={guestEmail} />}
        {order.status === "refund_requested" && (
          <p className="border-2 border-ink bg-paper p-5 text-sm font-semibold">
            Refund requested — the organizer is reviewing it.
          </p>
        )}
        {order.status === "refund_rejected" && (
          <p className="border-2 border-ink bg-paper p-5 text-sm font-semibold">
            The organizer declined this refund request.
          </p>
        )}

        {order.status === "expired" && (
          <p className="border-2 border-ink bg-paper p-5 text-sm font-semibold">
            This order&apos;s payment window expired before a proof of transfer was submitted.
          </p>
        )}
        {order.status === "cancelled" && (
          <p className="border-2 border-ink bg-paper p-5 text-sm font-semibold">This order was cancelled.</p>
        )}

        {!canSubmitProof && order.status === "pending_payment" && needsGuestVerification && (
          <p className="text-xs text-black/40">
            Didn&apos;t get a code? Check your spam folder — codes expire after a short window.
          </p>
        )}
      </div>

      <aside className="h-fit border-2 border-ink bg-ink p-5 text-white xs:p-7 lg:sticky lg:top-32">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-lime">Order</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-3 break-all text-xs text-white/40">#{order.id}</p>
        <div className="my-6 space-y-2 border-y border-white/15 py-5 text-sm">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 text-white/65">
              <span>Ticket × {item.quantity}</span>
              <span>{formatPrice(item.subtotal)}</span>
            </div>
          ))}
        </div>
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-sm text-lime">
            <span>Discount</span>
            <span>-{formatPrice(order.discountAmount)}</span>
          </div>
        )}
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
