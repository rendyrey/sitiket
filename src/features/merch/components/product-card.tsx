import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "@/components/site/icons";
import { formatPrice } from "@/data/events";
import type { Product } from "@/lib/api/types";
import { toAssetUrl } from "@/lib/public-env";

/** Display price: a single price, or a "from" range when variants differ. */
export const productPriceLabel = (product: Product) =>
  product.maxVariantPrice !== null && product.maxVariantPrice > product.effectivePrice
    ? `${formatPrice(product.effectivePrice)} – ${formatPrice(product.maxVariantPrice)}`
    : formatPrice(product.effectivePrice);

export default function ProductCard({ product }: { product: Product }) {
  const detailUrl = `/merch/${product.slug}`;
  const soldOut = product.stockRemaining <= 0;

  return (
    <article className="group border-2 border-ink bg-white">
      <Link href={detailUrl} className="relative block aspect-square overflow-hidden border-b-2 border-ink bg-paper">
        {product.thumbnailUrl ? (
          <Image
            src={toAssetUrl(product.thumbnailUrl)}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-5xl font-black uppercase text-black/15">
            {product.name.charAt(0)}
          </span>
        )}
        {soldOut && (
          <span className="absolute left-0 top-3 bg-ink px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
            Sold out
          </span>
        )}
      </Link>
      <div className="p-4 sm:p-5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
          {product.categoryName ?? "Merch"}
        </span>
        <Link href={detailUrl}>
          <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-base font-extrabold uppercase leading-tight transition-colors group-hover:text-[#5c8500]">
            {product.name}
          </h3>
        </Link>
        {product.sellerName && (
          <p className="mt-1 truncate text-[11px] font-semibold text-black/45">by {product.sellerName}</p>
        )}
        <div className="mt-3 flex items-end justify-between gap-2 border-t border-black/10 pt-3">
          <div className="min-w-0">
            <strong className="block truncate text-sm text-black sm:text-base">{productPriceLabel(product)}</strong>
            {product.quantitySold > 0 && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-black/35">
                {product.quantitySold} sold
              </span>
            )}
          </div>
          <Link
            href={detailUrl}
            className="grid h-9 w-9 shrink-0 place-items-center bg-ink text-white transition-colors hover:bg-lime hover:text-black"
            aria-label={`View ${product.name}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
