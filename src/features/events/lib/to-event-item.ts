import type { EventItem } from "@/data/events";
import type { Event, EventImage, TicketType } from "@/lib/api/types";
import { toAssetUrl } from "@/lib/public-env";
import { formatEventDate, formatEventTime } from "./format";
import { themeForCategory } from "./theme";

const LOW_STOCK_THRESHOLD = 10;

const computeTag = (ticketTypes: TicketType[]): string => {
  if (ticketTypes.length === 0) return "";
  const remaining = ticketTypes.reduce((sum, ticketType) => sum + Math.max(ticketType.quantityTotal - ticketType.quantitySold, 0), 0);
  if (remaining <= 0) return "Sold out";
  if (remaining <= LOW_STOCK_THRESHOLD) return "Selling fast";
  return "";
};

const minPrice = (ticketTypes: TicketType[]): number => (ticketTypes.length ? Math.min(...ticketTypes.map((t) => t.price)) : 0);

/**
 * Adapts a real backend `Event` (+ its ticket types and images) into the
 * `EventItem` shape the existing presentational components
 * (EventCard/EventGrid/EventPoster/EventDetailHero/EventFilters/...)
 * already expect — this is the only reason those components can stay
 * completely unchanged while their data source moves from
 * `src/data/events.ts` mocks to the real API.
 */
export const toEventItem = (event: Event, ticketTypes: TicketType[], images: EventImage[]): EventItem => {
  const poster = images.find((image) => image.isPoster);

  return {
    slug: event.slug,
    title: event.name,
    category: event.category.name,
    date: formatEventDate(event.startDate),
    time: formatEventTime(event.startDate),
    venue: event.venueName ?? (event.meetingPlatform ? "Online event" : "TBA"),
    city: event.city ?? "Online",
    price: minPrice(ticketTypes),
    tag: computeTag(ticketTypes),
    theme: themeForCategory(event.category.slug),
    image: poster ? toAssetUrl(poster.imageUrl) : undefined,
    description: event.description,
  };
};
