import { notFound } from "next/navigation";
import EventTabs from "@/features/admin/components/event-tabs";
import TicketTypeManager from "@/features/admin/components/ticket-type-manager";
import { listAllTicketTypes } from "@/features/admin/lib/api";
import { getEventBySlug, listTicketCategories } from "@/features/events/lib/api";

export default async function AdminEventTicketTypesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [ticketTypes, categories] = await Promise.all([listAllTicketTypes(event.id), listTicketCategories()]);

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">{event.name}</h1>
      <div className="mt-6">
        <EventTabs slug={slug} activeSegment="/ticket-types" />
      </div>
      <div className="mt-8 max-w-3xl">
        <TicketTypeManager eventId={event.id} ticketTypes={ticketTypes} categories={categories} />
      </div>
    </div>
  );
}
