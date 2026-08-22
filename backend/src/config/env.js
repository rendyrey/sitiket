import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url(),

  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),

  // Optional: routes that need it fail with a clear 500 at call time instead of
  // blocking every other endpoint from booting before Google OAuth is set up.
  // Preprocessed because an unset .env value arrives as "" here, not undefined.
  GOOGLE_CLIENT_ID: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional()),
  // Optional: required only for the "Connect Gmail" organizer email flow —
  // the OAuth code exchange needs the client secret (same OAuth client as
  // GOOGLE_CLIENT_ID, with the /api/auth/google-mail/callback redirect URI).
  GOOGLE_CLIENT_SECRET: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional()),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  QR_SIGNING_SECRET: z.string().min(32, "QR_SIGNING_SECRET must be at least 32 characters"),

  UPLOAD_DIR: z.string().default("uploads"),

  ORDER_PAYMENT_HOLD_MINUTES: z.coerce.number().int().positive().default(10),
  // Merch stock is far less time-critical than event tickets, so its manual
  // bank-transfer window follows the e-commerce norm (24h) instead of 10 min.
  MERCH_PAYMENT_HOLD_HOURS: z.coerce.number().int().positive().default(24),
  GUEST_EMAIL_OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),

  // Optional: dedicated key for encrypting organizer SMTP passwords at rest
  // (utils/secret-box.js). Falls back to a JWT_SECRET-derived key when unset.
  EMAIL_CONFIG_SECRET: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(16).optional()),

  // Optional: enables embedding-based semantic merch search via the Voyage AI
  // API (services/embedding-service.js). Unset, catalog search degrades
  // gracefully to FULLTEXT + fuzzy matching only.
  VOYAGE_API_KEY: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional()),
  // Alternative to VOYAGE_API_KEY: any OpenAI-compatible /embeddings endpoint
  // (OpenAI, DeepInfra, a future Kilo Gateway embeddings rollout, a local
  // server, …). All three must be set together; when they are, they take
  // precedence over VOYAGE_API_KEY. EMBEDDINGS_BASE_URL is the /v1 root,
  // e.g. "https://api.openai.com/v1"; EMBEDDINGS_MODEL must be an embedding
  // model (chat models like deepseek-chat cannot produce embeddings).
  EMBEDDINGS_BASE_URL: z.preprocess((value) => (value === "" ? undefined : value), z.string().url().optional()),
  EMBEDDINGS_API_KEY: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional()),
  EMBEDDINGS_MODEL: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional()),
  // Optional cosine-similarity cutoff override for semantic candidates.
  // Absolute similarity ranges differ per embedding model family, so the
  // default is per-provider: 0.45 for Voyage, 0.35 for OpenAI-compatible
  // (measured against text-embedding-3-large; see embedding-service.js).
  EMBEDDINGS_MIN_SIMILARITY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().min(0).max(1).optional(),
  ),

  // Optional: api.co.id API key for Indonesian region data (address pickers)
  // and expedition shipping-cost quotes (services/regional-service.js,
  // services/shipping-service.js). Unset, region/shipping endpoints answer
  // 501 SHIPPING_NOT_CONFIGURED while the rest of the app keeps working.
  API_CO_ID_KEY: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional()),
  // Time-window sizes for the DB-side api.co.id caches (both vendor plans are
  // credit-limited). Region lists are near-static → days; courier prices
  // drift → hours.
  REGION_CACHE_DAYS: z.coerce.number().positive().default(30),
  SHIPPING_COST_CACHE_HOURS: z.coerce.number().positive().default(24),

  // Optional: outgoing SMTP for the guest-checkout OTP email. Unset in dev,
  // the OTP just logs server-side (and echoes in the response) instead.
  SMTP_HOST: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional()),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: z.preprocess((value) => value === undefined ? "true" : value, z.enum(["true", "false"])).transform((value) => value === "true"),
  SMTP_USER: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional()),
  SMTP_PASSWORD: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional()),
  SMTP_FROM: z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional()),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
