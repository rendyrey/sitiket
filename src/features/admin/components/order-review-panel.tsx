"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/data/events";
import {
  approvePaymentAction,
  approveRefundAction,
  completeRefundAction,
  rejectPaymentAction,
  rejectRefundAction,
} from "@/features/admin/lib/actions";
import { OrderStatusBadge } from "@/features/orders/components";
import type { Order, OrderPayment, RefundRequest } from "@/lib/api/types";
import { toAssetUrl } from "@/lib/public-env";

export type OrderWithReview = {
  order: Order;
  payments: OrderPayment[];
  refundRequests: RefundRequest[];
};

export default function OrderReviewPanel({ orders }: { orders: OrderWithReview[] }) {
  if (orders.length === 0) {
    return <p className="border-2 border-black/15 bg-white p-6 text-sm font-semibold text-black/50">No orders yet.</p>;
  }

  return (
    <div className="space-y-5">
      {orders.map(({ order, payments, refundRequests }) => (
        <OrderCard key={order.id} order={order} payments={payments} refundRequests={refundRequests} />
      ))}
    </div>
  );
}

function OrderCard({ order, payments, refundRequests }: OrderWithReview) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    setPending(true);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      setError(result.message ?? "Something went wrong.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="border-2 border-ink bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-black uppercase">{order.buyerName}</p>
          <p className="text-xs text-black/40">
            {order.buyerEmail} · {formatPrice(order.totalAmount)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {payments.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-black/10 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Payment proofs</span>
          {payments.map((payment) => (
            <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 bg-paper p-3">
              <a href={toAssetUrl(payment.proofImageUrl)} target="_blank" rel="noreferrer" className="text-link text-xs">
                View proof
              </a>
              <span className="text-xs font-bold uppercase">{payment.status}</span>
              {payment.status === "pending_review" && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void run(() => approvePaymentAction(payment.id))}
                    className="button button-lime"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void run(() => rejectPaymentAction(payment.id))}
                    className="button button-dark"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {refundRequests.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-black/10 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Refund requests</span>
          {refundRequests.map((refund) => (
            <div key={refund.id} className="bg-paper p-3">
              <p className="text-xs">{refund.reason}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase">{refund.status}</span>
                <div className="flex gap-2">
                  {refund.status === "requested" && (
                    <>
                      <button type="button" disabled={pending} onClick={() => void run(() => approveRefundAction(refund.id))} className="button button-lime">
                        Approve
                      </button>
                      <button type="button" disabled={pending} onClick={() => void run(() => rejectRefundAction(refund.id))} className="button button-dark">
                        Reject
                      </button>
                    </>
                  )}
                  {refund.status === "approved" && (
                    <button type="button" disabled={pending} onClick={() => void run(() => completeRefundAction(refund.id))} className="button button-dark">
                      Mark money sent
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
