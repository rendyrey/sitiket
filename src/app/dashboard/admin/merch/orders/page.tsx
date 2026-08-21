import type { Metadata } from "next";
import MerchOrdersManager from "@/features/admin/components/merch-orders-manager";

export const metadata: Metadata = { title: "Merch orders" };

export default function AdminMerchOrdersPage() {
  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Merch orders</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        Who&apos;s buying your merch, where to ship it, and the payment proofs waiting for your review. You also get an
        email whenever an order lands or a buyer confirms a payment.
      </p>
      <div className="mt-8">
        <MerchOrdersManager />
      </div>
    </div>
  );
}
