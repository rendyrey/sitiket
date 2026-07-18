import { formatPrice } from "@/data/events";
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

          return (
            <div
              key={ticketType.id}
              className="flex flex-col items-start gap-5 border-2 border-ink bg-paper p-4 xs:p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <strong className="block text-lg uppercase">{ticketType.name}</strong>
                <span className="mt-1 block text-sm text-black/50">{soldOut ? "Sold out" : `${remaining} left`}</span>
                <span className="mt-3 block font-bold">{formatPrice(ticketType.price)}</span>
              </div>
              <div className="shrink-0">
                <QuantityPicker
                  quantity={quantities[ticketType.id] ?? 0}
                  max={Math.min(remaining, 10)}
                  disabled={soldOut}
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
