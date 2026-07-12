import Link from "next/link";
import EventCard from "@/components/site/event-card";
import EventPoster from "@/components/site/event-poster";
import { ArrowRight, ArrowUpRight, CalendarIcon, PinIcon, TicketIcon } from "@/components/site/icons";
import { events, formatPrice } from "@/data/events";

export default function HomePage() {
  const featured = events[1];
  return (
    <>
      <section className="hero-section">
        <div className="hero-noise" />
        <div className="site-container relative grid min-h-[680px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div className="relative z-10">
            <span className="eyebrow"><span className="h-2 w-2 rounded-full bg-lime" /> Jakarta’s event shortcut</span>
            <h1 className="hero-title mt-8">DON’T JUST<br /><span>HEAR ABOUT IT.</span><br />BE THERE.</h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-white/65 sm:text-lg">Find the nights, matches, markets, and moments worth leaving the group chat for.</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href="/events" className="button button-lime button-large">Explore events <ArrowRight className="h-5 w-5" /></Link><a href="#how-it-works" className="button button-outline button-large">How it works</a></div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px] lg:mr-0">
            <div className="absolute -left-4 -top-5 h-full w-full border-2 border-lime/40" />
            <EventPoster event={featured} className="relative aspect-[4/5] shadow-[20px_20px_0_#b6ff00]" />
            <Link href={`/events/${featured.slug}`} className="absolute -bottom-6 -left-5 flex max-w-[90%] items-center gap-4 bg-white p-4 text-black shadow-xl sm:p-5"><div className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-widest text-black/45">Next up · {featured.date}</span><strong className="mt-1 block truncate text-base uppercase sm:text-xl">{featured.title}</strong></div><ArrowUpRight className="h-6 w-6 shrink-0" /></Link>
          </div>
        </div>
      </section>

      <section className="bg-lime py-5 text-black"><div className="marquee-row"><span>LIVE MUSIC</span><i>✦</i><span>COMMUNITY</span><i>✦</i><span>SPORT</span><i>✦</i><span>COMEDY</span><i>✦</i><span>GOOD TIMES</span></div></section>

      <section className="section-space bg-paper">
        <div className="site-container">
          <div className="section-heading"><div><span className="section-index">01 / CURATED FOR YOU</span><h2>EVENTS WORTH<br />SHOWING UP FOR.</h2></div><Link href="/events" className="text-link">View all events <ArrowRight className="h-5 w-5" /></Link></div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{events.slice(0, 3).map((event) => <EventCard key={event.slug} event={event} />)}</div>
        </div>
      </section>

      <section id="how-it-works" className="section-space bg-ink text-white">
        <div className="site-container"><span className="section-index text-lime">02 / ZERO FUSS</span><h2 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[.95] text-white sm:text-7xl">FROM “MAYBE” TO<br /><span className="text-lime">SEE YOU THERE.</span></h2>
          <div className="mt-16 grid border-l border-t border-white/15 md:grid-cols-3">
            {[{ n:"01", icon: CalendarIcon, title:"Find your thing", text:"Browse handpicked events by date, category, or whatever mood you’re in." },{ n:"02", icon: TicketIcon, title:"Claim your spot", text:"Pick your ticket, check the details, and pay securely in a few taps." },{ n:"03", icon: PinIcon, title:"Show up", text:"Your digital ticket is ready when you are. Scan in and enjoy the moment." }].map(({n,icon:Icon,title,text}) => <div key={n} className="border-b border-r border-white/15 p-7 sm:p-9"><div className="flex items-center justify-between"><span className="text-xs font-bold text-white/35">{n}</span><Icon className="h-7 w-7 text-lime" /></div><h3 className="mt-16 text-2xl font-bold uppercase text-white">{title}</h3><p className="mt-3 max-w-xs leading-6 text-white/50">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-paper py-24 sm:py-32"><div className="site-container relative"><div className="absolute -right-16 -top-24 text-[230px] font-black leading-none text-black/[.035]">GO</div><div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end"><div><span className="section-index">NEXT WEEKEND IS CALLING</span><h2 className="mt-4 text-5xl font-black uppercase leading-[.92] sm:text-7xl">MAKE A PLAN.<br />GET THE TICKET.</h2><p className="mt-6 max-w-lg text-base leading-7 text-black/55">The best memories rarely start with staying home. See what’s happening around you.</p></div><Link href="/events" className="button button-dark button-large shrink-0">Find an event <ArrowUpRight className="h-5 w-5" /></Link></div></div></section>
    </>
  );
}
