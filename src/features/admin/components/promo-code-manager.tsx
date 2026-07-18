"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DataTable, { type DataTableColumn } from "@/components/ui/data-table";
import FormField from "@/components/ui/form-field";
import { createPromoCodeAction, updatePromoCodeAction } from "@/features/admin/lib/actions";
import type { DiscountType, PromoCode } from "@/lib/api/types";

export default function PromoCodeManager({ eventId, promoCodes }: { eventId: string; promoCodes: PromoCode[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [maxUses, setMaxUses] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!code.trim() || discountValue <= 0 || maxUses <= 0) {
      setError("Fill in a code, a positive discount value, and a positive usage limit.");
      return;
    }
    if (discountType === "percentage" && discountValue > 100) {
      setError("A percentage discount cannot exceed 100.");
      return;
    }
    setSubmitting(true);
    const result = await createPromoCodeAction(eventId, { code: code.trim(), discountType, discountValue, maxUses });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setCode("");
    setDiscountValue(0);
    setMaxUses(1);
    router.refresh();
  };

  const handleToggleActive = async (promoCode: PromoCode) => {
    await updatePromoCodeAction(eventId, promoCode.id, { isActive: !promoCode.isActive });
    router.refresh();
  };

  const columns: DataTableColumn<PromoCode>[] = [
    {
      key: "code",
      header: "Code",
      sortAccessor: (promoCode) => promoCode.code.toLowerCase(),
      searchAccessor: (promoCode) => promoCode.code,
      render: (promoCode) => <span className="font-black uppercase">{promoCode.code}</span>,
    },
    {
      key: "discount",
      header: "Discount",
      sortAccessor: (promoCode) => promoCode.discountValue,
      render: (promoCode) =>
        promoCode.discountType === "percentage" ? `${promoCode.discountValue}% off` : `Rp ${promoCode.discountValue} off`,
    },
    {
      key: "usage",
      header: "Usage",
      sortAccessor: (promoCode) => promoCode.usedCount / promoCode.maxUses,
      render: (promoCode) => `${promoCode.usedCount}/${promoCode.maxUses} used`,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      sortAccessor: (promoCode) => (promoCode.isActive ? 0 : 1),
      render: (promoCode) => (
        <button
          type="button"
          onClick={() => void handleToggleActive(promoCode)}
          className={`button ${promoCode.isActive ? "button-dark" : "button-lime"}`}
        >
          {promoCode.isActive ? "Active" : "Inactive"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {promoCodes.length === 0 ? (
        <p className="text-sm text-black/50">No promo codes yet — add one below.</p>
      ) : (
        <DataTable columns={columns} data={promoCodes} getRowKey={(promoCode) => promoCode.id} searchPlaceholder="Search promo codes…" />
      )}

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">Add promo code</span>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField
            label="Code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="EARLYBIRD10"
          />
          <label className="field-label">
            Discount type
            <select className="text-field mt-2" value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)}>
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed amount (IDR)</option>
            </select>
          </label>
          <FormField
            label={discountType === "percentage" ? "Discount (%)" : "Discount (IDR)"}
            name="discountValue"
            type="number"
            min={0}
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
          />
          <FormField
            label="Usage limit"
            name="maxUses"
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
          />
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="button" onClick={() => void handleCreate()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
          {submitting ? "Adding…" : "Add promo code"}
        </button>
      </div>
    </div>
  );
}
