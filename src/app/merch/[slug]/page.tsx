import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery, ProductPurchasePanel } from "@/features/merch/components";
import { getMerchProduct } from "@/features/merch/lib/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getMerchProduct(slug);
  return { title: product ? product.name : "Merch" };
}

export default async function MerchProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getMerchProduct(slug);
  if (!product) notFound();

  return (
    <div className="bg-paper py-8 sm:py-12">
      <div className="site-container">
        <nav aria-label="Breadcrumb" className="text-xs font-bold uppercase tracking-widest text-black/40">
          <Link href="/merch" className="hover:text-black">
            Merch
          </Link>
          {product.categorySlug && (
            <>
              {" / "}
              <Link href={`/merch?category=${product.categorySlug}`} className="hover:text-black">
                {product.categoryName}
              </Link>
            </>
          )}
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_420px] lg:gap-12">
          <div className="min-w-0">
            <ProductGallery images={product.images} productName={product.name} />
            <div className="mt-8">
              <h2 className="text-lg font-black uppercase">Description</h2>
              <div className="prose-copy mt-3 whitespace-pre-line text-sm leading-6 text-black/65">
                {product.description}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <span className="tag">{product.categoryName ?? "Merch"}</span>
            <h1 className="mt-3 text-3xl font-black uppercase leading-tight sm:text-4xl">{product.name}</h1>
            {(product.sellerName || product.quantitySold > 0) && (
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-black/40">
                {[
                  product.sellerName && `Sold by ${product.sellerName}`,
                  product.quantitySold > 0 && `${product.quantitySold} sold`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div className="mt-6 lg:sticky lg:top-32">
              <ProductPurchasePanel product={product} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
