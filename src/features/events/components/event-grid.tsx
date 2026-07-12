import type { EventItem } from "@/data/events";
import EventCard from "./event-card";

type EventGridProps = {
  className?: string;
  events: EventItem[];
};

export default function EventGrid({ className = "", events }: EventGridProps) {
  if (!events.length) {
    return (
      <div className="py-24 text-center">
        <h2 className="text-4xl font-black uppercase">Nothing here yet.</h2>
        <p className="mt-3 text-black/50">Try another category.</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {events.map((event) => <EventCard key={event.slug} event={event} />)}
    </div>
  );
}
