import assert from "node:assert/strict";
import test from "node:test";
import { __testables } from "./products-repository.js";

const { fuzzyPatterns } = __testables;

const likeMatches = (pattern, value) => {
  // Translate a SQL LIKE pattern into a case-insensitive regex for the test.
  const regex = new RegExp(
    `^${pattern
      .split("%")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*")}$`,
    "i",
  );
  return regex.test(value);
};

const anyMatch = (token, value) => fuzzyPatterns(token).some((pattern) => likeMatches(pattern, value));

test("matches the token as a plain substring", () => {
  assert.equal(anyMatch("tee", "Bandung Noise Fest Tee"), true);
});

test("absorbs a plural / trailing typo (tees -> Tee)", () => {
  assert.equal(anyMatch("tees", "Bandung Noise Fest Tee"), true);
});

test("absorbs a missing middle character (bandng -> Bandung)", () => {
  assert.equal(anyMatch("bandng", "Bandung Noise Fest Tee"), true);
});

test("short tokens do not fan out into gap patterns", () => {
  assert.deepEqual(fuzzyPatterns("cap"), ["%cap%"]);
});

test("does not match an unrelated name", () => {
  assert.equal(anyMatch("hoodie", "Bandung Noise Fest Tee"), false);
});
