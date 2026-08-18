import assert from "node:assert/strict";
import test from "node:test";
import { createTicketTypeSchema, updateTicketTypeSchema } from "./ticket-type-schemas.js";

const UUID = "11111111-1111-1111-1111-111111111111";
const base = { categoryId: UUID, name: "Early Bird", price: 100000, quantityTotal: 50 };

test("create: accepts a sale window that ends after it starts", () => {
  const result = createTicketTypeSchema.safeParse({
    ...base,
    saleStartAt: "2026-08-01T00:00:00.000Z",
    saleEndAt: "2026-08-20T00:00:00.000Z",
  });
  assert.equal(result.success, true);
});

test("create: rejects a sale window that ends before it starts", () => {
  const result = createTicketTypeSchema.safeParse({
    ...base,
    saleStartAt: "2026-08-20T00:00:00.000Z",
    saleEndAt: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path.at(-1), "saleEndAt");
});

test("create: allows a start with no end (open-ended sale)", () => {
  const result = createTicketTypeSchema.safeParse({ ...base, saleStartAt: "2026-08-01T00:00:00.000Z" });
  assert.equal(result.success, true);
});

test("update: allows clearing a bound with null", () => {
  const result = updateTicketTypeSchema.safeParse({ saleStartAt: null, saleEndAt: null });
  assert.equal(result.success, true);
});

test("update: still rejects an inverted window", () => {
  const result = updateTicketTypeSchema.safeParse({
    saleStartAt: "2026-08-20T00:00:00.000Z",
    saleEndAt: "2026-08-01T00:00:00.000Z",
  });
  assert.equal(result.success, false);
});
