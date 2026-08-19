import * as eventAttendanceRepository from "../repositories/event-attendance-repository.js";
import { getOwnedEventOrThrow } from "./event-service.js";

/**
 * The organizer-facing attendance report: tickets sold vs. people actually
 * scanned in at the gate.
 */

/** Arrivals chart resolution. 15 minutes is fine enough to show a door rush without becoming noise. */
const BUCKET_MINUTES = 15;
const BUCKET_MS = BUCKET_MINUTES * 60 * 1000;

/**
 * Groups check-in timestamps into fixed 15-minute buckets and fills the gaps,
 * so a quiet stretch renders as a real zero rather than the line jumping over
 * it.
 *
 * Bucketing on the epoch (not on a formatted local time) is deliberate: WIB is
 * a whole-hour offset from UTC, so a 15-minute epoch grid lands on clean
 * :00/:15/:30/:45 boundaries in Jakarta time anyway, and the client can format
 * each `startsAt` in whatever zone it displays.
 *
 * @param {Date[]} times - check-in timestamps, ascending
 * @returns {Array<{ startsAt: string, arrivals: number, cumulative: number }>}
 */
const toArrivalBuckets = (times) => {
  if (times.length === 0) return [];

  const stamps = times.map((time) => new Date(time).getTime()).filter((time) => Number.isFinite(time));
  if (stamps.length === 0) return [];

  const counts = new Map();
  for (const stamp of stamps) {
    const bucket = Math.floor(stamp / BUCKET_MS) * BUCKET_MS;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  const first = Math.min(...counts.keys());
  const last = Math.max(...counts.keys());

  const buckets = [];
  let cumulative = 0;
  for (let bucket = first; bucket <= last; bucket += BUCKET_MS) {
    const arrivals = counts.get(bucket) ?? 0;
    cumulative += arrivals;
    buckets.push({ startsAt: new Date(bucket).toISOString(), arrivals, cumulative });
  }

  return buckets;
};

/**
 * Builds the full attendance report for an event.
 *
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 */
export const getAttendanceReport = async (eventId, requester) => {
  const event = await getOwnedEventOrThrow(eventId, requester);

  const [totals, byTicketType, checkInTimes, byScanner, revenue] = await Promise.all([
    eventAttendanceRepository.getTotals(eventId),
    eventAttendanceRepository.getByTicketType(eventId),
    eventAttendanceRepository.listCheckInTimes(eventId),
    eventAttendanceRepository.getByScanner(eventId),
    eventAttendanceRepository.getPaidRevenue(eventId),
  ]);

  const notArrived = totals.sold - totals.checkedIn;
  // Guard the divide: an event that has sold nothing reports 0%, not NaN.
  const attendanceRate = totals.sold === 0 ? 0 : totals.checkedIn / totals.sold;

  const buckets = toArrivalBuckets(checkInTimes);

  // The single busiest 15 minutes — the number an organizer staffs the door by.
  const peak = buckets.reduce((best, bucket) => (best === null || bucket.arrivals > best.arrivals ? bucket : best), null);

  return {
    eventId,
    eventName: event.name,
    eventStartDate: event.start_date,
    ticketsSold: totals.sold,
    checkedIn: totals.checkedIn,
    notArrived,
    voided: totals.voided,
    attendanceRate,
    revenue,
    byTicketType,
    arrivals: buckets,
    bucketMinutes: BUCKET_MINUTES,
    firstCheckInAt: checkInTimes.length > 0 ? new Date(checkInTimes[0]).toISOString() : null,
    lastCheckInAt: checkInTimes.length > 0 ? new Date(checkInTimes.at(-1)).toISOString() : null,
    peakBucket: peak ? { startsAt: peak.startsAt, arrivals: peak.arrivals } : null,
    byScanner,
  };
};

// Exported for unit tests — the bucketing is the only non-trivial logic here.
export const __testables = { toArrivalBuckets, BUCKET_MINUTES };
