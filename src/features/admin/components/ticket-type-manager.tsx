"use client";

import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { formatPrice } from "@/data/events";
import DataTable, { type DataTableColumn } from "@/components/ui/data-table";
import FormField from "@/components/ui/form-field";
import SearchableSelect from "@/components/ui/searchable-select";
import { createTicketTypeAction, updateTicketTypeAction } from "@/features/admin/lib/actions";
import { getSalesStatus, type SalesStatus } from "@/lib/tickets/sales-window";
import type { TaxonomyItem, TicketType } from "@/lib/api/types";

type TicketTypeManagerProps = {
  categories: TaxonomyItem[];
  eventId: string;
  eventStartAt: string;
  eventEndAt: string;
  ticketTypes: TicketType[];
};

const DATETIME_DISPLAY = "D MMM YYYY, HH:mm";

/** ISO (UTC, from the API) → the local value a datetime-local input expects. */
const isoToLocalInput = (iso: string | null) => (iso ? dayjs(iso).format("YYYY-MM-DDTHH:mm") : "");
/** datetime-local (local time) → UTC ISO for the API, or null when blank. */
const localInputToIso = (local: string) => (local ? dayjs(local).toISOString() : null);

const STATUS_BADGE: Record<SalesStatus, { label: string; className: string }> = {
  on_sale: { label: "On sale", className: "bg-lime text-ink" },
  scheduled: { label: "Scheduled", className: "bg-ink text-white" },
  ended: { label: "Sales ended", className: "bg-red-100 text-red-700 border border-red-300" },
};

export default function TicketTypeManager({ categories, eventId, eventStartAt, eventEndAt, ticketTypes }: TicketTypeManagerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [price, setPrice] = useState(0);
  const [quantityTotal, setQuantityTotal] = useState(0);
  const [saleStart, setSaleStart] = useState("");
  const [saleEnd, setSaleEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setCategoryId(categories[0]?.id ?? "");
    setPrice(0);
    setQuantityTotal(0);
    setSaleStart("");
    setSaleEnd("");
    setError(null);
  };

  const startEdit = (ticketType: TicketType) => {
    setEditingId(ticketType.id);
    setName(ticketType.name);
    setCategoryId(ticketType.categoryId);
    setPrice(ticketType.price);
    setQuantityTotal(ticketType.quantityTotal);
    setSaleStart(isoToLocalInput(ticketType.saleStartAt));
    setSaleEnd(isoToLocalInput(ticketType.saleEndAt));
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim() || !categoryId || price < 0 || quantityTotal <= 0) {
      const message = "Fill in a name, category, price, and quantity greater than 0.";
      setError(message);
      toast.error(message);
      return;
    }
    if (saleStart && saleEnd && dayjs(saleEnd).valueOf() <= dayjs(saleStart).valueOf()) {
      const message = "Sales end must be after the sales start.";
      setError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    const result = editingId
      ? await updateTicketTypeAction(eventId, editingId, {
          name: name.trim(),
          categoryId,
          price,
          quantityTotal,
          saleStartAt: localInputToIso(saleStart),
          saleEndAt: localInputToIso(saleEnd),
        })
      : await createTicketTypeAction(eventId, {
          name: name.trim(),
          categoryId,
          price,
          quantityTotal,
          ...(saleStart ? { saleStartAt: localInputToIso(saleStart) as string } : {}),
          ...(saleEnd ? { saleEndAt: localInputToIso(saleEnd) as string } : {}),
        });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      toast.error(result.message);
      return;
    }
    toast.success(editingId ? "Ticket type updated." : "Ticket type added.");
    resetForm();
    router.refresh();
  };

  const handleToggleActive = async (ticketType: TicketType) => {
    await updateTicketTypeAction(eventId, ticketType.id, { isActive: !ticketType.isActive });
    router.refresh();
  };

  const categoryName = (ticketType: TicketType) =>
    categories.find((category) => category.id === ticketType.categoryId)?.name ?? "Uncategorized";

  const salesWindowLabel = (ticketType: TicketType) => {
    const { saleStartAt, saleEndAt } = ticketType;
    if (!saleStartAt && !saleEndAt) return "Always on sale";
    const start = saleStartAt ? dayjs(saleStartAt).format(DATETIME_DISPLAY) : "Now";
    const end = saleEndAt ? dayjs(saleEndAt).format(DATETIME_DISPLAY) : "Event";
    return `${start} → ${end}`;
  };

  const columns: DataTableColumn<TicketType>[] = [
    {
      key: "name",
      header: "Name",
      sortAccessor: (ticketType) => ticketType.name.toLowerCase(),
      searchAccessor: (ticketType) => `${ticketType.name} ${categoryName(ticketType)}`,
      render: (ticketType) => (
        <div className="min-w-0">
          <p className="truncate font-black uppercase">{ticketType.name}</p>
          <p className="text-xs text-black/40">{categoryName(ticketType)}</p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      sortAccessor: (ticketType) => ticketType.price,
      render: (ticketType) => formatPrice(ticketType.price),
    },
    {
      key: "sold",
      header: "Sold",
      sortAccessor: (ticketType) => ticketType.quantitySold / ticketType.quantityTotal,
      render: (ticketType) => `${ticketType.quantitySold}/${ticketType.quantityTotal}`,
    },
    {
      key: "sales",
      header: "Sales window",
      render: (ticketType) => {
        const status = STATUS_BADGE[getSalesStatus(ticketType)];
        return (
          <div className="space-y-1">
            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${status.className}`}>
              {status.label}
            </span>
            <p className="text-xs text-black/45">{salesWindowLabel(ticketType)}</p>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (ticketType) => (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => startEdit(ticketType)} className="button button-outline">
            Edit
          </button>
          <button
            type="button"
            onClick={() => void handleToggleActive(ticketType)}
            className={`button ${ticketType.isActive ? "button-dark" : "button-lime"}`}
          >
            {ticketType.isActive ? "Active" : "Hidden"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {ticketTypes.length === 0 ? (
        <p className="text-sm text-black/50">No ticket types yet — add one below.</p>
      ) : (
        <DataTable columns={columns} data={ticketTypes} getRowKey={(ticketType) => ticketType.id} searchPlaceholder="Search ticket types…" />
      )}

      <div ref={formRef} className="border-2 border-ink bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="tag">{editingId ? "Edit ticket type" : "Add ticket type"}</span>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-xs font-black uppercase text-black/50 hover:underline">
              Cancel edit
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FormField required label="Name *" name="ticketTypeName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Early Bird" />
          <label className="field-label">
            Category *
            <SearchableSelect
              value={categoryId}
              onChange={setCategoryId}
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
            />
          </label>
          <FormField required label="Price (IDR) *" name="price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          <FormField required label="Quantity *" name="quantityTotal" type="number" min={1} value={quantityTotal} onChange={(e) => setQuantityTotal(Number(e.target.value))} />
        </div>

        <fieldset className="mt-7 border-t-2 border-dashed border-black/15 pt-5">
          <legend className="sr-only">Sales window</legend>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-sm font-black uppercase tracking-wide">Sales window <span className="text-black/40">(optional)</span></h3>
            <p className="text-xs text-black/45">When buyers can purchase this ticket — separate from the event schedule.</p>
          </div>
          <p className="mt-3 border-2 border-black/10 bg-paper px-3 py-2 text-xs text-black/60">
            <span className="font-bold uppercase tracking-widest text-black/40">Event runs</span>{" "}
            {dayjs(eventStartAt).format(DATETIME_DISPLAY)} → {dayjs(eventEndAt).format(DATETIME_DISPLAY)}.
            Leave the fields below empty to sell from now until the event.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField
              label="Sales start"
              name="saleStartAt"
              type="datetime-local"
              value={saleStart}
              onChange={(e) => setSaleStart(e.target.value)}
            />
            <FormField
              label="Sales end (ticket closes automatically)"
              name="saleEndAt"
              type="datetime-local"
              value={saleEnd}
              onChange={(e) => setSaleEnd(e.target.value)}
              error={saleStart && saleEnd && dayjs(saleEnd).valueOf() <= dayjs(saleStart).valueOf() ? "Must be after the sales start" : undefined}
            />
          </div>
        </fieldset>

        {error && <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => void handleSubmit()} disabled={submitting} className="button button-dark disabled:opacity-50">
            {submitting ? "Saving…" : editingId ? "Save changes" : "Add ticket type"}
          </button>
        </div>
      </div>
    </div>
  );
}
