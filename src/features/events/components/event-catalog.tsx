import type { EventItem } from "@/data/events";
import EventFilters from "./event-filters";
import EventGrid from "./event-grid";

type EventCatalogProps = {
  activeCategory?: string;
  events: EventItem[];
};

export default function EventCatalog({ activeCategory, events }: EventCatalogProps) {
  return (
    <section className="site-container py-8 sm:py-12">
      <EventFilters activeCategory={activeCategory} />
      <div className="mb-8 mt-8 flex items-end justify-between border-b border-black/15 pb-5">
        <h2 className="text-2xl font-black uppercase sm:text-3xl">{activeCategory ?? "All events"}</h2>
        <span className="text-xs font-bold uppercase tracking-widest text-black/40">{events.length} events</span>
      </div>
      <EventGrid events={events} className="pb-16" />
    </section>
  );
}
