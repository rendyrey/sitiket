import Link from "next/link";
import SectionHeading from "@/components/ui/section-heading";
import { ArrowRight } from "@/components/site/icons";
import type { EventItem } from "@/data/events";
import { EventGrid } from "@/features/events/components";

export default function FeaturedEvents({ events }: { events: EventItem[] }) {
  const action = <Link href="/events" className="text-link">View all events <ArrowRight className="h-5 w-5" /></Link>;

  return (
    <section className="section-space bg-paper">
      <div className="site-container">
        <SectionHeading eyebrow="01 / CURATED FOR YOU" title={<>EVENTS WORTH<br />SHOWING UP FOR.</>} action={action} />
        <EventGrid events={events} className="mt-12" />
      </div>
    </section>
  );
}
