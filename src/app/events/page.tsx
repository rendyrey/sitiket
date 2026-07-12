import type { Metadata } from "next";
import { events } from "@/data/events";
import { EventCatalog, EventsPageHero } from "@/features/events/components";

export const metadata: Metadata = { title: "All Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const filtered = category ? events.filter((event) => event.category.toLowerCase() === category.toLowerCase()) : events;
  return (
    <div className="bg-paper">
      <EventsPageHero />
      <EventCatalog activeCategory={category} events={filtered} />
    </div>
  );
}
