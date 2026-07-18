"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FormField from "@/components/ui/form-field";
import { createTaxonomyAction, updateTaxonomyAction, type TaxonomyResource } from "@/features/super-admin/lib/actions";
import type { TaxonomyItem } from "@/lib/api/types";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function TaxonomyManager({ items, resource }: { items: TaxonomyItem[]; resource: TaxonomyResource }) {
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
    const result = await createTaxonomyAction(resource, { name: name.trim(), slug: slugify(name), sortOrder: items.length });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setName("");
    router.refresh();
  };

  const handleToggleActive = async (item: TaxonomyItem) => {
    setPending(item.id);
    await updateTaxonomyAction(resource, item.id, { isActive: !item.isActive });
    setPending(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-white p-4">
            <div>
              <p className="font-black uppercase">{item.name}</p>
              <p className="text-xs text-black/40">/{item.slug}</p>
            </div>
            <button
              type="button"
              disabled={pending === item.id}
              onClick={() => void handleToggleActive(item)}
              className={`button ${item.isActive ? "button-dark" : "button-lime"} disabled:opacity-50`}
            >
              {item.isActive ? "Active" : "Inactive"}
            </button>
          </div>
        ))}
      </div>

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">Add category</span>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <FormField wrapperClassName="flex-1" label="Name" name="categoryName" value={name} onChange={(e) => setName(e.target.value)} placeholder="E.g. Theatre" />
          <button type="button" onClick={() => void handleCreate()} disabled={submitting} className="button button-dark disabled:opacity-50">
            {submitting ? "Adding…" : "Add"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </div>
  );
}
