import Link from "next/link";
import ActionLink from "@/components/ui/action-link";
import { ArrowRight, ArrowUpRight } from "@/components/site/icons";
import type { EventItem } from "@/data/events";
import { EventPoster } from "@/features/events/components";

export default function HomeHero({
  featuredEvent,
}: {
  featuredEvent?: EventItem;
}) {
  return (
    <section className="hero-section">
      <div className="hero-noise" />
      <div className="site-container relative grid items-center gap-16 pb-20 pt-12 sm:pb-24 sm:pt-16 lg:min-h-[680px] lg:grid-cols-[1.05fr_.95fr] lg:gap-12 lg:py-24">
        <div className="relative z-10">
          <span className="eyebrow">
            <span className="h-2 w-2 rounded-full bg-lime" />
            Jakarta’s event shortcut
          </span>
          <h1 className="hero-title mt-8">
            DON’T JUST
            <br />
            <span>HEAR ABOUT IT.</span>
            <br />
            BE THERE.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-white/65 sm:text-lg">
            Find the nights, matches, markets, and moments worth leaving the
            group chat for.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ActionLink href="/events" variant="lime" size="large">
              Explore events <ArrowRight className="h-5 w-5" />
            </ActionLink>
            <ActionLink href="#how-it-works" variant="outline" size="large">
              How it works
            </ActionLink>
          </div>
        </div>
        {featuredEvent && <FeaturedArtwork event={featuredEvent} />}
      </div>
    </section>
  );
}

function FeaturedArtwork({ event }: { event: EventItem }) {
  return (
    <div className="relative mx-auto w-[calc(100%-0.75rem)] max-w-[520px] sm:w-[calc(100%-1.25rem)] lg:mr-5">
      <div className="absolute -left-2 -top-3 h-full w-full border-2 border-lime/40 sm:-left-4 sm:-top-5" />
      <EventPoster
        event={event}
        className="relative aspect-[4/5] shadow-[10px_10px_0_#b6ff00] sm:shadow-[20px_20px_0_#b6ff00]"
      />
      <Link
        href={`/events/${event.slug}`}
        className="absolute -bottom-6 left-0 flex max-w-[calc(100%-0.5rem)] items-center gap-3 bg-white p-4 text-black shadow-xl sm:-left-5 sm:max-w-[90%] sm:gap-4 sm:p-5"
      >
        <div className="min-w-0">
          <span className="block text-[10px] font-bold uppercase tracking-widest text-black/45">
            Next up · {event.date}
          </span>
          <strong className="mt-1 block truncate text-base uppercase sm:text-xl">
            {event.title}
          </strong>
        </div>
        <ArrowUpRight className="h-6 w-6 shrink-0" />
      </Link>
    </div>
  );
}
