import type { Metadata } from "next";
import { MerchCatalog } from "@/features/merch/components";
import { listMerchCatalog, listMerchCategories } from "@/features/merch/lib/api";
import type { ListMerchCatalogQuery, MerchCatalogSort } from "@/lib/api/types";

export const metadata: Metadata = { title: "Merch" };

const parsePrice = (value: string | undefined) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
};

export default async function MerchPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; minPrice?: string; maxPrice?: string; sortBy?: string }>;
}) {
  const params = await searchParams;
  const filters: ListMerchCatalogQuery = {
    search: params.search || undefined,
    category: params.category || undefined,
    minPrice: parsePrice(params.minPrice),
    maxPrice: parsePrice(params.maxPrice),
    sortBy: ["newest", "price_asc", "price_desc"].includes(params.sortBy ?? "")
      ? (params.sortBy as MerchCatalogSort)
      : undefined,
  };

  const [{ products, meta }, categories] = await Promise.all([listMerchCatalog(filters), listMerchCategories()]);

  return (
    <div className="bg-paper">
      <section className="border-b-4 border-ink bg-ink py-12 text-white sm:py-16">
        <div className="site-container">
          <span className="section-index text-lime">OFFICIAL MERCH</span>
          <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl sm:text-6xl">
            Wear the <span className="text-lime">scene.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-white/55 sm:text-base">
            Merch from the organizers behind your favorite events — tees, totes, and more, shipped straight from the
            people who made the night happen.
          </p>
        </div>
      </section>
      <MerchCatalog categories={categories} filters={filters} initialMeta={meta} initialProducts={products} />
    </div>
  );
}
