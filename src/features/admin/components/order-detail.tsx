"use client";

import { useState } from "react";
import {
  approvePaymentAction,
  approveRefundAction,
  completeRefundAction,
  rejectPaymentAction,
  rejectRefundAction,
} from "@/features/admin/lib/actions";
import type { OrderPayment, RefundRequest } from "@/lib/api/types";
import { toAssetUrl } from "@/lib/public-env";

type OrderDetailProps = {
  payments: OrderPayment[];
  refundRequests: RefundRequest[];
  /** Called after any approve/reject/complete succeeds, so the parent table can refresh the row's status + this panel's data. */
  onChanged: () => void;
};

/**
 * Inline review panel rendered inside an expanded orders-table row — payment
 * proof thumbnails and refund requests, with approve/reject/complete actions
 * right there (no navigating to another page).
 */
export default function OrderDetail({ payments, refundRequests, onChanged }: OrderDetailProps) {
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
    onChanged();
  };

  if (payments.length === 0 && refundRequests.length === 0) {
    return <p className="p-4 text-xs font-semibold text-black/40">No payment proofs or refund requests for this order yet.</p>;
  }

  return (
    <div className="space-y-4 bg-paper p-4">
      {payments.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Payment proofs</span>
          {payments.map((payment) => (
            <div key={payment.id} className="flex flex-wrap items-center gap-4 border-2 border-black/10 bg-white p-3">
              <a href={toAssetUrl(payment.proofImageUrl)} target="_blank" rel="noreferrer" className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- payment proofs are user-uploaded originals, not app assets to optimize */}
                <img
                  src={toAssetUrl(payment.proofImageUrl)}
                  alt="Payment proof"
                  className="h-20 w-20 border-2 border-ink object-cover"
                />
              </a>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold uppercase">{payment.status}</span>
                {payment.transferNote && <p className="mt-1 truncate text-xs text-black/50">{payment.transferNote}</p>}
              </div>
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
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">Refund requests</span>
          {refundRequests.map((refund) => (
            <div key={refund.id} className="border-2 border-black/10 bg-white p-3">
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

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
