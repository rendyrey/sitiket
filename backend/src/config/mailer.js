import nodemailer from "nodemailer";
import { env } from "./env.js";

/** `null` when SMTP isn't configured — callers fall back to logging instead of sending. */
export const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : null;

/**
 * Sends an email through the configured SMTP transport.
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
