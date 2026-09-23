import {
  CategoryStrip,
  FeaturedEvents,
  HomeCta,
  HomeHero,
  HowItWorks,
  TelegramBotCta,
} from "@/features/home/components";
import { listPublicEvents, toEventItemsWithDetails } from "@/features/events/lib/api";

export default async function HomePage() {
  const { events } = await listPublicEvents({ pageSize: 4 });
  const items = await toEventItemsWithDetails(events);

  return (
    <>
      <HomeHero featuredEvent={items[0]} />
      <CategoryStrip />
      <FeaturedEvents events={items.slice(0, 3)} />
      <HowItWorks />
      <TelegramBotCta />
      <HomeCta />
    </>
  );
}
