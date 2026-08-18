"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import FormField from "@/components/ui/form-field";
import { removeQrisConfigAction, saveQrisConfigAction } from "@/features/admin/lib/actions";
import type { QrisConfig } from "@/lib/api/types";
import { toAssetUrl } from "@/lib/public-env";

export default function QrisConfigManager({ config }: { config: QrisConfig | null }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [merchantName, setMerchantName] = useState(config?.merchantName ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!merchantName.trim()) {
      setError("Enter the merchant name shown on your QRIS.");
      return;
    }
    if (!file && !config) {
      setError("Upload your QRIS code image.");
      return;
    }

    const formData = new FormData();
    formData.append("merchantName", merchantName.trim());
    if (file) formData.append("qrisImage", file);

    setSubmitting(true);
    const result = await saveQrisConfigAction(formData);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success("QRIS code saved.");
    router.refresh();
  };

  const handleRemove = async () => {
    setError(null);
    setRemoving(true);
    const result = await removeQrisConfigAction();
    setRemoving(false);
    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    toast.success("QRIS code removed.");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {config ? (
        <div className="border-2 border-ink bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="tag">Your QRIS code</span>
              <p className="mt-3 text-sm font-bold">{config.merchantName}</p>
              <p className="mt-1 text-xs text-black/45">
                Buyers of your QRIS-enabled events scan this code to pay, then upload their payment proof as usual.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleRemove()}
              disabled={removing}
              className="text-xs font-black uppercase text-red-600 hover:underline disabled:opacity-50"
            >
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
          <div className="relative mt-5 aspect-square w-full max-w-[280px] border-2 border-black/10 bg-white">
            <Image src={toAssetUrl(config.qrisImageUrl)} alt={`QRIS code for ${config.merchantName}`} fill sizes="280px" className="object-contain" />
          </div>
        </div>
      ) : (
        <p className="border-2 border-ink bg-paper p-5 text-sm font-semibold">
          No QRIS code yet. Upload the static QRIS you exported from your bank or payment provider&apos;s merchant app —
          then enable QRIS on any of your events (event Details → Payout).
        </p>
      )}

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">{config ? "Replace QRIS" : "Set up QRIS"}</span>
        <div className="mt-5 space-y-4">
          <FormField
            required
            label="Merchant name *"
            name="merchantName"
            placeholder="As registered with your payment provider"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
          />
          <label className="field-label">
            QRIS code image (JPEG, PNG, or WEBP){config ? " — leave empty to keep the current one" : " *"}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="text-field h-auto py-3" />
          </label>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="button" onClick={() => void handleSave()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
          {submitting ? "Saving…" : "Save QRIS"}
        </button>
      </div>
    </div>
  );
}
