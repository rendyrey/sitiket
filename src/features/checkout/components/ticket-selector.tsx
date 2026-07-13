import { formatPrice } from "@/data/events";
import CheckoutPanel from "./checkout-panel";

type TicketSelectorProps = {
  onQuantityChange: (quantity: number) => void;
  price: number;
  quantity: number;
};

export default function TicketSelector({
  onQuantityChange,
  price,
  quantity,
}: TicketSelectorProps) {
  return (
    <CheckoutPanel step="01" title="Choose your ticket">
      <div className="mt-7 flex flex-col items-start gap-5 border-2 border-ink bg-paper p-4 xs:p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <strong className="block text-lg uppercase">General Admission</strong>
          <span className="mt-1 block text-sm text-black/50">
            Entry for one person
          </span>
          <span className="mt-3 block font-bold">{formatPrice(price)}</span>
        </div>
        <div className="shrink-0">
          <QuantityPicker quantity={quantity} onChange={onQuantityChange} />
        </div>
      </div>
    </CheckoutPanel>
  );
}

function QuantityPicker({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="flex items-center border-2 border-ink bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, quantity - 1))}
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
        onClick={() => onChange(Math.min(6, quantity + 1))}
        className="quantity-button"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
