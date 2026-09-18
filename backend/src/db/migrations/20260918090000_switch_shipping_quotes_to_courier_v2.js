/**
 * Moves merch shipping quotes onto the api.co.id Cek Ongkir v2 API
 * (`/courier/v2/rates`), which keys lanes on 6-digit district codes and names
 * couriers in lowercase slugs (`jne`, `sicepat`) instead of v1's 10-digit
 * village codes and mixed-case names.
 *
 * Two effects: the quote cache is re-keyed on districts (dropped and
 * recreated — every cached row is a v1 village-keyed quote that can never be
 * hit again), and each seller's `enabled_couriers` whitelist is rewritten to
 * v2 codes, since a stale v1 code would silently filter every courier out of
 * that seller's checkout.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

/** v1 courier code → its v2 equivalent. Codes with no v2 counterpart are dropped. */
const V1_TO_V2 = {
  JNE: "jne",
  JNECargo: "jne",
  SiCepat: "sicepat",
  SiCepatCargo: "sicepat",
  SAP: "sap",
  SAPLite: "sap",
  SapCargo: "sap",
  iDexpress: "idx",
  iDlite: "idx",
  iDexpressCargo: "idx",
  JT: "jnt",
  lion: "lion",
  anteraja: "anteraja",
  Ninja: "ninja",
};

export const up = async (knex) => {
  await knex.schema.dropTableIfExists("shipping_cost_cache");
  await knex.schema.createTable("shipping_cost_cache", (table) => {
    table.string("origin_district_code", 16).notNullable();
    table.string("destination_district_code", 16).notNullable();
    table.integer("weight_kg").unsigned().notNullable();
    table.json("couriers").notNullable();
    table.datetime("fetched_at").notNullable();

    table.primary(["origin_district_code", "destination_district_code", "weight_kg"]);
  });

  const origins = await knex("seller_shipping_origins").whereNotNull("enabled_couriers").select("id", "enabled_couriers");
  for (const origin of origins) {
    const v1Codes = typeof origin.enabled_couriers === "string" ? JSON.parse(origin.enabled_couriers) : origin.enabled_couriers;
    if (!Array.isArray(v1Codes) || v1Codes.length === 0) continue;
    const v2Codes = [...new Set(v1Codes.map((code) => V1_TO_V2[code]).filter(Boolean))];
    // An empty result means the seller whitelisted only couriers v2 dropped —
    // null (= "offer every courier") beats a whitelist that blocks all of them.
    await knex("seller_shipping_origins")
      .where({ id: origin.id })
      .update({ enabled_couriers: v2Codes.length ? JSON.stringify(v2Codes) : null });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("shipping_cost_cache");
  await knex.schema.createTable("shipping_cost_cache", (table) => {
    table.string("origin_village_code", 16).notNullable();
    table.string("destination_village_code", 16).notNullable();
    table.integer("weight_kg").unsigned().notNullable();
    table.json("couriers").notNullable();
    table.datetime("fetched_at").notNullable();

    table.primary(["origin_village_code", "destination_village_code", "weight_kg"]);
  });
};
