import { getOrganizerTransport, organizerFromHeader, sendMail, transporter } from "../config/mailer.js";
import { sendViaGmail } from "../config/gmail-mailer.js";
import * as emailJobsRepository from "../repositories/email-jobs-repository.js";
import * as organizerEmailConfigsRepository from "../repositories/organizer-email-configs-repository.js";

/** Jobs claimed per worker tick. */
const BATCH_SIZE = 20;

/**
 * Queues an email instead of sending it inline on the request that
 * triggered it — the background worker (`processEmailJobQueue`) delivers it.
 * Pass `ownerId` for buyer-facing email so it goes out through that event
 * organizer's own SMTP; without it the platform SMTP is used.
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 * @param {{ ownerId?: string }} [routing]
 * @returns {Promise<{ smtpConfigured: boolean }>} whether a transport exists for
 *   this route, for callers (e.g. guest OTP) that fall back to logging when it doesn't.
 */
export const enqueueEmail = async (message, { ownerId } = {}) => {
  await emailJobsRepository.enqueue({ ...message, ownerId });

  if (ownerId) {
    const config = await organizerEmailConfigsRepository.findByOwner(ownerId);
    // Platform SMTP counts too — deliverJob falls back to it for legacy owners.
    return { smtpConfigured: Boolean(config) || Boolean(transporter) };
  }
  return { smtpConfigured: Boolean(transporter) };
};

/**
 * Delivers one claimed job through the transport its `owner_id` routes to.
 * Organizer-routed jobs whose config has since disappeared (legacy events
 * pre-dating the email-config requirement, or a deleted config) fall back to
 * the platform SMTP so buyer flows never silently stall. Throws when no
 * transport at all is available — the job then retries with backoff and
 * surfaces in `email_jobs` as `failed`, instead of being silently marked sent.
 * @param {object} job - an `email_jobs` row
 */
const deliverJob = async (job) => {
  const message = { to: job.to_email, subject: job.subject, text: job.text_body, html: job.html_body ?? undefined };

  if (job.owner_id) {
    const config = await organizerEmailConfigsRepository.findByOwner(job.owner_id);
    if (config) {
      // OAuth-connected Gmail delivers over the Gmail API; SMTP rows (custom
      // providers + legacy gmail App Passwords) keep using nodemailer.
      if (config.google_refresh_token_encrypted) {
        await sendViaGmail(config, { from: organizerFromHeader(config), ...message });
      } else {
        await getOrganizerTransport(config).sendMail({ from: organizerFromHeader(config), ...message });
      }
      return;
    }
    // eslint-disable-next-line no-console
    console.warn(`[email-job] organizer ${job.owner_id} has no email config — falling back to platform SMTP for job ${job.id}`);
  }

  const sent = await sendMail(message);
  if (!sent) {
    throw new Error(
      job.owner_id
        ? "Organizer email config missing and platform SMTP (SMTP_HOST) is not configured"
        : "Platform SMTP (SMTP_HOST) is not configured",
    );
  }
};

/**
 * Worker tick: claims a batch of due `email_jobs` rows and delivers each
 * one, marking it sent/failed. Wired into an interval in server.js, the
 * same single-instance-friendly pattern as the order-expiry sweep.
 */
export const processEmailJobQueue = async () => {
  const jobs = await emailJobsRepository.claimBatch(BATCH_SIZE);

  await Promise.all(
    jobs.map(async (job) => {
      try {
        await deliverJob(job);
        await emailJobsRepository.markSent(job.id);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[email-job] failed to send job ${job.id} to ${job.to_email}:`, error.message);
        await emailJobsRepository.markFailed(job.id, job.attempts, error.message);
      }
    }),
  );
};
