import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventCard from "@/components/site/event-card";
import EventPoster from "@/components/site/event-poster";
import { CalendarIcon, PinIcon, TicketIcon } from "@/components/site/icons";
import { events, formatPrice, getEvent } from "@/data/events";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = getEvent((await params).slug);
  return { title: event?.title ?? "Event" };
}

export function generateStaticParams() { return events.map(({ slug }) => ({ slug })); }

export default async function EventDetailPage({ params }: Props) {
  const event = getEvent((await params).slug);
  if (!event) notFound();
  const related = events.filter((item) => item.slug !== event.slug).slice(0, 3);

  return (
    <div className="bg-paper">
      <section className="bg-ink text-white"><div className="site-container grid gap-12 py-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:py-20"><EventPoster event={event} className="aspect-[4/5] w-full max-w-[540px] shadow-[16px_16px_0_#b6ff00]"/><div className="lg:pl-8"><span className="eyebrow"><span className="h-2 w-2 rounded-full bg-lime" />{event.category} · {event.tag}</span><h1 className="mt-7 text-5xl font-black uppercase leading-[.92] text-white sm:text-7xl lg:text-[88px]">{event.title}</h1><p className="mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">{event.description}</p><div className="mt-9 grid gap-4 border-y border-white/15 py-7 sm:grid-cols-2"><span className="detail-line"><CalendarIcon /> <span><small>Date & time</small>{event.date}<br />{event.time}</span></span><span className="detail-line"><PinIcon /> <span><small>Venue</small>{event.venue}<br />{event.city}</span></span></div><div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><span className="block text-xs font-bold uppercase tracking-widest text-white/40">Ticket starts from</span><strong className="mt-1 block text-2xl text-lime">{formatPrice(event.price)}</strong></div><Link href={`/checkout/${event.slug}`} className="button button-lime button-large"><TicketIcon className="h-5 w-5"/> Get tickets</Link></div></div></div></section>
      <section className="section-space"><div className="site-container grid gap-14 lg:grid-cols-[1fr_360px]"><div><span className="section-index">THE DETAILS</span><h2 className="mt-4 text-4xl font-black uppercase sm:text-6xl">KNOW BEFORE<br />YOU GO.</h2><div className="prose-copy mt-8"><p>Doors open 60 minutes before the event begins. Please have your digital ticket ready on your phone when you arrive.</p><p>Each ticket is valid for one person and one entry. Tickets are non-refundable, but may be transferred to another attendee before the event date.</p><h3>What’s included</h3><ul><li>General admission to the full event</li><li>Digital QR ticket delivered instantly</li><li>Access to all public program areas</li></ul></div></div><aside className="h-fit border-2 border-ink bg-white p-7 shadow-[9px_9px_0_#111]"><span className="tag">Important</span><h3 className="mt-5 text-2xl font-black uppercase">Bring the essentials.</h3><ul className="mt-5 space-y-3 text-sm font-semibold text-black/60"><li>Valid photo identification</li><li>Your digital ticket QR code</li><li>A refillable water bottle</li></ul><div className="mt-7 border-t border-black/10 pt-5 text-xs leading-5 text-black/45">By purchasing, you agree to the organizer’s entry policy and SiTIKET terms.</div></aside></div></section>
      <section className="border-t border-black/10 bg-white py-20"><div className="site-container"><div className="section-heading"><div><span className="section-index">KEEP EXPLORING</span><h2>YOU MAY ALSO LIKE.</h2></div></div><div className="mt-10 grid gap-6 md:grid-cols-3">{related.map((item) => <EventCard key={item.slug} event={item}/>)}</div></div></section>
    </div>
  );
}
