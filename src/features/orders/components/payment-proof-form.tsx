"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import FormField from "@/components/ui/form-field";
import { submitPaymentProofAction } from "../lib/actions";

export default function PaymentProofForm({ guestEmail, orderId }: { guestEmail?: string; orderId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transferNote, setTransferNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Attach a screenshot or photo of your transfer receipt.");
      return;
    }

    const formData = new FormData();
    formData.append("proof", file);
    if (transferNote.trim()) formData.append("transferNote", transferNote.trim());
    if (guestEmail) formData.append("guestEmail", guestEmail);

    setSubmitting(true);
    const result = await submitPaymentProofAction(orderId, formData);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">Upload proof of transfer</span>
      <div className="mt-5 space-y-4">
        <label className="field-label">
          Transfer receipt (JPEG, PNG, or WEBP)
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="text-field h-auto py-3" />
        </label>
        <FormField
          label="Note (optional)"
          name="transferNote"
          placeholder="E.g. transferred from BCA mobile banking"
          value={transferNote}
          onChange={(event) => setTransferNote(event.target.value)}
        />
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={submitting}
        className="button button-dark button-large mt-5 w-full disabled:opacity-50"
      >
        {submitting ? "Uploading…" : "Submit proof"}
      </button>
    </div>
  );
}
