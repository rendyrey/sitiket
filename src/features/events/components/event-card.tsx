import Link from "next/link";
import { ArrowUpRight, CalendarIcon, PinIcon } from "@/components/site/icons";
import type { EventItem } from "@/data/events";
import { formatPrice } from "@/data/events";
import EventPoster from "./event-poster";

type EventCardProps = {
  event: EventItem;
  featured?: boolean;
};

export default function EventCard({ event, featured = false }: EventCardProps) {
  const detailUrl = `/events/${event.slug}`;

  return (
    <article className={`event-card group ${featured ? "md:col-span-2" : ""}`}>
      <Link href={detailUrl} className="block overflow-hidden">
        <EventPoster
          event={event}
          className={`${featured ? "aspect-[16/9] md:aspect-[2/1]" : "aspect-[4/5]"} transition-transform duration-500 group-hover:scale-[1.025]`}
        />
      </Link>
      <div className="border-t-4 border-ink bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <span className="tag">{event.category}</span>
          <span className="text-xs font-bold uppercase tracking-wide text-black/45">
            {event.tag}
          </span>
        </div>
        <Link href={detailUrl}>
          <h3 className="text-2xl font-extrabold uppercase leading-[1.05] transition-colors group-hover:text-[#5c8500] sm:text-3xl">
            {event.title}
          </h3>
        </Link>
        <div className="mt-5 grid gap-2 text-sm font-semibold text-black/65">
          <span className="flex min-w-0 items-start gap-2">
            <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-black" />
            <span>
              {event.date} · {event.time}
            </span>
          </span>
          <span className="flex min-w-0 items-start gap-2">
            <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-black" />
            <span>{event.venue}</span>
          </span>
        </div>
        <div className="mt-6 flex items-end justify-between border-t border-black/10 pt-5">
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-black/40">
              Starts from
            </span>
            <strong className="text-lg text-black">
              {formatPrice(event.price)}
            </strong>
          </div>
          <Link
            href={detailUrl}
            className="grid h-11 w-11 place-items-center bg-ink text-white transition-colors hover:bg-lime hover:text-black"
            aria-label={`View ${event.title}`}
          >
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
