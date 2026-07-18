import { sendMail, transporter } from "../config/mailer.js";
import * as emailJobsRepository from "../repositories/email-jobs-repository.js";

/** Jobs claimed per worker tick. */
const BATCH_SIZE = 20;

/**
 * Queues an email instead of sending it inline on the request that
 * triggered it — the background worker (`processEmailJobQueue`) delivers it.
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 * @returns {Promise<{ smtpConfigured: boolean }>} whether SMTP is set up at all,
 *   for callers (e.g. guest OTP) that fall back to logging when it isn't.
 */
export const enqueueEmail = async (message) => {
  await emailJobsRepository.enqueue(message);
  return { smtpConfigured: Boolean(transporter) };
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
        // `sendMail` resolves `false` (not a throw) when SMTP isn't configured —
        // there's nothing to retry, so treat it the same as a successful send.
        await sendMail({ to: job.to_email, subject: job.subject, text: job.text_body, html: job.html_body ?? undefined });
        await emailJobsRepository.markSent(job.id);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`[email-job] failed to send job ${job.id} to ${job.to_email}:`, error.message);
        await emailJobsRepository.markFailed(job.id, job.attempts, error.message);
      }
    }),
  );
};
