import type { Metadata } from "next";
import { EventCatalog, EventsPageHero } from "@/features/events/components";
import { listEventCategories, listPublicEvents, toEventItemsWithDetails } from "@/features/events/lib/api";

export const metadata: Metadata = { title: "All Events" };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}) {
  const { category, search, page } = await searchParams;

  const [{ events, meta }, categories] = await Promise.all([
    listPublicEvents({ category, search, page: page ? Number(page) : undefined }),
    listEventCategories(),
  ]);
  const items = await toEventItemsWithDetails(events);

  return (
    <div className="bg-paper">
      <EventsPageHero />
      <EventCatalog activeCategory={category} categories={categories} events={items} total={meta.total} />
    </div>
  );
}
