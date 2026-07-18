import "dotenv/config";
import knexFactory from "knex";
import knexConfig from "../knexfile.js";

/**
 * One-off bootstrap: promote an existing user (must have already signed in
 * with Google at least once) to super_admin. There is no self-serve path to
 * this role by design — see docs/business/DATABASE_DESIGN.md §4.1.
 *
 * Usage: npm run db:promote-super-admin -- someone@example.com
 */
const email = process.argv[2];

if (!email) {
  console.error("Usage: npm run db:promote-super-admin -- <email>");
  process.exit(1);
}

const knex = knexFactory(knexConfig);

try {
  const updated = await knex("users").where({ email }).update({ role: "super_admin", updated_at: new Date() });

  if (updated === 0) {
    console.error(`No user found with email "${email}". They must sign in with Google at least once first.`);
    process.exit(1);
  }

  console.log(`Promoted "${email}" to super_admin.`);
} finally {
  await knex.destroy();
}
