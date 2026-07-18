import { env } from "../config/env.js";
import { sendMail } from "../config/mailer.js";
import * as usersRepository from "../repositories/users-repository.js";

const orderUrl = (orderId) => `${env.FRONTEND_URL}/orders/${orderId}`;

/**
 * Fire-and-log wrapper around `sendMail` — a notification failing to send
 * must never fail the state change it's attached to (a payment approval,
 * a refund decision, etc. already committed by the time we notify).
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 */
const notify = async (message) => {
  try {
    await sendMail(message);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[notification] failed to send "${message.subject}" to ${message.to}:`, error.message);
  }
};

/**
 * Tells every super_admin a new organizer application is awaiting review.
 * @param {object} application - an `admin_applications` row
 * @param {object} applicant - the applying user's row
 */
export const notifyAdminApplicationSubmitted = async (application, applicant) => {
  const superAdmins = await usersRepository.listByRole("super_admin");
  await Promise.all(
    superAdmins.map((superAdmin) =>
      notify({
        to: superAdmin.email,
        subject: `New organizer application: ${application.business_name}`,
        text: `${applicant.name} (${applicant.email}) applied to become an event organizer as "${application.business_name}". Review it in the dashboard.`,
        html: `<p><strong>${applicant.name}</strong> (${applicant.email}) applied to become an event organizer as "${application.business_name}".</p><p>Review it in the Super Admin dashboard.</p>`,
      }),
    ),
  );
};

/**
 * Tells the applicant their organizer application was approved or rejected.
 * @param {object} application - an `admin_applications` row
 * @param {object} applicant - the applicant's user row
 * @param {"approved" | "rejected"} decision
 */
export const notifyAdminApplicationDecision = async (application, applicant, decision) => {
  const approved = decision === "approved";
  await notify({
    to: applicant.email,
    subject: approved ? "Your organizer application was approved" : "Your organizer application was rejected",
    text: approved
      ? `Good news — your application as "${application.business_name}" was approved. You can now create events.`
      : `Your application as "${application.business_name}" was rejected.${application.review_notes ? ` Reason: ${application.review_notes}` : ""}`,
    html: approved
      ? `<p>Good news — your application as "${application.business_name}" was approved. You can now create events.</p>`
      : `<p>Your application as "${application.business_name}" was rejected.</p>${application.review_notes ? `<p>Reason: ${application.review_notes}</p>` : ""}`,
  });
};

/**
 * Sends the buyer their ticket codes once a payment proof is approved.
 * @param {object} order - an `orders` row
 * @param {object[]} tickets - rows from `ticketsRepository.listByOrderWithContext`
 */
export const notifyOrderPaid = async (order, tickets) => {
  const codeList = tickets.map((ticket) => `- ${ticket.ticket_type_name}: ${ticket.ticket_code}`).join("\n");
  await notify({
    to: order.buyer_email,
    subject: "Your payment was confirmed — here are your tickets",
    text: `Hi ${order.buyer_name}, your payment for order ${order.id} was confirmed.\n\nYour tickets:\n${codeList}\n\nView them at ${orderUrl(order.id)}`,
    html: `<p>Hi ${order.buyer_name}, your payment for order <strong>${order.id}</strong> was confirmed.</p><p>Your tickets:</p><ul>${tickets.map((ticket) => `<li>${ticket.ticket_type_name}: <strong>${ticket.ticket_code}</strong></li>`).join("")}</ul><p><a href="${orderUrl(order.id)}">View your tickets</a></p>`,
  });
};

/**
 * Tells the buyer their uploaded payment proof was rejected so they can re-submit.
 * @param {object} order - an `orders` row
 * @param {string} [reviewerNotes]
 */
export const notifyPaymentProofRejected = async (order, reviewerNotes) => {
  await notify({
    to: order.buyer_email,
    subject: `Payment proof rejected for order ${order.id}`,
    text: `Hi ${order.buyer_name}, the payment proof you submitted for order ${order.id} was rejected.${reviewerNotes ? ` Reason: ${reviewerNotes}` : ""} Please upload a new proof at ${orderUrl(order.id)}`,
    html: `<p>Hi ${order.buyer_name}, the payment proof you submitted for order <strong>${order.id}</strong> was rejected.</p>${reviewerNotes ? `<p>Reason: ${reviewerNotes}</p>` : ""}<p><a href="${orderUrl(order.id)}">Upload a new proof</a></p>`,
  });
};

/** @param {object} order - an `orders` row */
export const notifyOrderCancelled = async (order) => {
  await notify({
    to: order.buyer_email,
    subject: `Order ${order.id} was cancelled`,
    text: `Hi ${order.buyer_name}, your order ${order.id} was cancelled.`,
    html: `<p>Hi ${order.buyer_name}, your order <strong>${order.id}</strong> was cancelled.</p>`,
  });
};

/** @param {object} order - an `orders` row */
export const notifyOrderExpired = async (order) => {
  await notify({
    to: order.buyer_email,
    subject: `Order ${order.id} expired`,
    text: `Hi ${order.buyer_name}, the payment window for order ${order.id} closed before a payment proof was submitted, so it has expired and its tickets were released back for sale.`,
    html: `<p>Hi ${order.buyer_name}, the payment window for order <strong>${order.id}</strong> closed before a payment proof was submitted, so it has expired and its tickets were released back for sale.</p>`,
  });
};

const REFUND_STATUS_COPY = {
  requested: {
    subject: (orderId) => `Refund requested for order ${orderId}`,
    body: (order) => `Hi ${order.buyer_name}, we've received your refund request for order ${order.id}. We'll email you once it's reviewed.`,
  },
  approved: {
    subject: (orderId) => `Refund approved for order ${orderId}`,
    body: (order) => `Hi ${order.buyer_name}, your refund request for order ${order.id} was approved. The money transfer will follow.`,
  },
  rejected: {
    subject: (orderId) => `Refund rejected for order ${orderId}`,
    body: (order, notes) => `Hi ${order.buyer_name}, your refund request for order ${order.id} was rejected.${notes ? ` Reason: ${notes}` : ""}`,
  },
  completed: {
    subject: (orderId) => `Refund completed for order ${orderId}`,
    body: (order) => `Hi ${order.buyer_name}, your refund for order ${order.id} has been sent. Its tickets are no longer valid for entry.`,
  },
};

/**
 * Tells the buyer their refund request's status changed.
 * @param {object} order - an `orders` row
 * @param {"requested" | "approved" | "rejected" | "completed"} status
 * @param {string} [notes]
 */
export const notifyRefundStatus = async (order, status, notes) => {
  const copy = REFUND_STATUS_COPY[status];
  const text = copy.body(order, notes);
  await notify({
    to: order.buyer_email,
    subject: copy.subject(order.id),
    text,
    html: `<p>${text}</p>`,
  });
};
