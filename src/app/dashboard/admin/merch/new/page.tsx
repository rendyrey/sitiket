import type { Metadata } from "next";
import Link from "next/link";
import ProductForm from "@/features/admin/components/product-form";
import { listMerchCategories } from "@/features/merch/lib/api";
import { getMyShippingOrigin } from "@/features/shipping/lib/api";

export const metadata: Metadata = { title: "New product" };

export default async function AdminNewProductPage() {
  const [categories, shippingOrigin] = await Promise.all([listMerchCategories(), getMyShippingOrigin()]);

  // Hard prerequisite, enforced backend-side too (409 SHIPPING_ORIGIN_REQUIRED):
  // every checkout shipping quote is priced from the seller's departure address.
  if (!shippingOrigin) {
    return (
      <div>
        <h1 className="text-3xl font-black uppercase">New product</h1>
        <div className="mt-8 max-w-3xl border-2 border-ink bg-white p-5 sm:p-7">
          <span className="tag">Shipping address required</span>
          <p className="mt-4 text-sm leading-6 text-black/60">
            Before selling merch, set the departure address your packages ship from. Buyers&apos; shipping costs are
            calculated from it at checkout, so products can&apos;t be created without one.
          </p>
          <Link href="/dashboard/admin/shipping" className="button button-dark button-large mt-6 inline-flex">
            Set shipping address
          </Link>
        </div>
      </div>
    );
  }

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
