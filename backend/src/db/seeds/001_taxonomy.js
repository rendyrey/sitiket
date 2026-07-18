// Fixed IDs so re-running the seed against the same database is idempotent
// (insert-or-update by primary key) instead of duplicating rows.
const eventCategories = [
  { id: "10000000-0000-0000-0000-000000000001", name: "Sports", slug: "sports", sort_order: 1 },
  { id: "10000000-0000-0000-0000-000000000002", name: "Comedy", slug: "comedy", sort_order: 2 },
  { id: "10000000-0000-0000-0000-000000000003", name: "Game", slug: "game", sort_order: 3 },
  { id: "10000000-0000-0000-0000-000000000004", name: "Live Music", slug: "live-music", sort_order: 4 },
  { id: "10000000-0000-0000-0000-000000000005", name: "Concert", slug: "concert", sort_order: 5 },
  { id: "10000000-0000-0000-0000-000000000006", name: "Community", slug: "community", sort_order: 6 },
];

const ticketCategories = [
  { id: "20000000-0000-0000-0000-000000000001", name: "Early Bird", slug: "early-bird", sort_order: 1 },
  { id: "20000000-0000-0000-0000-000000000002", name: "Pre Sale", slug: "pre-sale", sort_order: 2 },
  { id: "20000000-0000-0000-0000-000000000003", name: "Regular", slug: "regular", sort_order: 3 },
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const seed = async (knex) => {
  for (const row of eventCategories) {
    await knex("event_categories").insert(row).onConflict("id").merge();
  }
  for (const row of ticketCategories) {
    await knex("ticket_categories").insert(row).onConflict("id").merge();
  }
};
