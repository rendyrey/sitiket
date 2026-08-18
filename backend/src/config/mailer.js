import nodemailer from "nodemailer";
import { env } from "./env.js";
import { open } from "../utils/secret-box.js";

/**
 * Platform transport — used only for platform emails (super-admin /
 * organizer-application notifications). Buyer-facing email rides the event
 * organizer's own SMTP via {@link getOrganizerTransport}.
 * `null` when SMTP isn't configured — callers fall back to logging instead of sending.
 */
export const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : null;

/**
 * Builds a nodemailer transport from an `organizer_email_configs` row —
 * shared by the email worker (delivery) and the config service (verify-on-save).
 * @param {object} config - an `organizer_email_configs` row
 * @param {string} [plainPassword] - pass the plaintext during verify-on-save,
 *   before it's been encrypted; omitted, the row's stored password is decrypted.
 */
export const createOrganizerTransport = (config, plainPassword) =>
  nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: Boolean(config.smtp_secure),
    auth: { user: config.from_email, pass: plainPassword ?? open(config.smtp_password_encrypted) },
  });

/** Cache: one live transport per organizer, invalidated when their config row changes. */
const organizerTransports = new Map();

/** @param {object} config - an `organizer_email_configs` row */
export const getOrganizerTransport = (config) => {
  const freshness = config.updated_at instanceof Date ? config.updated_at.getTime() : String(config.updated_at);
  const key = `${config.id}:${freshness}`;
  const cached = organizerTransports.get(config.owner_id);
  if (cached?.key === key) return cached.transport;

  const transport = createOrganizerTransport(config);
  organizerTransports.set(config.owner_id, { key, transport });
  return transport;
};

/**
 * The `From:` header for an organizer's outgoing email.
 * @param {object} config - an `organizer_email_configs` row
 */
export const organizerFromHeader = (config) =>
  config.from_name ? `"${config.from_name.replaceAll('"', "'")}" <${config.from_email}>` : config.from_email;

/**
 * Sends an email through the platform SMTP transport.
 *
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 * @returns {Promise<boolean>} Whether an email was actually sent (false when SMTP isn't configured).
 */
export const sendMail = async ({ to, subject, text, html }) => {
  if (!transporter) return false;

  await transporter.sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return true;
};
