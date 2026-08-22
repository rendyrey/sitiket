"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import SearchableSelect from "@/components/ui/searchable-select";
import { formatPrice } from "@/data/events";
import { deleteOnsiteSaleAction, listOnsiteSalesAction, recordOnsiteSaleAction } from "@/features/scanner/lib/actions";
import type { OnsiteSale, TicketType } from "@/lib/api/types";

const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(
    new Date(iso),
  );

type OnsiteSalesPanelProps = {
  eventId: string;
  /** The event's tiers — price prefill + the tier dropdown. */
  ticketTypes: TicketType[];
  /** Grants delete on every entry (organizer/super_admin); others may delete only their own rows. */
  canDeleteAll: boolean;
  /** The signed-in viewer — matches `recordedBy` to offer delete on own rows. */
  viewerId: string;
};

/**
 * The door-sale (on-the-spot) tally: counts and money only, no buyer data,
 * no QR issued. Works as a live "+2 Regular" counter at the gate or a bulk
 * end-of-event entry — same form. Mounted on both the organizer's and the
 * gate staff's attendance pages.
 */
export default function OnsiteSalesPanel({ canDeleteAll, eventId, ticketTypes, viewerId }: OnsiteSalesPanelProps) {
  const [sales, setSales] = useState<OnsiteSale[] | null>(null);
  const [ticketTypeId, setTicketTypeId] = useState(ticketTypes[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState(ticketTypes[0] ? String(ticketTypes[0].price) : "");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<OnsiteSale | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const refresh = () =>
    listOnsiteSalesAction(eventId).then((result) => {
      if (result.ok) setSales(result.data);
      else toast.error(result.message);
    });

  useEffect(() => {
    let cancelled = false;
    void listOnsiteSalesAction(eventId).then((result) => {
      if (!cancelled && result.ok) setSales(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const chosenTier = ticketTypes.find((tier) => tier.id === ticketTypeId);
  const quantityValue = Math.floor(Number(quantity));
  const priceValue = Math.floor(Number(unitPrice));
  const inputValid = Boolean(chosenTier) && quantityValue >= 1 && Number.isFinite(priceValue) && priceValue >= 0;

  const pickTier = (id: string) => {
    setTicketTypeId(id);
    const tier = ticketTypes.find((candidate) => candidate.id === id);
    if (tier) setUnitPrice(String(tier.price));
  };

  const handleRecord = async () => {
    if (!inputValid) return;
    setBusy(true);
    const result = await recordOnsiteSaleAction(eventId, {
      ticketTypeId,
      quantity: quantityValue,
      unitPrice: priceValue,
      note: note.trim() || undefined,
    });
    setBusy(false);
    setConfirming(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Recorded ${quantityValue}× ${chosenTier?.name}.`);
    setQuantity("1");
    setNote("");
    void refresh();
  };

  const handleRemove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    const result = await deleteOnsiteSaleAction(eventId, removing.id);
    setRemoveBusy(false);
    setRemoving(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Entry deleted.");
    void refresh();
  };

  const totalSold = (sales ?? []).reduce((sum, sale) => sum + sale.quantity, 0);
  const totalRevenue = (sales ?? []).reduce((sum, sale) => sum + sale.quantity * sale.unitPrice, 0);

  return (
    <div className="border-2 border-ink bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span className="tag">Door sales (on-the-spot)</span>
        {sales !== null && sales.length > 0 && (
          <p className="text-xs font-bold uppercase tracking-widest text-black/45">
            {totalSold.toLocaleString("id-ID")} sold · {formatPrice(totalRevenue)}
          </p>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-black/45">
        Tickets sold at the gate, counted only — no buyer data, no QR. Record each sale live, or enter one bulk total
        after the event.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="field-label lg:col-span-2">
          Ticket type
          <SearchableSelect
            value={ticketTypeId}
            onChange={pickTier}
            options={ticketTypes.map((tier) => ({
              value: tier.id,
              // Hidden tiers are how door-only "OTS" pricing is set up — show
              // them here even though the public page never does.
              label: `${tier.name} — ${formatPrice(tier.price)}${tier.isActive ? "" : " (hidden)"}`,
            }))}
            placeholder={ticketTypes.length === 0 ? "No ticket types yet" : "Select ticket type"}
          />
        </label>
        <label className="field-label">
          Quantity
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="text-field"
          />
        </label>
        <label className="field-label">
          Price each (Rp)
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            className="text-field"
          />
        </label>
        <label className="field-label sm:col-span-2 lg:col-span-3">
          Note (optional)
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={255}
            placeholder="e.g. cash, Gate B"
            className="text-field"
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            disabled={!inputValid || busy}
            onClick={() => setConfirming(true)}
            className="button button-lime h-14 w-full disabled:opacity-50"
          >
            Record sale
          </button>
        </div>
      </div>

      {sales === null ? (
        <p className="mt-5 text-xs font-semibold text-black/40">Loading entries…</p>
      ) : sales.length === 0 ? (
        <p className="mt-5 text-xs font-semibold text-black/40">Nothing recorded yet.</p>
      ) : (
        <ul className="mt-5 divide-y divide-black/10 border-t border-black/10">
          {sales.map((sale) => {
            const canDelete = canDeleteAll || sale.recordedBy === viewerId;
            return (
              <li key={sale.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-bold">
                    {sale.quantity}× {sale.ticketTypeName ?? "Deleted tier"}
                    <span className="ml-2 font-semibold text-black/45">{formatPrice(sale.quantity * sale.unitPrice)}</span>
                  </p>
                  <p className="text-xs text-black/40">
                    {timeLabel(sale.createdAt)}
                    {sale.recordedByName ? ` · by ${sale.recordedByName}` : ""}
                    {sale.note ? ` · ${sale.note}` : ""}
                  </p>
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setRemoving(sale)}
                    className="text-xs font-black uppercase text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirming}
        tag="Record door sale"
        title={`Record ${quantityValue}× ${chosenTier?.name ?? ""}?`}
        confirmLabel="Record"
        busy={busy}
        onConfirm={() => void handleRecord()}
        onCancel={() => setConfirming(false)}
      >
        <p>
          {quantityValue} ticket{quantityValue === 1 ? "" : "s"} at {formatPrice(priceValue)} each —{" "}
          <strong>{formatPrice(quantityValue * priceValue)}</strong> total. This adds to the event&apos;s door-sale
          tally.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={removing !== null}
        tag="Delete entry"
        title={`Delete ${removing?.quantity}× ${removing?.ticketTypeName ?? "entry"}?`}
        confirmLabel="Delete"
        danger
        busy={removeBusy}
        onConfirm={() => void handleRemove()}
        onCancel={() => setRemoving(null)}
      >
        <p>This removes the entry from the tally and its numbers from the attendance report.</p>
      </ConfirmDialog>
    </div>
  );
}
