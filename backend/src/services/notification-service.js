import { env } from "../config/env.js";
import { enqueueEmail } from "./email-job-service.js";
import * as usersRepository from "../repositories/users-repository.js";
import {
  button,
  escapeHtml,
  infoPanel,
  paragraph,
  renderBrandedEmail,
  ticketPanel,
} from "../utils/email-template.js";

const orderUrl = (orderId, email) => `${env.FRONTEND_URL}/orders/${orderId}?email=${encodeURIComponent(email)}`;

const SPAM_FOOTNOTE = "Not in your inbox? Check your spam or promotions folder, and add us to your contacts so future tickets arrive.";

/** Readable event date in WIB (the primary market timezone). Returns null if absent/invalid. */
const formatEventDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${formatted} WIB`;
};

/** Event name / date / location rows for an `infoPanel`, skipping anything absent. */
const eventInfoRows = (event) => {
  const rows = [];
  if (event?.name) rows.push({ label: "Event", value: event.name });
  const when = formatEventDate(event?.start_date);
  if (when) rows.push({ label: "Date", value: when });
  const place = [event?.venue_name, event?.city].filter(Boolean).join(", ");
  if (place) rows.push({ label: "Location", value: place });
  return rows;
};

/**
 * The organizer's contact person for buyer-facing event emails — so a buyer
 * who needs help (wrong ticket, gate issue, refund question) can reach the
 * seller directly instead of dead-ending at a no-reply inbox.
 * @param {object} event - an `events` row (`contact_person_*` are NOT NULL on events)
 * @returns {Array<{ label: string, value: string }>} rows for an infoPanel; empty when unavailable
 */
const organizerContactRows = (event) => {
  const rows = [];
  if (event?.contact_person_name) rows.push({ label: "Contact person", value: event.contact_person_name });
  if (event?.contact_person_phone) rows.push({ label: "Phone", value: event.contact_person_phone });
  if (event?.contact_person_email) rows.push({ label: "Email", value: event.contact_person_email });
  return rows;
};

/** Plain-text twin of {@link organizerContactRows} for the `text` email body. */
const organizerContactText = (event) => {
  const rows = organizerContactRows(event);
  if (rows.length === 0) return "";
  return `\n\nNeed help? Contact the organizer:\n${rows.map((row) => `- ${row.label}: ${row.value}`).join("\n")}`;
};

/**
 * Fire-and-log wrapper around `enqueueEmail` — a notification failing to
 * queue must never fail the state change it's attached to (a payment
 * approval, a refund decision, etc. already committed by the time we
 * notify). The actual SMTP send happens later, off the request, via the
 * `email_jobs` background worker.
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 * @param {string} [ownerId] - buyer-facing email is routed through this event
 *   organizer's SMTP config; omitted, the platform SMTP is used.
 */
const notify = async (message, ownerId) => {
  try {
    await enqueueEmail(message, { ownerId });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[notification] failed to queue "${message.subject}" to ${message.to}:`, error.message);
  }
};

/**
 * Tells every super_admin a new organizer application is awaiting review.
 * @param {object} application - an `admin_applications` row
 * @param {object} applicant - the applying user's row
 */
export const notifyAdminApplicationSubmitted = async (application, applicant) => {
  const superAdmins = await usersRepository.listByRole("super_admin");
  const bodyHtml = [
    paragraph(`<strong>${escapeHtml(applicant.name)}</strong> (${escapeHtml(applicant.email)}) applied to become an event organizer.`),
    infoPanel({
      heading: "Application",
      rows: [
        { label: "Business", value: application.business_name },
        { label: "Applicant", value: applicant.name },
        { label: "Email", value: applicant.email },
      ],
    }),
    button({ href: `${env.FRONTEND_URL}/dashboard/super-admin`, label: "Review application" }),
  ].join("");

  await Promise.all(
    superAdmins.map((superAdmin) =>
      notify({
        to: superAdmin.email,
        subject: `New organizer application: ${application.business_name}`,
        text: `${applicant.name} (${applicant.email}) applied to become an event organizer as "${application.business_name}". Review it in the Super Admin dashboard: ${env.FRONTEND_URL}/dashboard/super-admin`,
        html: renderBrandedEmail({
          preheader: `${applicant.name} wants to host events on SiTIKET`,
          tag: "New application",
          heading: "New organizer application",
          bodyHtml,
        }),
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
  const html = approved
    ? renderBrandedEmail({
        preheader: "You can now create events on SiTIKET",
        tag: "Approved",
        heading: "You're approved to host events",
        bodyHtml: [
          paragraph(`Good news, ${escapeHtml(applicant.name)} — your application as <strong>${escapeHtml(application.business_name)}</strong> was approved. You can start publishing events right away.`),
          button({ href: `${env.FRONTEND_URL}/dashboard/admin/events/new`, label: "Create your first event", variant: "lime" }),
        ].join(""),
      })
    : renderBrandedEmail({
        preheader: "An update on your SiTIKET organizer application",
        tag: "Update",
        heading: "About your organizer application",
        bodyHtml: [
          paragraph(`Hi ${escapeHtml(applicant.name)}, we're unable to approve your application as <strong>${escapeHtml(application.business_name)}</strong> at this time.`),
          application.review_notes ? infoPanel({ heading: "Reason", rows: [{ label: "Notes", value: application.review_notes }] }) : "",
        ].join(""),
      });

  await notify({
    to: applicant.email,
    subject: approved ? "Your organizer application was approved" : "Your organizer application was not approved",
    text: approved
      ? `Good news — your application as "${application.business_name}" was approved. Create your first event: ${env.FRONTEND_URL}/dashboard/admin/events/new`
      : `Your application as "${application.business_name}" was not approved.${application.review_notes ? ` Reason: ${application.review_notes}` : ""}`,
    html,
  });
};

/**
 * Sends the buyer their ticket codes once a payment proof is approved.
 * @param {object} order - an `orders` row
 * @param {object[]} tickets - rows from `ticketsRepository.listByOrderWithContext`
 * @param {object} event - the order's `events` row (routes the email through its organizer's SMTP)
 */
export const notifyOrderPaid = async (order, tickets, event) => {
  const eventName = event?.name ?? "your event";
  const infoRows = eventInfoRows(event);
  const contactRows = organizerContactRows(event);
  const bodyHtml = [
    paragraph(`Hi ${escapeHtml(order.buyer_name)}, your payment for <strong>${escapeHtml(eventName)}</strong> is confirmed. Your ${tickets.length === 1 ? "ticket is" : `${tickets.length} tickets are`} ready — show the QR code${tickets.length === 1 ? "" : "s"} at the gate.`),
    ticketPanel({ eventName, tickets }),
    infoRows.length ? infoPanel({ heading: "Event details", rows: infoRows }) : "",
    contactRows.length ? infoPanel({ heading: "Need help? Contact the organizer", rows: contactRows }) : "",
    button({ href: orderUrl(order.id, order.buyer_email), label: "View your tickets", variant: "lime" }),
  ].join("");

  const codeList = tickets.map((ticket, index) => `- Ticket ${index + 1} (${ticket.ticket_type_name}): ${ticket.ticket_code}`).join("\n");
  await notify(
    {
      to: order.buyer_email,
      subject: `Your tickets for ${eventName}`,
      text: `Hi ${order.buyer_name}, your payment for ${eventName} is confirmed.\n\nYour tickets:\n${codeList}\n\nView them at ${orderUrl(order.id, order.buyer_email)}${organizerContactText(event)}\n\n${SPAM_FOOTNOTE}`,
      html: renderBrandedEmail({
        preheader: `Your ${tickets.length === 1 ? "ticket" : "tickets"} for ${eventName}`,
        tag: "Payment confirmed",
        heading: "You're in — here are your tickets",
        bodyHtml,
        footnote: SPAM_FOOTNOTE,
      }),
    },
    event?.owner_id,
  );
};

/**
 * Tells the buyer their uploaded payment proof was rejected so they can re-submit.
 * @param {object} order - an `orders` row
 * @param {string} [reviewerNotes]
 * @param {object} event - the order's `events` row (routes the email through its organizer's SMTP)
 */
export const notifyPaymentProofRejected = async (order, reviewerNotes, event) => {
  const eventName = event?.name ?? "your event";
  const contactRows = organizerContactRows(event);
  const bodyHtml = [
    paragraph(`Hi ${escapeHtml(order.buyer_name)}, we couldn't verify the payment proof you submitted for <strong>${escapeHtml(eventName)}</strong>. You can upload a new one while the order is still open.`),
    reviewerNotes ? infoPanel({ heading: "Reason", rows: [{ label: "Notes", value: reviewerNotes }] }) : "",
    contactRows.length ? infoPanel({ heading: "Need help? Contact the organizer", rows: contactRows }) : "",
    button({ href: orderUrl(order.id, order.buyer_email), label: "Upload a new proof" }),
  ].join("");
  await notify(
    {
      to: order.buyer_email,
      subject: `Action needed: payment proof for ${eventName}`,
      text: `Hi ${order.buyer_name}, the payment proof you submitted for ${eventName} couldn't be verified.${reviewerNotes ? ` Reason: ${reviewerNotes}` : ""} Please upload a new proof at ${orderUrl(order.id, order.buyer_email)}${organizerContactText(event)}`,
      html: renderBrandedEmail({
        preheader: `Please re-upload your payment proof for ${eventName}`,
        tag: "Action needed",
        heading: "We couldn't verify your payment",
        bodyHtml,
      }),
    },
    event?.owner_id,
  );
};

/**
 * @param {object} order - an `orders` row
 * @param {object} event - the order's `events` row (routes the email through its organizer's SMTP)
 */
export const notifyOrderCancelled = async (order, event) => {
  const eventName = event?.name ?? "your event";
  await notify(
    {
      to: order.buyer_email,
      subject: `Your order for ${eventName} was cancelled`,
      text: `Hi ${order.buyer_name}, your order for ${eventName} was cancelled.`,
      html: renderBrandedEmail({
        preheader: `Your order for ${eventName} was cancelled`,
        tag: "Cancelled",
        heading: "Your order was cancelled",
        bodyHtml: paragraph(`Hi ${escapeHtml(order.buyer_name)}, your order for <strong>${escapeHtml(eventName)}</strong> was cancelled. No payment was taken.`),
      }),
    },
    event?.owner_id,
  );
};

/**
 * @param {object} order - an `orders` row
 * @param {object} event - the order's `events` row (routes the email through its organizer's SMTP)
 */
export const notifyOrderExpired = async (order, event) => {
  const eventName = event?.name ?? "your event";
  const bodyHtml = [
    paragraph(`Hi ${escapeHtml(order.buyer_name)}, the payment window for your <strong>${escapeHtml(eventName)}</strong> order closed before a payment proof was submitted, so it expired and the held tickets were released back for sale.`),
    button({ href: `${env.FRONTEND_URL}/events`, label: "Browse events" }),
  ].join("");
  await notify(
    {
      to: order.buyer_email,
      subject: `Your order for ${eventName} expired`,
      text: `Hi ${order.buyer_name}, the payment window for your ${eventName} order closed before a payment proof was submitted, so it expired and its tickets were released back for sale.`,
      html: renderBrandedEmail({
        preheader: `Your order for ${eventName} expired`,
        tag: "Expired",
        heading: "Your payment window closed",
        bodyHtml,
      }),
    },
    event?.owner_id,
  );
};

const merchOrderUrl = (orderId) => `${env.FRONTEND_URL}/merch-orders/${orderId}`;

const formatRupiah = (amount) => `Rp ${Number(amount).toLocaleString("id-ID")}`;

/**
 * Tells the event organizer a ticket buyer clicked "I have paid" and uploaded
 * a payment proof — the ticket twin of {@link notifyMerchPaymentSubmitted}.
 * Organizer-facing, so it rides the platform SMTP.
 * @param {object} order - an `orders` row
 * @param {object} event - the order's `events` row
 * @param {object} organizer - the event owner's user row
 */
export const notifyTicketPaymentSubmitted = async (order, event, organizer) => {
  if (!organizer?.email) return;
  const eventName = event?.name ?? "your event";
  const reviewUrl = `${env.FRONTEND_URL}/dashboard/admin/events/${event.slug}/orders`;
  const bodyHtml = [
    paragraph(
      `<strong>${escapeHtml(order.buyer_name)}</strong> confirmed they paid ${formatRupiah(order.total_amount)} for <strong>${escapeHtml(eventName)}</strong> and uploaded a transfer proof. Review it to issue their tickets.`,
    ),
    infoPanel({
      heading: "Order",
      rows: [
        { label: "Event", value: eventName },
        { label: "Buyer", value: order.buyer_name },
        { label: "Email", value: order.buyer_email },
        { label: "Amount", value: formatRupiah(order.total_amount) },
      ],
    }),
    button({ href: reviewUrl, label: "Review the proof", variant: "lime" }),
  ].join("");

  await notify({
    to: organizer.email,
    subject: `Payment proof submitted by ${order.buyer_name} — ${eventName}`,
    text: `${order.buyer_name} (${order.buyer_email}) confirmed they paid ${formatRupiah(order.total_amount)} for ${eventName} and uploaded a proof. Review it at ${reviewUrl}`,
    html: renderBrandedEmail({
      preheader: `${order.buyer_name} says they've paid — review the proof`,
      tag: "Payment submitted",
      heading: "A ticket buyer confirmed their payment",
      bodyHtml,
    }),
  });
};

/** One `infoPanel` row per order line, e.g. "2× Band Tee (Red / M) — Rp 300.000". */
const merchItemRows = (order) =>
  (order.items ?? []).map((item) => ({
    label: `${item.quantity}× ${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ""}`,
    value: formatRupiah(item.subtotal),
  }));

const merchItemLines = (order) =>
  (order.items ?? [])
    .map(
      (item) =>
        `- ${item.quantity}× ${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ""}: ${formatRupiah(item.subtotal)}`,
    )
    .join("\n");

const buyerContactRows = (order) => [
  { label: "Buyer", value: order.buyer_name },
  { label: "Email", value: order.buyer_email },
  { label: "Phone", value: order.buyer_phone },
  {
    label: "Ship to",
    value: [
      order.shipping_address,
      order.shipping_village,
      order.shipping_district,
      order.shipping_city,
      order.shipping_province,
      order.shipping_postal_code,
    ]
      .filter(Boolean)
      .join(", "),
  },
  // Orders created before courier shipping existed carry no courier snapshot.
  ...(order.courier_name
    ? [
        {
          label: "Courier",
          value: `${order.courier_name} — ${formatRupiah(order.shipping_cost)}${order.shipping_estimation ? ` (est. ${order.shipping_estimation})` : ""}`,
        },
      ]
    : []),
];

/**
 * Tells the seller a buyer just placed a merch order (spec: sellers get an
 * email whenever someone buys their merch). Seller-facing, so it rides the
 * platform SMTP — the organizer's own SMTP is only for buyer-facing mail.
 * @param {object} order - a `merch_orders` row with `items`
 * @param {object} seller - the seller's user row
 */
export const notifyMerchOrderPlaced = async (order, seller) => {
  if (!seller?.email) return;
  const bodyHtml = [
    paragraph(
      `<strong>${escapeHtml(order.buyer_name)}</strong> placed a ${formatRupiah(order.total_amount)} merch order. It is awaiting their payment — you'll get another email once they confirm the transfer.`,
    ),
    infoPanel({ heading: "Order", rows: merchItemRows(order) }),
    infoPanel({ heading: "Buyer details", rows: buyerContactRows(order) }),
    button({ href: `${env.FRONTEND_URL}/dashboard/admin/merch/orders`, label: "View merch orders" }),
  ].join("");

  await notify({
    to: seller.email,
    subject: `New merch order from ${order.buyer_name} — ${formatRupiah(order.total_amount)}`,
    text: `${order.buyer_name} (${order.buyer_email}, ${order.buyer_phone}) placed a merch order:\n\n${merchItemLines(order)}\n\nTotal: ${formatRupiah(order.total_amount)}\nShip to: ${order.shipping_address}\n\nManage it at ${env.FRONTEND_URL}/dashboard/admin/merch/orders`,
    html: renderBrandedEmail({
      preheader: `${order.buyer_name} ordered your merch`,
      tag: "New merch order",
      heading: "You have a new merch order",
      bodyHtml,
    }),
  });
};

/**
 * Tells the seller the buyer clicked "I have paid" and uploaded a proof.
 * @param {object} order - a `merch_orders` row
 * @param {object} seller - the seller's user row
 */
export const notifyMerchPaymentSubmitted = async (order, seller) => {
  if (!seller?.email) return;
  const bodyHtml = [
    paragraph(
      `<strong>${escapeHtml(order.buyer_name)}</strong> confirmed they paid ${formatRupiah(order.total_amount)} for their merch order and uploaded a transfer proof. Review it to release the order.`,
    ),
    button({ href: `${env.FRONTEND_URL}/dashboard/admin/merch/orders`, label: "Review the proof", variant: "lime" }),
  ].join("");

  await notify({
    to: seller.email,
    subject: `Payment proof submitted by ${order.buyer_name} — ${formatRupiah(order.total_amount)}`,
    text: `${order.buyer_name} confirmed they paid ${formatRupiah(order.total_amount)} for their merch order and uploaded a proof. Review it at ${env.FRONTEND_URL}/dashboard/admin/merch/orders`,
    html: renderBrandedEmail({
      preheader: `${order.buyer_name} says they've paid — review the proof`,
      tag: "Payment submitted",
      heading: "A buyer confirmed their payment",
      bodyHtml,
    }),
  });
};

/**
 * Tells the buyer their merch payment was approved. Buyer-facing, so it
 * rides the seller's own SMTP config.
 * @param {object} order - a `merch_orders` row with `items`
 * @param {object} seller - the seller's user row
 */
export const notifyMerchOrderPaid = async (order, seller) => {
  const sellerName = seller?.name ?? "the seller";
  const bodyHtml = [
    paragraph(
      `Hi ${escapeHtml(order.buyer_name)}, ${escapeHtml(sellerName)} confirmed your ${formatRupiah(order.total_amount)} payment. Your merch order is now being prepared for delivery.`,
    ),
    infoPanel({ heading: "Your order", rows: merchItemRows(order) }),
    button({ href: merchOrderUrl(order.id), label: "View your order", variant: "lime" }),
  ].join("");

  await notify(
    {
      to: order.buyer_email,
      subject: "Your merch payment is confirmed",
      text: `Hi ${order.buyer_name}, ${sellerName} confirmed your ${formatRupiah(order.total_amount)} payment.\n\nYour order:\n${merchItemLines(order)}\n\nTrack it at ${merchOrderUrl(order.id)}`,
      html: renderBrandedEmail({
        preheader: "Your merch order is being prepared",
        tag: "Payment confirmed",
        heading: "Your merch payment is confirmed",
        bodyHtml,
      }),
    },
    order.seller_id,
  );
};

/**
 * Tells the buyer their merch payment proof was rejected so they can re-submit.
 * @param {object} order - a `merch_orders` row
 * @param {string} [reviewerNotes]
 * @param {object} seller - the seller's user row
 */
export const notifyMerchProofRejected = async (order, reviewerNotes, seller) => {
  const bodyHtml = [
    paragraph(
      `Hi ${escapeHtml(order.buyer_name)}, ${escapeHtml(seller?.name ?? "the seller")} couldn't verify the payment proof for your merch order. You can upload a new one while the order is still open.`,
    ),
    reviewerNotes ? infoPanel({ heading: "Reason", rows: [{ label: "Notes", value: reviewerNotes }] }) : "",
    button({ href: merchOrderUrl(order.id), label: "Upload a new proof" }),
  ].join("");

  await notify(
    {
      to: order.buyer_email,
      subject: "Action needed: your merch payment proof",
      text: `Hi ${order.buyer_name}, the payment proof for your merch order couldn't be verified.${reviewerNotes ? ` Reason: ${reviewerNotes}` : ""} Upload a new proof at ${merchOrderUrl(order.id)}`,
      html: renderBrandedEmail({
        preheader: "Please re-upload your merch payment proof",
        tag: "Action needed",
        heading: "We couldn't verify your payment",
        bodyHtml,
      }),
    },
    order.seller_id,
  );
};

/**
 * @param {object} order - a `merch_orders` row
 * @param {object} seller - the seller's user row
 */
export const notifyMerchOrderCancelled = async (order, seller) => {
  await notify(
    {
      to: order.buyer_email,
      subject: "Your merch order was cancelled",
      text: `Hi ${order.buyer_name}, your ${formatRupiah(order.total_amount)} merch order from ${seller?.name ?? "the seller"} was cancelled. No payment was taken.`,
      html: renderBrandedEmail({
        preheader: "Your merch order was cancelled",
        tag: "Cancelled",
        heading: "Your merch order was cancelled",
        bodyHtml: paragraph(
          `Hi ${escapeHtml(order.buyer_name)}, your ${formatRupiah(order.total_amount)} merch order from <strong>${escapeHtml(seller?.name ?? "the seller")}</strong> was cancelled. No payment was taken.`,
        ),
      }),
    },
    order.seller_id,
  );
};

/**
 * @param {object} order - a `merch_orders` row
 * @param {object} seller - the seller's user row
 */
export const notifyMerchOrderExpired = async (order, seller) => {
  const bodyHtml = [
    paragraph(
      `Hi ${escapeHtml(order.buyer_name)}, the payment window for your merch order from <strong>${escapeHtml(seller?.name ?? "the seller")}</strong> closed before a payment proof was submitted, so it expired and its stock was released.`,
    ),
    button({ href: `${env.FRONTEND_URL}/merch`, label: "Browse merch" }),
  ].join("");
  await notify(
    {
      to: order.buyer_email,
      subject: "Your merch order expired",
      text: `Hi ${order.buyer_name}, the payment window for your merch order closed before a payment proof was submitted, so it expired and its stock was released.`,
      html: renderBrandedEmail({
        preheader: "Your merch order expired",
        tag: "Expired",
        heading: "Your payment window closed",
        bodyHtml,
      }),
    },
    order.seller_id,
  );
};

const REFUND_STATUS_COPY = {
  requested: {
    tag: "Refund requested",
    heading: "We've got your refund request",
    subject: (eventName) => `Refund requested for ${eventName}`,
    body: (order, eventName) => `Hi ${order.buyer_name}, we've received your refund request for ${eventName}. We'll email you once it's reviewed.`,
  },
  approved: {
    tag: "Refund approved",
    heading: "Your refund was approved",
    subject: (eventName) => `Refund approved for ${eventName}`,
    body: (order, eventName) => `Hi ${order.buyer_name}, your refund request for ${eventName} was approved. The money transfer will follow.`,
  },
  rejected: {
    tag: "Refund update",
    heading: "About your refund request",
    subject: (eventName) => `Refund declined for ${eventName}`,
    body: (order, eventName, notes) => `Hi ${order.buyer_name}, your refund request for ${eventName} was declined.${notes ? ` Reason: ${notes}` : ""}`,
  },
  completed: {
    tag: "Refund completed",
    heading: "Your refund has been sent",
    subject: (eventName) => `Refund completed for ${eventName}`,
    body: (order, eventName) => `Hi ${order.buyer_name}, your refund for ${eventName} has been sent. Its tickets are no longer valid for entry.`,
  },
};

/**
 * Tells the buyer their refund request's status changed.
 * @param {object} order - an `orders` row
 * @param {"requested" | "approved" | "rejected" | "completed"} status
 * @param {string} [notes]
 * @param {object} event - the order's `events` row (routes the email through its organizer's SMTP)
 */
export const notifyRefundStatus = async (order, status, notes, event) => {
  const copy = REFUND_STATUS_COPY[status];
  const eventName = event?.name ?? "your event";
  const text = copy.body(order, eventName, notes);
  const bodyHtml = [
    paragraph(escapeHtml(text)),
    button({ href: orderUrl(order.id, order.buyer_email), label: "View your order" }),
  ].join("");
  await notify(
    {
      to: order.buyer_email,
      subject: copy.subject(eventName),
      text,
      html: renderBrandedEmail({
        preheader: copy.subject(eventName),
        tag: copy.tag,
        heading: copy.heading,
        bodyHtml,
      }),
    },
    event?.owner_id,
  );
};
