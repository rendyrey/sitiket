"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DataTable, { type DataTableColumn } from "@/components/ui/data-table";
import { formatPrice } from "@/data/events";
import { deleteProductAction, setProductActiveAction } from "@/features/admin/lib/actions";
import type { Product } from "@/lib/api/types";
import { toAssetUrl } from "@/lib/public-env";

/**
 * The seller's product inventory table: stock, units sold, revenue, an
 * enable/disable toggle, and edit/delete. Deleting is a soft delete backend
 * -side — order history survives — but still confirms, since the product
 * leaves the store immediately.
 */
export default function MerchProductManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggleActive = async (product: Product) => {
    setError(null);
    setPending(product.id);
    const result = await setProductActiveAction(product.id, !product.isActive);
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? It disappears from the store; past orders keep their history.`)) return;
    setError(null);
    setPending(product.id);
    const result = await deleteProductAction(product.id);
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  const columns: DataTableColumn<Product>[] = [
    {
      key: "product",
      header: "Product",
      sortAccessor: (product) => product.name.toLowerCase(),
      searchAccessor: (product) => `${product.name} ${product.categoryName ?? ""}`,
      render: (product) => (
        <Link href={`/dashboard/admin/merch/${product.id}`} className="flex min-w-0 items-center gap-3">
          <span className="relative block h-11 w-11 shrink-0 overflow-hidden border-2 border-ink bg-paper">
            {product.thumbnailUrl ? (
              <Image src={toAssetUrl(product.thumbnailUrl)} alt="" fill sizes="44px" className="object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center text-sm font-black text-black/20">
                {product.name.charAt(0)}
              </span>
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-black uppercase">{product.name}</span>
            <span className="block truncate text-xs text-black/40">{product.categoryName ?? "—"}</span>
          </span>
        </Link>
      ),
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      sortAccessor: (product) => product.effectivePrice,
      render: (product) => (
        <span className="whitespace-nowrap">
          {formatPrice(product.effectivePrice)}
          {product.maxVariantPrice !== null && product.maxVariantPrice > product.effectivePrice && (
            <span className="text-black/40"> – {formatPrice(product.maxVariantPrice)}</span>
          )}
        </span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      sortAccessor: (product) => product.stockRemaining,
      render: (product) => (
        <span className={product.stockRemaining <= 0 ? "font-black text-red-600" : ""}>{product.stockRemaining}</span>
      ),
    },
    {
      key: "sold",
      header: "Sold",
      align: "right",
      sortAccessor: (product) => product.unitsSold ?? 0,
      render: (product) => product.unitsSold ?? 0,
    },
    {
      key: "revenue",
      header: "Revenue",
      align: "right",
      sortAccessor: (product) => product.revenue ?? 0,
      render: (product) => formatPrice(product.revenue ?? 0),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      sortAccessor: (product) => (product.isActive ? 0 : 1),
      render: (product) => (
        <button
          type="button"
          disabled={pending === product.id}
          onClick={() => void handleToggleActive(product)}
          className={`button ${product.isActive ? "button-lime" : "button-dark"} disabled:opacity-50`}
          title={product.isActive ? "Live in the store — click to disable" : "Hidden from the store — click to enable"}
        >
          {product.isActive ? "Active" : "Disabled"}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (product) => (
        <span className="flex items-center justify-end gap-3 whitespace-nowrap">
          <Link href={`/dashboard/admin/merch/${product.id}`} className="text-xs font-black uppercase text-link hover:underline">
            Edit
          </Link>
          <button
            type="button"
            disabled={pending === product.id}
            onClick={() => void handleDelete(product)}
            className="text-xs font-black uppercase text-red-600 hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={products}
        getRowKey={(product) => product.id}
        searchPlaceholder="Search products…"
        emptyMessage="No products yet — add your first item."
      />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
