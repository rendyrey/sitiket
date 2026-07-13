import { notFound } from "next/navigation";
import { CheckoutForm } from "@/features/checkout/components";
import { getEvent } from "@/data/events";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const event = getEvent((await params).slug);
  if (!event) notFound();
  return (
    <div className="bg-paper py-10 sm:py-20">
      <div className="site-container">
        <span className="section-index">SECURE CHECKOUT</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl sm:text-7xl">
          GET YOUR TICKET.
        </h1>
        <p className="mt-4 max-w-xl text-black/50">
          You’re a few details away from {event.title}.
        </p>
        <div className="mt-8 sm:mt-10">
          <CheckoutForm event={event} />
        </div>
      </div>
    </div>
  );
}
