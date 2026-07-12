import { TicketIcon } from "@/components/site/icons";
import type { EventItem } from "@/data/events";
import { formatPrice } from "@/data/events";

type OrderSummaryProps = {
  event: EventItem;
  fee: number;
  quantity: number;
  total: number;
};

export default function OrderSummary({ event, fee, quantity, total }: OrderSummaryProps) {
  return (
    <aside className="h-fit border-2 border-ink bg-ink p-7 text-white shadow-[10px_10px_0_#b6ff00] lg:sticky lg:top-32">
      <span className="text-xs font-bold uppercase tracking-widest text-lime">Order summary</span>
      <h2 className="mt-3 text-2xl font-black uppercase text-white">{event.title}</h2>
      <p className="mt-2 text-sm text-white/50">{event.date} · {event.time}<br />{event.venue}</p>
      <div className="my-7 border-y border-white/15 py-5 text-sm">
        <SummaryRow label={`General Admission × ${quantity}`} value={formatPrice(event.price * quantity)} />
        <SummaryRow label="Service fee" value={formatPrice(fee)} />
      </div>
      <div className="flex items-end justify-between"><span className="text-xs font-bold uppercase tracking-widest text-white/45">Total</span><strong className="text-2xl text-lime">{formatPrice(total)}</strong></div>
      <button type="submit" className="button button-lime button-large mt-7 w-full"><TicketIcon className="h-5 w-5" />Continue to pay</button>
      <p className="mt-4 text-center text-[11px] leading-4 text-white/35">Demo checkout only. No payment will be processed.</p>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between py-2 text-white/65"><span>{label}</span><span>{value}</span></div>;
}
