"use client";

import { useState } from "react";
import type { EventItem } from "@/data/events";
import AttendeeDetails from "./attendee-details";
import OrderSummary from "./order-summary";
import PaymentMethods from "./payment-methods";
import TicketSelector from "./ticket-selector";

const SERVICE_FEE = 5000;

export default function CheckoutForm({ event }: { event: EventItem }) {
  const [quantity, setQuantity] = useState(1);
  const fee = SERVICE_FEE * quantity;
  const total = event.price * quantity + fee;

  return (
    <form className="grid gap-8 lg:grid-cols-[1fr_420px]" onSubmit={(event) => event.preventDefault()}>
      <div className="space-y-8">
        <TicketSelector price={event.price} quantity={quantity} onQuantityChange={setQuantity} />
        <AttendeeDetails />
        <PaymentMethods />
      </div>
      <OrderSummary event={event} fee={fee} quantity={quantity} total={total} />
    </form>
  );
}
