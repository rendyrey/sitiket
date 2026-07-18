"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/data/events";
import { approveRefundAction, completeRefundAction, rejectRefundAction } from "@/features/admin/lib/actions";
import type { RefundRequest } from "@/lib/api/types";

export default function RefundsOverview({ refundRequests }: { refundRequests: RefundRequest[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    setPending(id);
    const result = await action();
    setPending(null);
    if (!result.ok) {
      setError(result.message ?? "Something went wrong.");
      return;
    }
    router.refresh();
  };

  if (refundRequests.length === 0) {
    return <p className="border-2 border-black/15 bg-white p-6 text-sm font-semibold text-black/50">No refund requests.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {refundRequests.map((refund) => (
        <div key={refund.id} className="border-2 border-ink bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Order #{refund.orderId}</p>
              {refund.totalAmount !== undefined && <p className="text-xs text-black/40">{formatPrice(refund.totalAmount)}</p>}
            </div>
            <span className="text-xs font-black uppercase">{refund.status}</span>
          </div>
          <p className="mt-2 text-xs text-black/60">{refund.reason}</p>
          <div className="mt-3 flex gap-2">
            {refund.status === "requested" && (
              <>
                <button
                  type="button"
                  disabled={pending === refund.id}
                  onClick={() => void run(refund.id, () => approveRefundAction(refund.id))}
                  className="button button-lime"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={pending === refund.id}
                  onClick={() => void run(refund.id, () => rejectRefundAction(refund.id))}
                  className="button button-dark"
                >
                  Reject
                </button>
              </>
            )}
            {refund.status === "approved" && (
              <button
                type="button"
                disabled={pending === refund.id}
                onClick={() => void run(refund.id, () => completeRefundAction(refund.id))}
                className="button button-dark"
              >
                Mark money sent
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
