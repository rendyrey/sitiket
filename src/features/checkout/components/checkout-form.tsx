"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EventItem } from "@/data/events";
import type { TicketType } from "@/lib/api/types";
import { createOrderAction } from "../lib/actions";
import AttendeeDetails, { type AttendeeDetailsValues } from "./attendee-details";
import OrderSummary from "./order-summary";
import PromoCodePanel from "./promo-code-panel";
import TicketSelector from "./ticket-selector";

type CheckoutFormProps = {
  event: EventItem;
  eventId: string;
  prefill: AttendeeDetailsValues | null;
  ticketTypes: TicketType[];
};

export default function CheckoutForm({ event, eventId, prefill, ticketTypes }: CheckoutFormProps) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [attendee, setAttendee] = useState<AttendeeDetailsValues>(prefill ?? { name: "", email: "", phone: "" });
  const [promoCode, setPromoCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuantityChange = (ticketTypeId: string, quantity: number) => {
    setQuantities((current) => ({ ...current, [ticketTypeId]: quantity }));
  };

  const handleSubmit = async () => {
    setError(null);

    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));

    if (items.length === 0) {
      setError("Select at least one ticket.");
      return;
    }
    if (!attendee.name.trim() || !attendee.email.trim()) {
      setError("Fill in your name and email.");
      return;
    }
    if (!attendee.phone.trim()) {
      setError("Add your phone number to continue.");
      return;
    }

    setSubmitting(true);
    const result = await createOrderAction({
      eventId,
      items,
      promoCode: promoCode.trim() || undefined,
      buyerName: attendee.name.trim(),
      buyerEmail: attendee.email.trim(),
      buyerPhone: attendee.phone.trim(),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    const guestParam = result.isGuest ? `?email=${encodeURIComponent(result.order.buyerEmail)}` : "";
    router.push(`/orders/${result.order.id}${guestParam}`);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <div className="space-y-8">
        <TicketSelector ticketTypes={ticketTypes} quantities={quantities} onQuantityChange={handleQuantityChange} />
        <AttendeeDetails values={attendee} onChange={setAttendee} disabled={Boolean(prefill)} />
        <PromoCodePanel value={promoCode} onChange={setPromoCode} disabled={submitting} />
      </div>
      <OrderSummary
        event={event}
        ticketTypes={ticketTypes}
        quantities={quantities}
        onSubmit={() => void handleSubmit()}
        submitting={submitting}
        error={error}
      />
    </div>
  );
}
