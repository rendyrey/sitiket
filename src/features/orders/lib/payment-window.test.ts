import assert from "node:assert/strict";
import test from "node:test";
// Explicit .ts extension so `node --test` (which strips types natively) can
// resolve this under ESM; tsconfig uses "bundler" resolution, which allows it.
import { URGENT_THRESHOLD_MS, formatTimeLeft, formatTimeLeftSpoken, msRemaining } from "./payment-window.ts";

const NOW = Date.parse("2026-08-19T10:00:00.000Z");

test("msRemaining measures forward from now", () => {
  assert.equal(msRemaining("2026-08-19T10:10:00.000Z", NOW), 10 * 60 * 1000);
  assert.equal(msRemaining("2026-08-19T10:00:30.000Z", NOW), 30 * 1000);
});

test("msRemaining clamps a lapsed window to zero rather than going negative", () => {
  assert.equal(msRemaining("2026-08-19T09:45:00.000Z", NOW), 0);
});

test("msRemaining returns null for an unparseable timestamp, never a false expiry", () => {
  // A bad value must not render as "your window closed" — the server may well
  // still be holding the tickets.
  assert.equal(msRemaining("not a date", NOW), null);
  assert.equal(msRemaining("", NOW), null);
});

test("formatTimeLeft pads seconds and drops the hour unless there is one", () => {
  assert.equal(formatTimeLeft(10 * 60 * 1000), "10:00");
  assert.equal(formatTimeLeft(9 * 60 * 1000 + 5000), "9:05");
  assert.equal(formatTimeLeft(45 * 1000), "0:45");
  assert.equal(formatTimeLeft(0), "0:00");
  assert.equal(formatTimeLeft(67 * 60 * 1000 + 42 * 1000), "1:07:42");
});

test("formatTimeLeft rounds up, so 0:00 only shows at the real deadline", () => {
  // With 1ms left the server still accepts a proof; the clock must not read 0:00.
  assert.equal(formatTimeLeft(1), "0:01");
  assert.equal(formatTimeLeft(999), "0:01");
});

test("formatTimeLeftSpoken stays at whole minutes so the live region is quiet", () => {
  assert.equal(formatTimeLeftSpoken(8 * 60 * 1000 + 59 * 1000), "About 8 minutes left to pay.");
  assert.equal(formatTimeLeftSpoken(8 * 60 * 1000 + 1000), "About 8 minutes left to pay.");
  assert.equal(formatTimeLeftSpoken(60 * 1000), "About 1 minute left to pay.");
  assert.equal(formatTimeLeftSpoken(30 * 1000), "Less than a minute left to pay.");
  assert.equal(formatTimeLeftSpoken(0), "The payment window has closed.");
});

test("the urgent threshold sits inside a 10-minute window", () => {
  // If it ever exceeded the hold itself, every order would render as urgent
  // from the moment it was created.
  assert.ok(URGENT_THRESHOLD_MS < 10 * 60 * 1000);
});
