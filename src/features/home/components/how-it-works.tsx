import type { ComponentType, SVGProps } from "react";
import { CalendarIcon, PinIcon, TicketIcon } from "@/components/site/icons";

type Step = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  number: string;
  text: string;
  title: string;
};

const steps: Step[] = [
  {
    number: "01",
    icon: CalendarIcon,
    title: "Find your thing",
    text: "Browse handpicked events by date, category, or whatever mood you’re in.",
  },
  {
    number: "02",
    icon: TicketIcon,
    title: "Claim your spot",
    text: "Pick your ticket, check the details, and pay securely in a few taps.",
  },
  {
    number: "03",
    icon: PinIcon,
    title: "Show up",
    text: "Your digital ticket is ready when you are. Scan in and enjoy the moment.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-space bg-ink text-white">
      <div className="site-container">
        <span className="section-index text-lime">02 / ZERO FUSS</span>
        <h2 className="mt-4 max-w-4xl text-4xl font-black uppercase leading-[.95] text-white xs:text-5xl sm:text-7xl">
          FROM “MAYBE” TO
          <br />
          <span className="text-lime">SEE YOU THERE.</span>
        </h2>
        <div className="mt-10 grid border-l border-t border-white/15 sm:mt-16 md:grid-cols-3">
          {steps.map((step) => (
            <HowItWorksStep key={step.number} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksStep({ icon: Icon, number, text, title }: Step) {
  return (
    <div className="border-b border-r border-white/15 p-7 sm:p-9">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white/35">{number}</span>
        <Icon className="h-7 w-7 text-lime" />
      </div>
      <h3 className="mt-10 text-2xl font-bold uppercase text-white sm:mt-16">
        {title}
      </h3>
      <p className="mt-3 max-w-xs leading-6 text-white/50">{text}</p>
    </div>
  );
}
