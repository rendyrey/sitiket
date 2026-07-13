import ActionLink from "@/components/ui/action-link";
import { ArrowUpRight } from "@/components/site/icons";

export default function HomeCta() {
  return (
    <section className="overflow-hidden bg-paper py-16 sm:py-24 lg:py-32">
      <div className="site-container relative">
        <div className="absolute -right-16 -top-24 text-[230px] font-black leading-none text-black/[.035]">
          GO
        </div>
        <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <span className="section-index">NEXT WEEKEND IS CALLING</span>
            <h2 className="mt-4 text-4xl font-black uppercase leading-[.92] xs:text-5xl sm:text-7xl">
              MAKE A PLAN.
              <br />
              GET THE TICKET.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-black/55">
              The best memories rarely start with staying home. See what’s
              happening around you.
            </p>
          </div>
          <ActionLink href="/events" size="large" className="shrink-0">
            Find an event <ArrowUpRight className="h-5 w-5" />
          </ActionLink>
        </div>
      </div>
    </section>
  );
}
