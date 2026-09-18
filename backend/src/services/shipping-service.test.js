import assert from "node:assert/strict";
import test from "node:test";
import { __testables } from "./shipping-service.js";

const { cheapestPerCourier } = __testables;

const rate = (overrides) => ({
  courier_code: "jne",
  courier_name: "JNE Express",
  service_name: "Reguler",
  etd: "1-2",
  price: 10000,
  handling_fee: 0,
  ...overrides,
});

test("keeps only the cheapest service per courier", () => {
  const options = cheapestPerCourier([
    rate({ service_name: "YES", price: 18000 }),
    rate({ service_name: "Reguler", price: 9000 }),
    rate({ courier_code: "sicepat", courier_name: "Sicepat Express", service_name: "REG", price: 12000 }),
  ]);

  assert.deepEqual(
    options.map((option) => [option.courier_code, option.courier_name, option.price]),
    [
      ["jne", "JNE Express — Reguler", 9000],
      ["sicepat", "Sicepat Express — REG", 12000],
    ],
  );
});

test("charges price plus handling fee, preferring the vendor's total_price", () => {
  const [option] = cheapestPerCourier([rate({ price: 9000, handling_fee: 500 })]);
  assert.equal(option.price, 9500);

  const [withTotal] = cheapestPerCourier([rate({ price: 9000, handling_fee: 500, total_price: 10500 })]);
  assert.equal(withTotal.price, 10500);
});

test("drops unpriced rates and reports the ETD in days", () => {
  assert.deepEqual(cheapestPerCourier([rate({ price: 0, handling_fee: 0 })]), []);
  assert.equal(cheapestPerCourier([rate({ etd: "1-2" })])[0].estimation, "1-2 days");
  assert.equal(cheapestPerCourier([rate({ etd: null })])[0].estimation, null);
});
