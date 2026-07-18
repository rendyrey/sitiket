"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPrice } from "@/data/events";
import FormField from "@/components/ui/form-field";
import { createTicketTypeAction, updateTicketTypeAction } from "@/features/admin/lib/actions";
import type { TaxonomyItem, TicketType } from "@/lib/api/types";

type TicketTypeManagerProps = {
  categories: TaxonomyItem[];
  eventId: string;
  ticketTypes: TicketType[];
};

export default function TicketTypeManager({ categories, eventId, ticketTypes }: TicketTypeManagerProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [price, setPrice] = useState(0);
  const [quantityTotal, setQuantityTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim() || !categoryId || price < 0 || quantityTotal <= 0) {
      setError("Fill in a name, category, price, and quantity greater than 0.");
      return;
    }
    setSubmitting(true);
    const result = await createTicketTypeAction(eventId, { name: name.trim(), categoryId, price, quantityTotal });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setName("");
    setPrice(0);
    setQuantityTotal(0);
    router.refresh();
  };

  const handleToggleActive = async (ticketType: TicketType) => {
    await updateTicketTypeAction(eventId, ticketType.id, { isActive: !ticketType.isActive });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {ticketTypes.length === 0 && <p className="text-sm text-black/50">No ticket types yet — add one below.</p>}
        {ticketTypes.map((ticketType) => (
          <div key={ticketType.id} className="flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-white p-4">
            <div className="min-w-0">
              <p className="font-black uppercase">{ticketType.name}</p>
              <p className="text-xs text-black/40">
                {categories.find((category) => category.id === ticketType.categoryId)?.name ?? "Uncategorized"} ·{" "}
                {formatPrice(ticketType.price)} · {ticketType.quantitySold}/{ticketType.quantityTotal} sold
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleToggleActive(ticketType)}
              className={`button ${ticketType.isActive ? "button-dark" : "button-lime"}`}
            >
              {ticketType.isActive ? "Active" : "Inactive"}
            </button>
          </div>
        ))}
      </div>

      <div className="border-2 border-ink bg-white p-5 sm:p-7">
        <span className="tag">Add ticket type</span>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField label="Name" name="ticketTypeName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Early Bird" />
          <label className="field-label">
            Category
            <select className="text-field mt-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <FormField
            label="Price (IDR)"
            name="price"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
          <FormField
            label="Quantity"
            name="quantityTotal"
            type="number"
            min={1}
            value={quantityTotal}
            onChange={(e) => setQuantityTotal(Number(e.target.value))}
          />
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="button" onClick={() => void handleCreate()} disabled={submitting} className="button button-dark mt-5 disabled:opacity-50">
          {submitting ? "Adding…" : "Add ticket type"}
        </button>
      </div>
    </div>
  );
}
