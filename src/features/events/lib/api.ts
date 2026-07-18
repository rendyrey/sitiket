import { apiFetch, apiFetchPage } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { toEventImage, toTaxonomyItem, toTicketType } from "@/lib/api/normalize";
import type {
  ApiPageMeta,
  Event,
  EventImage,
  ListEventsQuery,
  RawEventImage,
  RawTaxonomy,
  RawTicketType,
  TaxonomyItem,
  TicketType,
} from "@/lib/api/types";
import type { EventItem } from "@/data/events";
import { toEventItem } from "./to-event-item";

/** Server-only. Public event catalog (published + visible only). */
export const listPublicEvents = async (query?: ListEventsQuery): Promise<{ events: Event[]; meta: ApiPageMeta }> => {
  const { data, meta } = await apiFetchPage<Event>("/api/events", { query });
  return { events: data, meta };
};

/** Server-only. `null` if the event doesn't exist or isn't visible to the current viewer. */
export const getEventBySlug = async (slug: string): Promise<Event | null> => {
  try {
    return await apiFetch<Event>(`/api/events/${slug}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};

/** Server-only. Active ticket tiers for the buyer-facing checkout flow. */
export const listPublicTicketTypes = async (eventId: string): Promise<TicketType[]> => {
  const raw = await apiFetch<RawTicketType[]>(`/api/events/${eventId}/ticket-types`);
  return raw.map(toTicketType);
};

/** Server-only. */
export const listEventImages = async (eventId: string): Promise<EventImage[]> => {
  const raw = await apiFetch<RawEventImage[]>(`/api/events/${eventId}/images`);
  return raw.map(toEventImage);
};

/** Server-only. Super-Admin-managed taxonomy, active entries only. */
export const listEventCategories = async (): Promise<TaxonomyItem[]> => {
  const raw = await apiFetch<RawTaxonomy[]>("/api/event-categories");
  return raw.map(toTaxonomyItem);
};

/** Server-only. Super-Admin-managed taxonomy (Early Bird/Pre Sale/Regular), active entries only. */
export const listTicketCategories = async (): Promise<TaxonomyItem[]> => {
  const raw = await apiFetch<RawTaxonomy[]>("/api/ticket-categories");
  return raw.map(toTaxonomyItem);
};

/**
 * Server-only. Fetches each event's ticket types + images in parallel and
 * adapts the result into the legacy `EventItem` shape — see
 * `to-event-item.ts` for why.
 */
export const toEventItemsWithDetails = async (events: Event[]): Promise<EventItem[]> =>
  Promise.all(
    events.map(async (event) => {
      const [ticketTypes, images] = await Promise.all([listPublicTicketTypes(event.id), listEventImages(event.id)]);
      return toEventItem(event, ticketTypes, images);
    }),
  );
