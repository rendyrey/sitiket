import { randomInt } from "node:crypto";
import { env } from "../config/env.js";
import { sendMail } from "../config/mailer.js";
import * as emailVerificationsRepository from "../repositories/email-verifications-repository.js";
import * as ordersRepository from "../repositories/orders-repository.js";
import { badRequest, notFound } from "../utils/http-error.js";

/**
 * Sends a 6-digit OTP to a guest buyer's email to satisfy the spec's
 * "prevent a false email from receiving the ticket" requirement before an
 * order can proceed to payment. See docs/business/DATABASE_DESIGN.md §4.8.
 *
 * Sends through SMTP when configured (see config/mailer.js); otherwise logs
 * the OTP server-side and, only outside production, also returns it in the
 * response so the guest checkout flow stays testable without SMTP set up.
 *
 * @param {string} orderId
 * @param {string} email
 * @returns {Promise<{ devCode?: string }>}
 */
export const requestGuestOtp = async (orderId, email) => {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + env.GUEST_EMAIL_OTP_TTL_MINUTES * 60 * 1000);

  await emailVerificationsRepository.create({ email, purpose: "guest_checkout", orderId, code, expiresAt });

  const sent = await sendMail({
    to: email,
    subject: `Your SiTIKET verification code: ${code}`,
    text: `Your verification code is ${code}. It expires in ${env.GUEST_EMAIL_OTP_TTL_MINUTES} minutes.`,
    html: `<p>Your verification code is <strong>${code}</strong>.</p><p>It expires in ${env.GUEST_EMAIL_OTP_TTL_MINUTES} minutes.</p>`,
  });

  if (!sent) {
    // eslint-disable-next-line no-console
    console.log(`[email-verification] OTP for order ${orderId} (${email}): ${code} (expires ${expiresAt.toISOString()})`);
  }

  return env.NODE_ENV === "production" ? {} : { devCode: code };
};

/**
 * @param {string} orderId
 * @param {string} code
 */
export const verifyGuestOtp = async (orderId, code) => {
  const order = await ordersRepository.findById(orderId);
  if (!order) throw notFound("ORDER_NOT_FOUND", "Order not found");

  const pending = await emailVerificationsRepository.findLatestPendingForOrder(orderId);
  if (!pending || pending.code !== code) {
    throw badRequest("INVALID_OTP", "Verification code is invalid or expired");
  }

  await emailVerificationsRepository.markVerified(pending.id);
  await ordersRepository.markGuestEmailVerified(orderId);
};
