import ActionLink from "@/components/ui/action-link";
import { CalendarIcon, PinIcon, TicketIcon } from "@/components/site/icons";
import type { EventItem } from "@/data/events";
import { formatPrice } from "@/data/events";
import EventPoster from "./event-poster";

export default function EventDetailHero({ event }: { event: EventItem }) {
  return (
    <section className="bg-ink text-white">
      <div className="site-container grid gap-12 py-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:py-20">
        <EventPoster event={event} className="aspect-[4/5] w-full max-w-[540px] shadow-[16px_16px_0_#b6ff00]" />
        <div className="lg:pl-8">
          <span className="eyebrow"><span className="h-2 w-2 rounded-full bg-lime" />{event.category} · {event.tag}</span>
          <h1 className="mt-7 text-5xl font-black uppercase leading-[.92] text-white sm:text-7xl lg:text-[88px]">{event.title}</h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">{event.description}</p>
          <div className="mt-9 grid gap-4 border-y border-white/15 py-7 sm:grid-cols-2">
            <span className="detail-line"><CalendarIcon /><span><small>Date & time</small>{event.date}<br />{event.time}</span></span>
            <span className="detail-line"><PinIcon /><span><small>Venue</small>{event.venue}<br />{event.city}</span></span>
          </div>
          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="block text-xs font-bold uppercase tracking-widest text-white/40">Ticket starts from</span>
              <strong className="mt-1 block text-2xl text-lime">{formatPrice(event.price)}</strong>
            </div>
            <ActionLink href={`/checkout/${event.slug}`} variant="lime" size="large"><TicketIcon className="h-5 w-5" />Get tickets</ActionLink>
          </div>
        </div>
      </div>
    </section>
  );
}
