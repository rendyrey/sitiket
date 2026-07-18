import type { EventItem } from "@/data/events";

const THEME_BY_CATEGORY_SLUG: Record<string, EventItem["theme"]> = {
  sports: "blue",
  comedy: "pink",
  game: "silver",
  "live-music": "lime",
  concert: "orange",
  community: "lime",
};

const THEMES: EventItem["theme"][] = ["lime", "orange", "blue", "pink", "silver"];

/**
 * Deterministic placeholder-poster accent for an event category — used by
 * `EventPoster` when an event has no uploaded poster image yet. Falls back
 * to a stable hash of the slug for any category not in the curated map, so
 * a given category always renders the same accent color.
 */
export const themeForCategory = (categorySlug: string): EventItem["theme"] => {
  const known = THEME_BY_CATEGORY_SLUG[categorySlug];
  if (known) return known;

  const hash = categorySlug.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return THEMES[hash % THEMES.length];
};
