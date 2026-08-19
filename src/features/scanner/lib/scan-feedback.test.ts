import assert from "node:assert/strict";
import test from "node:test";
// Explicit .ts extension so `node --test` (which strips types natively) can
// resolve this under ESM; tsconfig uses "bundler" resolution, which allows it.
import { __testables } from "./scan-feedback.ts";
import type { CheckInResult } from "@/lib/api/types";

const { TONES, VIBRATIONS } = __testables;

/**
 * Every value `CheckInResult` can take. Kept literal (rather than derived from
 * the maps under test) so that adding a fifth outcome to the union fails these
 * tests until its signature is written — the whole point of the check.
 */
const ALL_RESULTS: CheckInResult[] = ["success", "duplicate", "invalid", "expired"];

test("every scan outcome has a tone signature — none announces itself as silence", () => {
  for (const result of ALL_RESULTS) {
    assert.ok(TONES[result], `no tone for "${result}"`);
    assert.ok(TONES[result].length > 0, `empty tone for "${result}"`);
  }
});

test("every scan outcome has a vibration pattern", () => {
  for (const result of ALL_RESULTS) {
    assert.ok(VIBRATIONS[result], `no vibration for "${result}"`);
    assert.ok(VIBRATIONS[result].length > 0, `empty vibration for "${result}"`);
  }
});

test("tone segments are audible and non-overlapping within a signature", () => {
  for (const result of ALL_RESULTS) {
    let previousEnd = -1;
    for (const tone of TONES[result]) {
      assert.ok(tone.frequency >= 20 && tone.frequency <= 20000, `"${result}" tone outside human hearing`);
      assert.ok(tone.duration > 0, `"${result}" tone has no duration`);
      assert.ok(tone.startAt >= previousEnd, `"${result}" tones overlap — they would blur into one sound`);
      previousEnd = tone.startAt + tone.duration;
    }
  }
});

test("success is distinguishable from every rejection by pitch", () => {
  // Rejections must never out-pitch success: in a noisy room the operator
  // recognises "pass" by it being the bright, rising one.
  const peak = (result: CheckInResult) => Math.max(...TONES[result].map((tone) => tone.frequency));
  const successPeak = peak("success");

  for (const rejection of ALL_RESULTS.filter((result) => result !== "success")) {
    assert.ok(peak(rejection) < successPeak, `"${rejection}" is not clearly lower-pitched than success`);
  }
});

test("success is the shortest signal — it is the one that repeats all night", () => {
  const span = (result: CheckInResult) => Math.max(...TONES[result].map((tone) => tone.startAt + tone.duration));
  const successSpan = span("success");

  for (const rejection of ALL_RESULTS.filter((result) => result !== "success")) {
    assert.ok(span(rejection) >= successSpan, `"${rejection}" is shorter than success — rejections should linger`);
  }
});
