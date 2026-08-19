import assert from "node:assert/strict";
import test from "node:test";
import { __testables } from "./event-attendance-service.js";

const { toArrivalBuckets, BUCKET_MINUTES } = __testables;

const at = (iso) => new Date(iso);

test("returns no buckets when nobody has checked in", () => {
  assert.deepEqual(toArrivalBuckets([]), []);
});

test("groups arrivals in the same 15-minute window into one bucket", () => {
  const buckets = toArrivalBuckets([at("2026-08-22T10:00:00Z"), at("2026-08-22T10:07:00Z"), at("2026-08-22T10:14:59Z")]);

  assert.equal(buckets.length, 1);
  assert.equal(buckets[0].arrivals, 3);
  assert.equal(buckets[0].cumulative, 3);
  assert.equal(buckets[0].startsAt, "2026-08-22T10:00:00.000Z");
});

test("starts a new bucket at the window boundary", () => {
  const buckets = toArrivalBuckets([at("2026-08-22T10:14:59Z"), at("2026-08-22T10:15:00Z")]);

  assert.equal(buckets.length, 2);
  assert.deepEqual(
    buckets.map((bucket) => bucket.arrivals),
    [1, 1],
  );
});

test("fills quiet windows with an explicit zero so the chart does not skip them", () => {
  // 10:00 and 11:00 are four buckets apart; the three between must be present.
  const buckets = toArrivalBuckets([at("2026-08-22T10:00:00Z"), at("2026-08-22T11:00:00Z")]);

  assert.equal(buckets.length, 5);
  assert.deepEqual(
    buckets.map((bucket) => bucket.arrivals),
    [1, 0, 0, 0, 1],
  );
});

test("cumulative rises monotonically and ends at the total scanned", () => {
  const buckets = toArrivalBuckets([
    at("2026-08-22T10:00:00Z"),
    at("2026-08-22T10:20:00Z"),
    at("2026-08-22T10:22:00Z"),
    at("2026-08-22T10:50:00Z"),
  ]);

  const cumulatives = buckets.map((bucket) => bucket.cumulative);
  assert.deepEqual(
    cumulatives,
    [...cumulatives].sort((a, b) => a - b),
    "cumulative must never decrease",
  );
  assert.equal(cumulatives.at(-1), 4);
});

test("tolerates out-of-order and invalid timestamps without producing NaN buckets", () => {
  const buckets = toArrivalBuckets([at("2026-08-22T10:30:00Z"), at("not-a-date"), at("2026-08-22T10:00:00Z")]);

  assert.equal(buckets.length, 3, "spans 10:00 -> 10:30 at 15-minute resolution");
  assert.equal(
    buckets.reduce((sum, bucket) => sum + bucket.arrivals, 0),
    2,
    "the unparseable timestamp is dropped, not counted",
  );
  assert.ok(
    buckets.every((bucket) => Number.isFinite(bucket.arrivals) && !bucket.startsAt.includes("Invalid")),
    "no NaN/Invalid Date leaks into the series",
  );
});

test("bucket resolution is the documented 15 minutes", () => {
  assert.equal(BUCKET_MINUTES, 15);
});
