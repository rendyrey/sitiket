import type { ReactNode } from "react";

type CheckoutPanelProps = {
  children: ReactNode;
  step: string;
  title: string;
};

export default function CheckoutPanel({ children, step, title }: CheckoutPanelProps) {
  return (
    <section className="checkout-panel">
      <span className="checkout-step">{step}</span>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
