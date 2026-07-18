import { TicketIcon } from "@/components/site/icons";
import type { EventItem } from "@/data/events";
import { formatPrice } from "@/data/events";
import type { TicketType } from "@/lib/api/types";

type OrderSummaryProps = {
  error?: string | null;
  event: EventItem;
  onSubmit: () => void;
  quantities: Record<string, number>;
  submitting: boolean;
  ticketTypes: TicketType[];
};

export default function OrderSummary({ error, event, onSubmit, quantities, submitting, ticketTypes }: OrderSummaryProps) {
  const lines = ticketTypes
    .map((ticketType) => ({ ticketType, quantity: quantities[ticketType.id] ?? 0 }))
    .filter((line) => line.quantity > 0);
  const subtotal = lines.reduce((sum, line) => sum + line.ticketType.price * line.quantity, 0);
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <aside className="mr-2 h-fit min-w-0 border-2 border-ink bg-ink p-5 text-white shadow-[7px_7px_0_#b6ff00] xs:p-7 xs:shadow-[10px_10px_0_#b6ff00] lg:sticky lg:top-32">
      <span className="text-xs font-bold uppercase tracking-widest text-lime">
        Order summary
      </span>
      <h2 className="mt-3 text-2xl font-black uppercase text-white">
        {event.title}
      </h2>
      <p className="mt-2 text-sm text-white/50">
        {event.date} · {event.time}
        <br />
        {event.venue}
      </p>
      <div className="my-7 space-y-2 border-y border-white/15 py-5 text-sm">
        {lines.length === 0 && <p className="text-white/40">No tickets selected yet.</p>}
        {lines.map((line) => (
          <SummaryRow
            key={line.ticketType.id}
            label={`${line.ticketType.name} × ${line.quantity}`}
            value={formatPrice(line.ticketType.price * line.quantity)}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-white/45">
          Subtotal
        </span>
        <strong className="text-xl text-lime xs:text-2xl">
          {formatPrice(subtotal)}
        </strong>
      </div>
      {error && (
        <p className="mt-4 border-2 border-red-500/60 bg-red-500/10 p-3 text-xs font-semibold text-red-300">{error}</p>
      )}
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || totalQuantity === 0}
        className="button button-lime button-large mt-7 w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        <TicketIcon className="h-5 w-5" />
        {submitting ? "Placing order…" : "Continue to pay"}
      </button>
      <p className="mt-4 text-center text-[11px] leading-4 text-white/35">
        Payment is via manual bank transfer — you&apos;ll get the account details on the next step.
      </p>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-2 text-white/65">
      <span className="min-w-0">{label}</span>
      <span className="shrink-0 text-right">{value}</span>
    </div>
  );
}
