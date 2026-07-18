"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FormField from "@/components/ui/form-field";
import { verifyGuestOtpAction } from "../lib/actions";

export default function GuestOtpForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setSubmitting(true);
    const result = await verifyGuestOtpAction(orderId, code.trim());
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">Verify your email</span>
      <p className="mt-4 text-sm text-black/60">
        We sent a 6-digit code to your email. Enter it below to unlock payment — this confirms your ticket goes to a
        real inbox.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <FormField
          label="Verification code"
          name="otp"
          inputMode="numeric"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          wrapperClassName="flex-1"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="button button-dark button-large disabled:opacity-50"
        >
          {submitting ? "Verifying…" : "Verify"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
