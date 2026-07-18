import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetailContent, EventDetailHero, RelatedEvents } from "@/features/events/components";
import { getEventBySlug, listEventImages, listPublicEvents, listPublicTicketTypes, toEventItemsWithDetails } from "@/features/events/lib/api";
import { toEventItem } from "@/features/events/lib/to-event-item";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventBySlug((await params).slug);
  return { title: event?.name ?? "Event" };
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [ticketTypes, images, related] = await Promise.all([
    listPublicTicketTypes(event.id),
    listEventImages(event.id),
    listPublicEvents({ category: event.category.slug, pageSize: 4 }),
  ]);

  const item = toEventItem(event, ticketTypes, images);
  const relatedItems = await toEventItemsWithDetails(related.events.filter((candidate) => candidate.slug !== event.slug).slice(0, 3));

  return (
    <div className="bg-paper">
      <EventDetailHero event={item} />
      <EventDetailContent />
      <RelatedEvents events={relatedItems} />
    </div>
  );
}
