"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FormField from "@/components/ui/form-field";
import { createProductAction, updateProductAction } from "@/features/admin/lib/actions";
import type { MerchCategory, Product } from "@/lib/api/types";

type ProductFormProps = {
  categories: MerchCategory[];
  /** Present in edit mode; absent when creating. */
  product?: Product;
};

/**
 * Create/edit the product's core fields. Base price/stock apply while the
 * product has no variants — once variants exist (managed on the edit page),
 * each combination carries its own price/stock.
 */
export default function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSaved(false);
    if (!name.trim() || !description.trim() || !categoryId) {
      setError("Name, category, and description are required.");
      return;
    }
    const priceValue = Number(price);
    const stockValue = Number(stock || 0);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setError("Enter a valid price in whole Rupiah.");
      return;
    }

    setSubmitting(true);
    const input = {
      categoryId,
      name: name.trim(),
      description: description.trim(),
      price: Math.floor(priceValue),
      stock: Math.max(0, Math.floor(stockValue)),
    };
    const result = product ? await updateProductAction(product.id, input) : await createProductAction(input);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (!product) {
      // Land on the edit page so photos + variants can be added next.
      router.push(`/dashboard/admin/merch/${(result.data as Product).id}`);
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <span className="tag">{product ? "Product details" : "New product"}</span>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FormField
          label="Name"
          name="productName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="E.g. Bandung Noise Fest Tee"
          wrapperClassName="sm:col-span-2"
        />
        <label className="field-label">
          Category
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="text-field">
            {categories.length === 0 && <option value="">No categories yet — ask a super admin</option>}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Base price (Rp)"
            name="price"
            type="number"
            min={0}
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="150000"
          />
          <FormField
            label="Base stock"
            name="stock"
            type="number"
            min={0}
            inputMode="numeric"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            placeholder="20"
          />
        </div>
        <label className="field-label sm:col-span-2">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            placeholder="Material, sizing notes, what makes it special…"
            className="text-field h-auto py-3"
          />
        </label>
      </div>
      <p className="mt-4 text-xs text-black/45">
        Base price/stock sell as-is. Add options (color, size, …) on the product page and each combination gets its
        own price and stock instead.
      </p>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-sm font-bold text-[#5c8500]">Saved ✓</p>}
      <button type="button" onClick={() => void handleSubmit()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
        {submitting ? "Saving…" : product ? "Save changes" : "Create product"}
      </button>
    </div>
  );
}
