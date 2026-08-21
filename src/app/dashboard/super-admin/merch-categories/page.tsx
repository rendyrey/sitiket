import type { Metadata } from "next";
import MerchCategoryManager from "@/features/super-admin/components/merch-category-manager";
import { listMerchCategoriesWithCounts } from "@/features/super-admin/lib/api";

export const metadata: Metadata = { title: "Merch categories" };

export default async function SuperAdminMerchCategoriesPage() {
  const categories = await listMerchCategoriesWithCounts();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">Merch categories</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        Sellers pick from these when listing products; buyers filter the store by them. A category can only be deleted
        while no products use it.
      </p>
      <div className="mt-8 max-w-3xl">
        <MerchCategoryManager items={categories} />
      </div>
    </div>
  );
}
