import type { Metadata } from "next";
import MerchPromoCodeManager from "@/features/admin/components/merch-promo-code-manager";
import { listMerchPromoCodes } from "@/features/admin/lib/api";

export const metadata: Metadata = { title: "Merch promo codes" };

export default async function AdminMerchPromoCodesPage() {
  const promoCodes = await listMerchPromoCodes();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Merch promo codes</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        Discount codes buyers can apply to your merch at checkout. A code discounts your store&apos;s items only — a
        multi-seller cart splits into one order per seller, so each seller&apos;s code is entered separately.
      </p>
      <div className="mt-8 max-w-3xl">
        <MerchPromoCodeManager promoCodes={promoCodes} />
      </div>
    </div>
  );
}
