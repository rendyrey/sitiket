"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import FormField from "@/components/ui/form-field";
import { normalizeImageForUpload } from "@/lib/image/normalize-image";
import type { PaymentMethod } from "@/lib/api/types";
import { submitPaymentProofAction } from "../lib/actions";

type PaymentProofFormProps = {
  guestEmail?: string;
  orderId: string;
  /** Which methods the instructions offered — the radio only shows when there's a real choice. */
  hasBankTransfer: boolean;
  hasQris: boolean;
};

export default function PaymentProofForm({ guestEmail, hasBankTransfer, hasQris, orderId }: PaymentProofFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [method, setMethod] = useState<PaymentMethod>(hasBankTransfer ? "bank_transfer" : "qris");
  const [transferNote, setTransferNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showMethodChoice = hasBankTransfer && hasQris;

  const handleSubmit = async () => {
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Attach a screenshot or photo of your payment receipt.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append("proof", await normalizeImageForUpload(file));
    formData.append("method", method);
    if (transferNote.trim()) formData.append("transferNote", transferNote.trim());
    if (guestEmail) formData.append("guestEmail", guestEmail);

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
      <span className="tag">Upload proof of payment</span>
      <div className="mt-5 space-y-4">
        {showMethodChoice && (
          <fieldset>
            <legend className="field-label">How did you pay?</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="radio"
                  name="method"
                  checked={method === "bank_transfer"}
                  onChange={() => setMethod("bank_transfer")}
                  className="border-black text-black focus:ring-lime"
                />
                Bank transfer
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="radio"
                  name="method"
                  checked={method === "qris"}
                  onChange={() => setMethod("qris")}
                  className="border-black text-black focus:ring-lime"
                />
                QRIS
              </label>
            </div>
          </fieldset>
        )}
        <label className="field-label">
          Payment receipt (photo or screenshot)
          <input ref={fileInputRef} type="file" accept="image/*" className="text-field h-auto py-3" />
        </label>
        <FormField
          label="Note (optional)"
          name="transferNote"
          placeholder={method === "qris" ? "E.g. paid via GoPay" : "E.g. transferred from BCA mobile banking"}
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
