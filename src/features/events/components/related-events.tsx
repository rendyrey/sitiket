import SectionHeading from "@/components/ui/section-heading";
import type { EventItem } from "@/data/events";
import EventGrid from "./event-grid";

export default function RelatedEvents({ events }: { events: EventItem[] }) {
  return (
    <section className="border-t border-black/10 bg-white py-20">
      <div className="site-container">
        <SectionHeading eyebrow="KEEP EXPLORING" title="YOU MAY ALSO LIKE." />
        <EventGrid events={events} className="mt-10" />
      </div>
    </section>
  );
}
