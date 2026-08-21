import assert from "node:assert/strict";
import test from "node:test";
import { __testables } from "./embedding-service.js";

const { cosineSimilarity, contentHash } = __testables;

test("cosine similarity of a vector with itself is 1", () => {
  const vector = [0.5, -0.25, 0.75];
  assert.ok(Math.abs(cosineSimilarity(vector, vector) - 1) < 1e-9);
});

test("cosine similarity of orthogonal vectors is 0", () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test("cosine similarity of opposite vectors is -1", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 2], [-1, -2]) - -1) < 1e-9);
});

test("degenerate input (empty, mismatched lengths, zero vectors) scores 0, not NaN", () => {
  assert.equal(cosineSimilarity([], []), 0);
  assert.equal(cosineSimilarity([1, 2], [1, 2, 3]), 0);
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
  assert.equal(cosineSimilarity(undefined, [1]), 0);
});

test("contentHash matches MySQL's SHA2(CONCAT(name, 0x0A, description), 256)", () => {
  // Precomputed: python3 -c "import hashlib; print(hashlib.sha256(b'Band Tee\nSoft cotton.').hexdigest())"
  assert.equal(
    contentHash("Band Tee", "Soft cotton."),
    "29e0407901f9f71ef6565a333bbd53909272fd0bf653d7c375577c0438a83bc2",
  );
});

test("contentHash changes when either field changes", () => {
  const base = contentHash("Band Tee", "Soft cotton.");
  assert.notEqual(contentHash("Band Tee!", "Soft cotton."), base);
  assert.notEqual(contentHash("Band Tee", "Soft cotton"), base);
});
