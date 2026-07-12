import type { Metadata } from "next";
import EventCard from "@/components/site/event-card";
import { events } from "@/data/events";

export const metadata: Metadata = { title: "All Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const filtered = category ? events.filter((event) => event.category.toLowerCase() === category.toLowerCase()) : events;
  const categories = ["All", "Music", "Community", "Lifestyle", "Comedy", "Conference"];

  return (
    <div className="bg-paper">
      <section className="border-b-4 border-ink bg-lime py-16 sm:py-24"><div className="site-container"><span className="section-index">DISCOVER / JAKARTA</span><h1 className="mt-5 text-6xl font-black uppercase leading-[.86] text-black sm:text-8xl lg:text-[128px]">FIND YOUR<br />NEXT THING.</h1><p className="mt-7 max-w-xl text-base font-medium leading-7 text-black/60 sm:text-lg">Concerts, matches, markets, conferences, and everything in between—one ticket away.</p></div></section>
      <section className="site-container py-8 sm:py-12">
        <div className="flex gap-2 overflow-x-auto pb-3">{categories.map((item) => <a key={item} href={item === "All" ? "/events" : `/events?category=${item.toLowerCase()}`} className={`filter-chip ${(!category && item === "All") || category?.toLowerCase() === item.toLowerCase() ? "filter-chip-active" : ""}`}>{item}</a>)}</div>
        <div className="mb-8 mt-8 flex items-end justify-between border-b border-black/15 pb-5"><h2 className="text-2xl font-black uppercase sm:text-3xl">{category ?? "All events"}</h2><span className="text-xs font-bold uppercase tracking-widest text-black/40">{filtered.length} events</span></div>
        {filtered.length ? <div className="grid gap-6 pb-16 md:grid-cols-2 lg:grid-cols-3">{filtered.map((event) => <EventCard key={event.slug} event={event} />)}</div> : <div className="py-24 text-center"><h2 className="text-4xl font-black uppercase">Nothing here yet.</h2><p className="mt-3 text-black/50">Try another category.</p></div>}
      </section>
    </div>
  );
}
