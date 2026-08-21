"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/api/types";
import { toAssetUrl } from "@/lib/public-env";

/**
 * Shopee/Tokopedia-style gallery: one big slide plus a thumbnail strip
 * (up to 10 photos). Arrows + thumbnails are buttons, so the slider is fully
 * keyboard operable.
 */
export default function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="grid aspect-square place-items-center border-2 border-ink bg-white text-7xl font-black uppercase text-black/10">
        {productName.charAt(0)}
      </div>
    );
  }

  const active = images[Math.min(index, images.length - 1)];
  const goTo = (next: number) => setIndex((next + images.length) % images.length);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden border-2 border-ink bg-white">
        <Image
          key={active.id}
          src={toAssetUrl(active.imageUrl)}
          alt={`${productName} — photo ${index + 1} of ${images.length}`}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain"
          priority
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center bg-ink/80 text-white transition-colors hover:bg-lime hover:text-black"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center bg-ink/80 text-white transition-colors hover:bg-lime hover:text-black"
              aria-label="Next photo"
            >
              ›
            </button>
            <span className="absolute bottom-2 right-2 bg-ink/80 px-2 py-1 text-[10px] font-bold tabular-nums text-white">
              {index + 1}/{images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product photos">
          {images.map((image, thumbIndex) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={thumbIndex === index}
              aria-label={`Photo ${thumbIndex + 1}`}
              onClick={() => setIndex(thumbIndex)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden border-2 transition-colors ${
                thumbIndex === index ? "border-ink" : "border-black/15 opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={toAssetUrl(image.imageUrl)} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
