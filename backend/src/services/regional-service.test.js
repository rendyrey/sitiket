import assert from "node:assert/strict";
import test from "node:test";
import { __testables } from "./regional-service.js";

const { keepRealPostalCodes } = __testables;

test("drops the api.co.id premium placeholder from postal codes", () => {
  const village = { code: "9171011007", postal_codes: ["postal_code available only on premium"] };
  assert.deepEqual(keepRealPostalCodes(village), { code: "9171011007", postal_codes: [] });
});

test("keeps real 5-digit postal codes", () => {
  assert.deepEqual(keepRealPostalCodes({ postal_codes: ["99111", "9911", "99112"] }).postal_codes, ["99111", "99112"]);
});

test("treats a missing or non-array postal_codes as empty", () => {
  assert.deepEqual(keepRealPostalCodes({}).postal_codes, []);
  assert.deepEqual(keepRealPostalCodes({ postal_codes: "99111" }).postal_codes, []);
});
