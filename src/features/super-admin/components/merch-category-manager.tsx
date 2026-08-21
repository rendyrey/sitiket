"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import DataTable, { type DataTableColumn } from "@/components/ui/data-table";
import FormField from "@/components/ui/form-field";
import {
  createMerchCategoryAction,
  deleteMerchCategoryAction,
  updateMerchCategoryAction,
} from "@/features/super-admin/lib/actions";
import type { MerchCategory } from "@/lib/api/types";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Merch taxonomy for sellers to categorize products under. Unlike the other
 * taxonomies this one shows a live product count per category and supports
 * deletion — guarded backend-side: a category still used by products
 * returns `CATEGORY_IN_USE` and is surfaced here as an error.
 */
export default function MerchCategoryManager({ items }: { items: MerchCategory[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    setSubmitting(true);
    const result = await createMerchCategoryAction({ name: name.trim(), slug: slugify(name), sortOrder: items.length });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setName("");
    router.refresh();
  };

  const handleToggleActive = async (item: MerchCategory) => {
    setPending(item.id);
    await updateMerchCategoryAction(item.id, { isActive: !item.isActive });
    setPending(null);
    router.refresh();
  };

  const handleDelete = async (item: MerchCategory) => {
    if (!window.confirm(`Delete "${item.name}"? Only possible while no products use it.`)) return;
    setError(null);
    setPending(item.id);
    const result = await deleteMerchCategoryAction(item.id);
    setPending(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  };

  const columns: DataTableColumn<MerchCategory>[] = [
    {
      key: "name",
      header: "Name",
      sortAccessor: (item) => item.name.toLowerCase(),
      searchAccessor: (item) => item.name,
      render: (item) => <span className="font-black uppercase">{item.name}</span>,
    },
    {
      key: "slug",
      header: "Slug",
      sortAccessor: (item) => item.slug,
      searchAccessor: (item) => item.slug,
      render: (item) => <span className="text-black/40">/{item.slug}</span>,
    },
    {
      key: "products",
      header: "Products",
      align: "right",
      sortAccessor: (item) => item.productCount ?? 0,
      render: (item) => <span className="font-bold tabular-nums">{item.productCount ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      sortAccessor: (item) => (item.isActive ? 0 : 1),
      render: (item) => (
        <button
          type="button"
          disabled={pending === item.id}
          onClick={() => void handleToggleActive(item)}
          className={`button ${item.isActive ? "button-dark" : "button-lime"} disabled:opacity-50`}
        >
          {item.isActive ? "Active" : "Inactive"}
        </button>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (item) => (
        <button
          type="button"
          disabled={pending === item.id || (item.productCount ?? 0) > 0}
          onClick={() => void handleDelete(item)}
          title={(item.productCount ?? 0) > 0 ? "Categories with products cannot be deleted" : "Delete category"}
          className="text-xs font-black uppercase text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-30"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={items}
        getRowKey={(item) => item.id}
        searchPlaceholder="Search categories…"
        emptyMessage="No merch categories yet — add one below."
      />

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">Add category</span>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormField wrapperClassName="flex-1" label="Name" name="categoryName" value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g. Apparel" />
          <button type="button" onClick={() => void handleCreate()} disabled={submitting} className="button button-dark disabled:opacity-50">
            {submitting ? "Adding…" : "Add"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </div>
  );
}
