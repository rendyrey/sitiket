import FormField from "@/components/ui/form-field";
import CheckoutPanel from "./checkout-panel";

type PromoCodePanelProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
};

export default function PromoCodePanel({ disabled = false, onChange, value }: PromoCodePanelProps) {
  return (
    <CheckoutPanel step="03" title="Promo code">
      <div className="mt-7">
        <FormField
          label="Have a code? (optional)"
          name="promoCode"
          placeholder="E.g. EARLYBIRD10"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
        <p className="mt-3 text-xs font-semibold text-black/40">
          Any discount is applied when you continue — the organizer verifies each code.
        </p>
      </div>
    </CheckoutPanel>
  );
}
