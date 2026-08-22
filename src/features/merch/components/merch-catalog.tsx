"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import FormField from "@/components/ui/form-field";
import SearchableSelect from "@/components/ui/searchable-select";
import type { ApiPageMeta, ListMerchCatalogQuery, MerchCatalogSort, MerchCategory, Product } from "@/lib/api/types";
import { loadMoreMerchAction } from "../lib/actions";
import ProductCard from "./product-card";

type MerchCatalogProps = {
  categories: MerchCategory[];
  /** Page 1, rendered server-side from the URL's filters. */
  initialProducts: Product[];
  initialMeta: ApiPageMeta;
  /** The filters page 1 was fetched with — later pages must repeat them. */
  filters: ListMerchCatalogQuery;
};

const filterHref = (filters: ListMerchCatalogQuery, patch: Partial<ListMerchCatalogQuery>) => {
  const merged = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (merged.search) params.set("search", merged.search);
  if (merged.category) params.set("category", merged.category);
  if (merged.minPrice !== undefined) params.set("minPrice", String(merged.minPrice));
  if (merged.maxPrice !== undefined) params.set("maxPrice", String(merged.maxPrice));
  if (merged.sortBy && merged.sortBy !== "newest") params.set("sortBy", merged.sortBy);
  const qs = params.toString();
  return qs ? `/merch?${qs}` : "/merch";
};

/**
 * The public merch storefront: search (typo-tolerant, relevance-ranked
 * server-side), category chips, price-range filter, and an infinitely
 * scrolling grid. Filter changes re-render page 1 server-side (URL-driven,
 * shareable); the sentinel below the grid pulls later pages through a
 * Server Action.
 */
export default function MerchCatalog({ categories, filters, initialMeta, initialProducts }: MerchCatalogProps) {
  const router = useRouter();

  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [minPriceInput, setMinPriceInput] = useState(filters.minPrice?.toString() ?? "");
  const [maxPriceInput, setMaxPriceInput] = useState(filters.maxPrice?.toString() ?? "");

  // Pages 2+ accumulate here; a server re-render (filters changed) resets them.
  const [extraProducts, setExtraProducts] = useState<Product[]>([]);
  const [loadedPages, setLoadedPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const filterKey = JSON.stringify([filters.search, filters.category, filters.minPrice, filters.maxPrice, filters.sortBy]);
  // "Adjust state during render" (the React-sanctioned reset-on-prop-change
  // pattern) instead of an effect, so there's no flash of stale pages.
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setExtraProducts([]);
    setLoadedPages(1);
  }

  // Debounced search -> URL, so the server re-runs page 1 with relevance ranking.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      if ((filters.search ?? "") !== searchInput.trim()) {
        router.replace(filterHref(filters, { search: searchInput.trim() || undefined }), { scroll: false });
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the input changes; `filters` is captured fresh enough via filterKey resets
  }, [searchInput]);

  const applyPriceFilter = () => {
    const minPrice = minPriceInput.trim() === "" ? undefined : Math.max(0, Number(minPriceInput));
    const maxPrice = maxPriceInput.trim() === "" ? undefined : Math.max(0, Number(maxPriceInput));
    router.replace(
      filterHref(filters, {
        minPrice: Number.isNaN(minPrice) ? undefined : minPrice,
        maxPrice: Number.isNaN(maxPrice) ? undefined : maxPrice,
      }),
      { scroll: false },
    );
  };

  const products = [...initialProducts, ...extraProducts];
  const hasMore = products.length < initialMeta.total;

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const result = await loadMoreMerchAction({ ...filters, page: loadedPages + 1 });
    setLoadingMore(false);
    if (!result.ok) return;
    setLoadedPages((page) => page + 1);
    setExtraProducts((existing) => {
      const seen = new Set([...initialProducts, ...existing].map((product) => product.id));
      return [...existing, ...result.data.products.filter((product) => !seen.has(product.id))];
    });
  }, [filters, hasMore, initialProducts, loadedPages, loadingMore]);

  // Infinite scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const activeCategoryName = categories.find((category) => category.slug === filters.category)?.name;

  return (
    <section className="site-container py-8 sm:py-12">
      {/* Search */}
      <div className="max-w-xl">
        <label className="field-label">
          Search merch
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tees, totes, stickers…"
            className="text-field"
          />
        </label>
      </div>

      {/* Category chips */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-3" aria-label="Filter merch by category">
        <Link href={filterHref(filters, { category: undefined })} className={`filter-chip ${!filters.category ? "filter-chip-active" : ""}`} scroll={false}>
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={filterHref(filters, { category: category.slug })}
            className={`filter-chip ${filters.category === category.slug ? "filter-chip-active" : ""}`}
            scroll={false}
          >
            {category.name}
          </Link>
        ))}
      </div>

      {/* Price range + sort */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <FormField
          label="Min price (Rp)"
          name="minPrice"
          type="number"
          min={0}
          inputMode="numeric"
          value={minPriceInput}
          onChange={(event) => setMinPriceInput(event.target.value)}
          wrapperClassName="w-36"
          placeholder="0"
        />
        <FormField
          label="Max price (Rp)"
          name="maxPrice"
          type="number"
          min={0}
          inputMode="numeric"
          value={maxPriceInput}
          onChange={(event) => setMaxPriceInput(event.target.value)}
          wrapperClassName="w-36"
          placeholder="500000"
        />
        <button type="button" onClick={applyPriceFilter} className="button button-dark">
          Apply
        </button>
        {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
          <Link href={filterHref(filters, { minPrice: undefined, maxPrice: undefined })} className="text-link" scroll={false}>
            Clear price
          </Link>
        )}
        <label className="field-label ml-auto w-44">
          Sort by
          <SearchableSelect
            value={filters.sortBy ?? "newest"}
            onChange={(value) => router.replace(filterHref(filters, { sortBy: value as MerchCatalogSort }), { scroll: false })}
            options={[
              { value: "newest", label: "Newest" },
              { value: "price_asc", label: "Price: low to high" },
              { value: "price_desc", label: "Price: high to low" },
            ]}
          />
        </label>
      </div>

      {/* Heading + count */}
      <div className="mb-8 mt-8 flex flex-col items-start gap-2 border-b border-black/15 pb-5 xs:flex-row xs:items-end xs:justify-between">
        <h2 className="text-2xl font-black uppercase sm:text-3xl">{activeCategoryName ?? "All merch"}</h2>
        <span className="text-xs font-bold uppercase tracking-widest text-black/40">
          {initialMeta.total} item{initialMeta.total === 1 ? "" : "s"}
        </span>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <p className="border-2 border-black/15 bg-white p-8 text-center text-sm font-semibold text-black/50">
          Nothing matches those filters yet — try a broader search.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel + manual fallback */}
      <div ref={sentinelRef} aria-hidden="true" />
      {hasMore && (
        <div className="mt-10 text-center">
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="button button-outline disabled:opacity-50">
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {loadingMore ? "Loading more merch" : `Showing ${products.length} of ${initialMeta.total} items`}
      </span>
    </section>
  );
}
