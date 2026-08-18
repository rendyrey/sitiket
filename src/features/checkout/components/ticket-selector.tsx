import dayjs from "dayjs";
import { formatPrice } from "@/data/events";
import { getSalesStatus } from "@/lib/tickets/sales-window";
import type { TicketType } from "@/lib/api/types";
import CheckoutPanel from "./checkout-panel";

type TicketSelectorProps = {
  onQuantityChange: (ticketTypeId: string, quantity: number) => void;
  quantities: Record<string, number>;
  ticketTypes: TicketType[];
};

export default function TicketSelector({ onQuantityChange, quantities, ticketTypes }: TicketSelectorProps) {
  return (
    <CheckoutPanel step="01" title="Choose your tickets">
      <div className="mt-7 space-y-4">
        {ticketTypes.length === 0 && (
          <p className="border-2 border-black/15 bg-paper p-5 text-sm font-semibold text-black/50">
            No ticket types are on sale for this event yet.
          </p>
        )}
        {ticketTypes.map((ticketType) => {
          const remaining = Math.max(ticketType.quantityTotal - ticketType.quantitySold, 0);
          const soldOut = remaining <= 0;
          const salesStatus = getSalesStatus(ticketType);
          const closed = salesStatus !== "on_sale";
          const disabled = soldOut || closed;

          const availability =
            salesStatus === "scheduled"
              ? `On sale from ${dayjs(ticketType.saleStartAt).format("D MMM YYYY, HH:mm")}`
              : salesStatus === "ended"
                ? "Sales closed"
                : soldOut
                  ? "Sold out"
                  : `${remaining} left`;

          return (
            <div
              key={ticketType.id}
              className={`flex flex-col items-start gap-5 border-2 border-ink bg-paper p-4 xs:p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${closed ? "opacity-60" : ""}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="block text-lg uppercase">{ticketType.name}</strong>
                  {closed && (
                    <span className="border border-ink/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black/50">
                      {salesStatus === "scheduled" ? "Not yet on sale" : "Closed"}
                    </span>
                  )}
                </div>
                <span className="mt-1 block text-sm text-black/50">{availability}</span>
                {salesStatus === "on_sale" && ticketType.saleEndAt && !soldOut && (
                  <span className="mt-0.5 block text-xs text-black/40">
                    Sales end {dayjs(ticketType.saleEndAt).format("D MMM YYYY, HH:mm")}
                  </span>
                )}
                <span className="mt-3 block font-bold">{formatPrice(ticketType.price)}</span>
              </div>
              <div className="shrink-0">
                <QuantityPicker
                  quantity={disabled ? 0 : quantities[ticketType.id] ?? 0}
                  max={Math.min(remaining, 10)}
                  disabled={disabled}
                  onChange={(quantity) => onQuantityChange(ticketType.id, quantity)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CheckoutPanel>
  );
}

function QuantityPicker({
  disabled = false,
  max,
  onChange,
  quantity,
}: {
  disabled?: boolean;
  max: number;
  onChange: (quantity: number) => void;
  quantity: number;
}) {
  return (
    <div className={`flex items-center border-2 border-ink bg-white ${disabled ? "opacity-40" : ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.max(0, quantity - 1))}
        className="quantity-button"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-10 text-center font-black" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.min(max, quantity + 1))}
        className="quantity-button"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
