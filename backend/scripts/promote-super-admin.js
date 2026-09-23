import "dotenv/config";
import knexFactory from "knex";
import knexConfig from "../knexfile.js";
import { toWhatsappId } from "../src/utils/phone.js";

/**
 * One-off bootstrap: promote an existing user (must have already signed in
 * with Google at least once) to super_admin. There is no self-serve path to
 * this role by design — see docs/business/DATABASE_DESIGN.md §4.1.
 *
 * The WhatsApp number is required: the WhatsApp bot recognises a Super Admin
 * by it (services/whatsapp-bot-service.js `resolveSender`). Re-running the
 * script for an existing super_admin just updates their number.
 *
 * Usage: npm run db:promote-super-admin -- someone@example.com 081234567890
 */
const [email, phone] = process.argv.slice(2);

if (!email || !phone) {
  console.error("Usage: npm run db:promote-super-admin -- <email> <whatsapp-phone>");
  console.error("Example: npm run db:promote-super-admin -- owner@sitiket.com 081234567890");
  process.exit(1);
}

if (toWhatsappId(phone).length < 8) {
  console.error(`"${phone}" doesn't look like a phone number. Use e.g. 081234567890 or +6281234567890.`);
  process.exit(1);
}

const knex = knexFactory(knexConfig);

try {
  const updated = await knex("users").where({ email }).update({ role: "super_admin", phone, updated_at: new Date() });

  if (updated === 0) {
    console.error(`No user found with email "${email}". They must sign in with Google at least once first.`);
    process.exit(1);
  }

  console.log(`Promoted "${email}" to super_admin (WhatsApp ${toWhatsappId(phone)}).`);
} finally {
  await knex.destroy();
}
