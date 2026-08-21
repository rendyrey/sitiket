import type { Metadata } from "next";
import ActionLink from "@/components/ui/action-link";
import MerchProductManager from "@/features/admin/components/merch-product-manager";
import { listMyProducts } from "@/features/admin/lib/api";

export const metadata: Metadata = { title: "Merch" };

export default async function AdminMerchPage() {
  const products = await listMyProducts();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase">Merch</h1>
          <p className="mt-2 max-w-xl text-sm text-black/50">
            Your products in the public merch store — stock, sales, and visibility. Disabled products keep their data
            but disappear from the store.
          </p>
        </div>
        <ActionLink href="/dashboard/admin/merch/new" variant="lime">
          + New product
        </ActionLink>
      </div>
      <div className="mt-8">
        <MerchProductManager products={products} />
      </div>
    </div>
  );
}
