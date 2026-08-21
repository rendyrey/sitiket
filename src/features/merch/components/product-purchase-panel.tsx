"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAtom } from "jotai";
import { formatPrice } from "@/data/events";
import type { ProductDetail, ProductVariant } from "@/lib/api/types";
import { addCartItem, cartAtom } from "../lib/cart";
import { productPriceLabel } from "./product-card";

const variantStockRemaining = (variant: ProductVariant) => Math.max(variant.stock - variant.quantitySold, 0);

/**
 * The buy box: pick one option per group (Shopee-style chips), see the
 * matched combination's own price/stock, choose a quantity, then add to
 * cart or buy now. Option values that can never lead to an in-stock active
 * variant (given the other selections) are disabled.
 */
export default function ProductPurchasePanel({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const [, setCart] = useAtom(cartAtom);
  const [selected, setSelected] = useState<Record<string, string>>({}); // groupId -> optionId
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const hasGroups = product.groups.length > 0;
  const allChosen = product.groups.every((group) => selected[group.id]);

  const matchedVariant = allChosen
    ? product.variants.find(
        (variant) =>
          variant.optionIds.length === product.groups.length &&
          product.groups.every((group) => variant.optionIds.includes(selected[group.id])),
      )
    : undefined;

  /** Could picking this option (keeping other groups' picks) still reach a sellable variant? */
  const optionIsAvailable = (groupId: string, optionId: string) =>
    product.variants.some(
      (variant) =>
        variant.isActive &&
        variantStockRemaining(variant) > 0 &&
        variant.optionIds.includes(optionId) &&
        product.groups.every(
          (group) => group.id === groupId || !selected[group.id] || variant.optionIds.includes(selected[group.id]),
        ),
    );

  const stockLeft = hasGroups
    ? matchedVariant
      ? matchedVariant.isActive
        ? variantStockRemaining(matchedVariant)
        : 0
      : null
    : product.stockRemaining;
  const unitPrice = matchedVariant ? matchedVariant.price : product.effectivePrice;
  const canBuy = hasGroups ? Boolean(matchedVariant) && (stockLeft ?? 0) > 0 : product.stockRemaining > 0;
  const boundedQuantity = Math.min(quantity, Math.max(stockLeft ?? 1, 1));

  const toggleOption = (groupId: string, optionId: string) => {
    setFeedback(null);
    setSelected((current) => ({ ...current, [groupId]: current[groupId] === optionId ? "" : optionId }));
    setQuantity(1);
  };

  const addToCart = () => {
    if (hasGroups && !matchedVariant) {
      setFeedback("Choose an option from every group first.");
      return false;
    }
    if (!canBuy) {
      setFeedback("This item is out of stock.");
      return false;
    }
    setCart((items) =>
      addCartItem(items, {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variantId: matchedVariant?.id,
        variantLabel: matchedVariant?.label,
        unitPrice,
        quantity: boundedQuantity,
        imageUrl: product.images[0]?.imageUrl ?? null,
        sellerId: product.ownerId,
        sellerName: product.sellerName ?? "SiTIKET seller",
        maxQuantity: stockLeft ?? 1,
      }),
    );
    return true;
  };

  const handleAddToCart = () => {
    if (addToCart()) setFeedback("added");
  };

  const handleBuyNow = () => {
    if (addToCart()) router.push("/cart");
  };

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <div className="flex items-baseline justify-between gap-3">
        <strong className="text-2xl font-black sm:text-3xl">
          {matchedVariant ? formatPrice(matchedVariant.price) : productPriceLabel(product)}
        </strong>
        {stockLeft !== null && (
          <span className={`text-xs font-bold uppercase tracking-widest ${stockLeft > 0 ? "text-black/40" : "text-red-600"}`}>
            {stockLeft > 0 ? `${stockLeft} in stock` : "Out of stock"}
          </span>
        )}
      </div>

      {product.groups.map((group) => (
        <fieldset key={group.id} className="mt-5">
          <legend className="field-label">{group.name}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.options.map((option) => {
              const isSelected = selected[group.id] === option.id;
              const available = optionIsAvailable(group.id, option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleOption(group.id, option.id)}
                  disabled={!available && !isSelected}
                  aria-pressed={isSelected}
                  className={`filter-chip ${isSelected ? "filter-chip-active" : ""} disabled:cursor-not-allowed disabled:opacity-30`}
                >
                  {option.value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="mt-5">
        <span className="field-label">Quantity</span>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="quantity-button"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-[2ch] text-center text-lg font-black tabular-nums" aria-live="polite">
            {boundedQuantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min((stockLeft ?? 99) || 1, value + 1))}
            className="quantity-button"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {feedback === "added" ? (
        <p className="mt-4 text-sm font-bold text-[#5c8500]">
          Added to cart ✓{" "}
          <Link href="/cart" className="text-link">
            View cart
          </Link>
        </p>
      ) : (
        feedback && <p className="mt-4 text-sm font-semibold text-red-600">{feedback}</p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={handleAddToCart} disabled={!canBuy} className="button button-outline button-large disabled:opacity-40">
          Add to cart
        </button>
        <button type="button" onClick={handleBuyNow} disabled={!canBuy} className="button button-lime button-large disabled:opacity-40">
          Buy now
        </button>
      </div>

      <p className="mt-5 border-t border-black/10 pt-4 text-xs text-black/45">
        Sold and shipped by <strong className="text-black/70">{product.sellerName}</strong>. Payment is a direct
        transfer to the seller, verified manually.
      </p>
    </div>
  );
}
