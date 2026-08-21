import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductForm from "@/features/admin/components/product-form";
import ProductImageManager from "@/features/admin/components/product-image-manager";
import VariantBuilder from "@/features/admin/components/variant-builder";
import { getMyProduct } from "@/features/admin/lib/api";
import { listMerchCategories } from "@/features/merch/lib/api";
import { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Edit product" };

export default async function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let product;
  try {
    product = await getMyProduct(id);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) notFound();
    throw error;
  }
  const categories = await listMerchCategories();

  return (
    <div>
      <Link href="/dashboard/admin/merch" className="text-xs font-bold uppercase tracking-widest text-black/40 hover:text-black">
        ← All products
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black uppercase">{product.name}</h1>
        <Link href={`/merch/${product.slug}`} className="text-link text-xs">
          View in store ↗
        </Link>
      </div>
      <div className="mt-8 max-w-3xl space-y-8">
        <ProductForm categories={categories} product={product} />
        <ProductImageManager productId={product.id} images={product.images} />
        <VariantBuilder product={product} />
      </div>
    </div>
  );
}
