import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "email_jobs";

/** After this many failed attempts a job is left "failed" instead of retried. */
const MAX_ATTEMPTS = 5;

/** Base backoff between retries; multiplied by the attempt number. */
const RETRY_BACKOFF_MS = 60 * 1000;

/**
 * Queues an email for the background worker to send.
 * @param {{ to: string, subject: string, text: string, html?: string }} message
 * @param {import("knex").Knex} [executor] - pass an open transaction to keep this atomic with a related write.
 */
export const enqueue = async ({ to, subject, text, html }, executor = db) => {
  const id = newId();
  const now = new Date();
  await executor(TABLE).insert({
    id,
    to_email: to,
    subject,
    text_body: text,
    html_body: html ?? null,
    status: "pending",
    attempts: 0,
    available_at: now,
    created_at: now,
    updated_at: now,
  });
  return id;
};

/**
 * Claims up to `limit` due jobs by flipping them to "processing" inside a
 * row-locking transaction, so the worker's own next tick (or, eventually, a
 * second instance) can never pick up the same job twice.
 * @param {number} limit
 */
export const claimBatch = (limit) =>
  db.transaction(async (trx) => {
    const jobs = await trx(TABLE)
      .where("status", "pending")
      .andWhere("available_at", "<=", new Date())
      .orderBy("created_at", "asc")
      .limit(limit)
      .forUpdate();

    if (jobs.length === 0) return [];

    await trx(TABLE)
      .whereIn(
        "id",
        jobs.map((job) => job.id),
      )
      .update({ status: "processing", updated_at: new Date() });

    return jobs;
  });

/** @param {string} id */
export const markSent = (id) =>
  db(TABLE).where({ id }).update({ status: "sent", sent_at: new Date(), updated_at: new Date() });

/**
 * @param {string} id
 * @param {number} attemptsSoFar - the job's `attempts` value before this failure
 * @param {string} errorMessage
 */
export const markFailed = (id, attemptsSoFar, errorMessage) => {
  const attempts = attemptsSoFar + 1;
  const exhausted = attempts >= MAX_ATTEMPTS;
  const changes = {
    attempts,
    last_error: errorMessage.slice(0, 1000),
    status: exhausted ? "failed" : "pending",
    updated_at: new Date(),
  };
  if (!exhausted) changes.available_at = new Date(Date.now() + RETRY_BACKOFF_MS * attempts);

  return db(TABLE).where({ id }).update(changes);
};
