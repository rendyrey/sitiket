import assert from "node:assert/strict";
import test from "node:test";
import { __testables } from "./product-service.js";

const { validateVariantConfig } = __testables;

const config = (overrides = {}) => ({
  groups: [
    { name: "Color", options: ["Red", "Blue"] },
    { name: "Size", options: ["M", "L"] },
  ],
  variants: [
    { options: ["Red", "M"], price: 150000, stock: 10 },
    { options: ["Blue", "L"], price: 160000, stock: 5 },
  ],
  ...overrides,
});

test("accepts a valid two-group matrix with per-combination prices", () => {
  assert.doesNotThrow(() => validateVariantConfig(config()));
});

test("accepts an empty config (removes variants, falls back to base price/stock)", () => {
  assert.doesNotThrow(() => validateVariantConfig({ groups: [], variants: [] }));
});

test("rejects more than 3 option groups", () => {
  const groups = ["A", "B", "C", "D"].map((name) => ({ name, options: ["x"] }));
  assert.throws(
    () => validateVariantConfig(config({ groups, variants: [{ options: ["x", "x", "x", "x"], price: 1, stock: 1 }] })),
    (error) => error.code === "TOO_MANY_OPTION_GROUPS",
  );
});

test("rejects variants without any option groups", () => {
  assert.throws(
    () => validateVariantConfig({ groups: [], variants: [{ options: [], price: 1, stock: 1 }] }),
    (error) => error.code === "VARIANTS_WITHOUT_GROUPS",
  );
});

test("rejects option groups with no variant combinations", () => {
  assert.throws(
    () => validateVariantConfig(config({ variants: [] })),
    (error) => error.code === "GROUPS_WITHOUT_VARIANTS",
  );
});

test("rejects a duplicated group name", () => {
  const bad = config();
  bad.groups[1].name = "Color";
  assert.throws(() => validateVariantConfig(bad), (error) => error.code === "DUPLICATE_GROUP_NAME");
});

test("rejects duplicate values inside one group", () => {
  const bad = config();
  bad.groups[0].options = ["Red", "Red"];
  assert.throws(() => validateVariantConfig(bad), (error) => error.code === "DUPLICATE_OPTION_VALUE");
});

test("rejects a variant that does not cover every group", () => {
  const bad = config();
  bad.variants[0].options = ["Red"];
  assert.throws(() => validateVariantConfig(bad), (error) => error.code === "VARIANT_GROUP_MISMATCH");
});

test("rejects a variant referencing a value missing from its group", () => {
  const bad = config();
  bad.variants[0].options = ["Green", "M"];
  assert.throws(() => validateVariantConfig(bad), (error) => error.code === "UNKNOWN_OPTION_VALUE");
});

test("rejects the same combination listed twice", () => {
  const bad = config();
  bad.variants[1].options = ["Red", "M"];
  assert.throws(() => validateVariantConfig(bad), (error) => error.code === "DUPLICATE_VARIANT");
});
