import type { EventItem } from "@/data/events";
import type { TaxonomyItem } from "@/lib/api/types";
import EventFilters from "./event-filters";
import EventGrid from "./event-grid";

type EventCatalogProps = {
  activeCategory?: string;
  categories: TaxonomyItem[];
  events: EventItem[];
  total: number;
};

export default function EventCatalog({
  activeCategory,
  categories,
  events,
  total,
}: EventCatalogProps) {
  const activeCategoryName = categories.find((category) => category.slug.toLowerCase() === activeCategory?.toLowerCase())?.name;

  return (
    <section className="site-container py-8 sm:py-12">
      <EventFilters activeCategory={activeCategory} categories={categories} />
      <div className="mb-8 mt-8 flex flex-col items-start gap-2 border-b border-black/15 pb-5 xs:flex-row xs:items-end xs:justify-between">
        <h2 className="text-2xl font-black uppercase sm:text-3xl">
          {activeCategoryName ?? "All events"}
        </h2>
        <span className="text-xs font-bold uppercase tracking-widest text-black/40">
          {total} events
        </span>
      </div>
      <EventGrid events={events} className="pb-16" />
    </section>
  );
}
