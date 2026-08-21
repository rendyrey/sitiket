import type { Metadata } from "next";
import ProductForm from "@/features/admin/components/product-form";
import { listMerchCategories } from "@/features/merch/lib/api";

export const metadata: Metadata = { title: "New product" };

export default async function AdminNewProductPage() {
  const categories = await listMerchCategories();

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">New product</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        Create the product first — photos and options (color, size, …) are added on the next screen.
      </p>
      <div className="mt-8 max-w-3xl">
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
