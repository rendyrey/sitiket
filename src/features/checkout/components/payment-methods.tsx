import CheckoutPanel from "./checkout-panel";

const methods = ["Virtual Account", "E-Wallet", "QRIS"];

export default function PaymentMethods() {
  return (
    <CheckoutPanel step="03" title="Payment method">
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {methods.map((method, index) => (
          <label key={method} className={`payment-choice ${index === 0 ? "payment-choice-active" : ""}`}>
            <input type="radio" name="payment" value={method} defaultChecked={index === 0} className="sr-only" />
            <span className="block text-sm font-black uppercase">{method}</span>
            <span className="mt-1 block text-xs text-black/45">Fast & secure</span>
          </label>
        ))}
      </div>
    </CheckoutPanel>
  );
}
