"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestRefundAction } from "../lib/actions";

export default function RefundRequestPanel({ guestEmail, orderId }: { guestEmail?: string; orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (reason.trim().length < 5) {
      setError("Tell the organizer why you're requesting a refund (at least 5 characters).");
      return;
    }
    setSubmitting(true);
    const result = await requestRefundAction(orderId, { reason: reason.trim(), guestEmail });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-link">
        Request a refund
      </button>
    );
  }

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">Request a refund</span>
      <p className="mt-4 text-xs leading-5 text-black/45">
        Refunds are reviewed and paid back manually by the organizer — see the status on this page for updates.
      </p>
      <label className="field-label mt-5 block">
        Reason
        <textarea
          className="text-field mt-2 h-28 py-3"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Why are you requesting a refund?"
        />
      </label>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="button button-dark disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-black uppercase tracking-wide text-black/50 hover:text-black">
          Cancel
        </button>
      </div>
    </div>
  );
}
