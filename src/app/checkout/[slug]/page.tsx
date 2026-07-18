import { notFound } from "next/navigation";
import { CheckoutForm } from "@/features/checkout/components";
import { getEventBySlug, listEventImages, listPublicTicketTypes } from "@/features/events/lib/api";
import { toEventItem } from "@/features/events/lib/to-event-item";
import { getCurrentUser } from "@/lib/session";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [ticketTypes, images, user] = await Promise.all([
    listPublicTicketTypes(event.id),
    listEventImages(event.id),
    getCurrentUser(),
  ]);
  const item = toEventItem(event, ticketTypes, images);

  return (
    <div className="bg-paper py-10 sm:py-20">
      <div className="site-container">
        <span className="section-index">SECURE CHECKOUT</span>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none xs:text-5xl sm:text-7xl">
          GET YOUR TICKET.
        </h1>
        <p className="mt-4 max-w-xl text-black/50">
          You’re a few details away from {item.title}.
        </p>
        <div className="mt-8 sm:mt-10">
          <CheckoutForm
            event={item}
            eventId={event.id}
            ticketTypes={ticketTypes}
            prefill={user ? { name: user.name, email: user.email, phone: user.phone ?? "" } : null}
          />
        </div>
      </div>
    </div>
  );
}
