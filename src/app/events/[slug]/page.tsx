import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { events, getEvent } from "@/data/events";
import { EventDetailContent, EventDetailHero, RelatedEvents } from "@/features/events/components";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = getEvent((await params).slug);
  return { title: event?.title ?? "Event" };
}

export function generateStaticParams() { return events.map(({ slug }) => ({ slug })); }

export default async function EventDetailPage({ params }: Props) {
  const event = getEvent((await params).slug);
  if (!event) notFound();
  const related = events.filter((item) => item.slug !== event.slug).slice(0, 3);

  return (
    <div className="bg-paper">
      <EventDetailHero event={event} />
      <EventDetailContent />
      <RelatedEvents events={related} />
    </div>
  );
}
