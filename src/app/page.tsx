import { events } from "@/data/events";
import {
  CategoryStrip,
  FeaturedEvents,
  HomeCta,
  HomeHero,
  HowItWorks,
} from "@/features/home/components";

export default function HomePage() {
  return (
    <>
      <HomeHero featuredEvent={events[1]} />
      <CategoryStrip />
      <FeaturedEvents events={events.slice(0, 3)} />
      <HowItWorks />
      <HomeCta />
    </>
  );
}
