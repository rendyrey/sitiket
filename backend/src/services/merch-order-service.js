import { db } from "../config/db.js";
import { env } from "../config/env.js";
import * as merchOrderItemsRepository from "../repositories/merch-order-items-repository.js";
import * as merchOrdersRepository from "../repositories/merch-orders-repository.js";
import * as merchPromoCodesRepository from "../repositories/merch-promo-codes-repository.js";
import * as productVariantsRepository from "../repositories/product-variants-repository.js";
import * as productsRepository from "../repositories/products-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http-error.js";
import { groupLinesBySeller, resolveCartLines, totalWeightGrams } from "./merch-cart-service.js";
import {
  notifyMerchOrderCancelled,
  notifyMerchOrderExpired,
  notifyMerchOrderPlaced,
} from "./notification-service.js";
import { calculateDiscount, validateForOrder as validateMerchPromoForOrder } from "./merch-promo-code-service.js";
import { resolvePaymentOptionsForSeller } from "./payment-method-service.js";
import { filterCouriersForOrigin, getCourierOptions, getOriginOrThrow, gramsToBillableKg } from "./shipping-service.js";
import { pushNotification } from "./web-notification-service.js";

const formatRupiah = (amount) => `Rp${Number(amount).toLocaleString("id-ID")}`;

/**
 * Creates merch checkout orders from a (possibly multi-seller) cart.
 *
 * The cart is SPLIT into one order per seller — payment is a manual transfer
 * to each seller's own bank account/QRIS, so a combined order could never be
 * settled in one payment (the checkout UI warns the buyer about this before
 * submitting). All sellers' orders are created in ONE transaction: if any
 * line's stock reservation fails, the whole checkout rolls back rather than
 * leaving the buyer with a random subset of orders.
 *
 * Server-side invariants (mirroring ticket order-service.js):
 * - unit prices always come from the products/variants tables, never the client;
 * - the shipping cost is re-priced server-side from the seller's departure
 *   village and the cart's weight — the client only names a courier code;
 * - stock is reserved via guarded atomic UPDATEs so overselling is impossible;
 * - the buyer's identity/contact/shipping details come from their signed-in
 *   profile (merch checkout requires an account and a saved address).
 *
 * @param {{ sub: string }} requester - merch checkout is signed-in only
 * @param {{ items: Array<{ productId: string, variantId?: string, quantity: number }>,
 *   shipping: Array<{ sellerId: string, courierCode: string }>,
 *   promoCodes?: Array<{ sellerId: string, code: string }>, buyerNote?: string }} input
 * @returns {Promise<object[]>} the created orders (one per seller), each with its `items`
 */
export const createOrders = async (requester, input) => {
  const buyer = await usersRepository.findById(requester.sub);
  if (!buyer.phone || !buyer.address || !buyer.village_code) {
    throw conflict(
      "PROFILE_INCOMPLETE",
      "Add your phone number and delivery address (down to the village) to your account before checking out merch",
    );
  }

  // Resolve every line against the live catalog, server-side, and group per
  // seller (one order + one shipment per seller).
  const lines = await resolveCartLines(input.items);
  const linesBySeller = groupLinesBySeller(lines);

  // Fail fast if any seller has no way to get paid, BEFORE reserving stock.
  await Promise.all([...linesBySeller.keys()].map((sellerId) => resolvePaymentOptionsForSeller(sellerId)));

  /** Map of sellerId → the buyer's chosen courier code for that seller's shipment. */
  const courierBySeller = new Map(input.shipping.map((choice) => [choice.sellerId, choice.courierCode]));

  // Price every seller's shipment BEFORE the transaction: the quote comes
  // from the DB cache the checkout page already primed, so this normally
  // spends no vendor credit and never holds stock while waiting on a vendor.
  const shipmentBySeller = new Map();
  for (const [sellerId, sellerLines] of linesBySeller) {
    const courierCode = courierBySeller.get(sellerId);
    if (!courierCode) {
      throw badRequest("COURIER_REQUIRED", "Choose a shipping courier for every seller in the cart");
    }

    const seller = await usersRepository.findById(sellerId);
    const origin = await getOriginOrThrow(sellerId, seller?.name);
    const weightGrams = totalWeightGrams(sellerLines);
    // Same whitelist filter as the quote endpoint — a courier the seller
    // disabled can never be smuggled in by code.
    const couriers = filterCouriersForOrigin(
      origin,
      await getCourierOptions(origin.village_code, buyer.village_code, gramsToBillableKg(weightGrams)),
    );
    const courier = couriers.find((option) => option.courier_code === courierCode);
    if (!courier) {
      throw badRequest("COURIER_NOT_AVAILABLE", `Courier "${courierCode}" is not available for this shipment`);
    }
    shipmentBySeller.set(sellerId, { origin, courier, weightGrams });
  }

  // Validate an optional promo code per seller BEFORE the transaction and
  // pre-compute its discount from that seller's subtotal. Codes are
  // seller-scoped, so a code only ever discounts its own seller's order. The
  // atomic consume happens inside the transaction (incrementUsage).
  const promoBySeller = new Map((input.promoCodes ?? []).map((choice) => [choice.sellerId, choice.code]));
  const discountBySeller = new Map();
  for (const [sellerId, sellerLines] of linesBySeller) {
    const code = promoBySeller.get(sellerId);
    if (!code) continue;
    const promoCode = await validateMerchPromoForOrder(sellerId, code);
    const subtotalAmount = sellerLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    discountBySeller.set(sellerId, { promoCode, discountAmount: calculateDiscount(promoCode, subtotalAmount) });
  }

  const paymentExpiresAt = new Date(Date.now() + env.MERCH_PAYMENT_HOLD_HOURS * 60 * 60 * 1000);

  const orderIds = await db.transaction(async (trx) => {
    const createdIds = [];
    for (const [sellerId, sellerLines] of linesBySeller) {
      for (const line of sellerLines) {
        const reserved = line.variant
          ? await productVariantsRepository.reserveStock(line.variant.id, line.quantity, trx)
          : await productsRepository.reserveStock(line.product.id, line.quantity, trx);
        if (!reserved) {
          const label = line.variant ? `${line.product.name} (${line.variant.label})` : line.product.name;
          throw conflict("OUT_OF_STOCK", `"${label}" no longer has enough stock`);
        }
      }

      const subtotalAmount = sellerLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
      const { origin, courier, weightGrams } = shipmentBySeller.get(sellerId);

      // Consume the seller's promo code atomically — the guarded UPDATE re-checks
      // the cap, so a code on its last use can't be redeemed by two concurrent
      // checkouts.
      const promo = discountBySeller.get(sellerId);
      let discountAmount = 0;
      if (promo) {
        const consumed = await merchPromoCodesRepository.incrementUsage(promo.promoCode.id, trx);
        if (!consumed) throw conflict("MERCH_PROMO_CODE_EXHAUSTED", "Promo code has reached its usage limit");
        discountAmount = promo.discountAmount;
      }

      const orderId = await merchOrdersRepository.create(
        {
          sellerId,
          userId: buyer.id,
          buyerName: buyer.name,
          buyerEmail: buyer.email,
          buyerPhone: buyer.phone,
          shippingAddress: buyer.address,
          shippingCity: buyer.city,
          shippingProvince: buyer.province,
          shippingPostalCode: buyer.postal_code,
          shippingDistrict: buyer.district,
          shippingVillage: buyer.village,
          shippingVillageCode: buyer.village_code,
          originVillageCode: origin.village_code,
          courierCode: courier.courier_code,
          courierName: courier.courier_name,
          shippingEstimation: courier.estimation,
          shippingCost: courier.price,
          shippingWeightGrams: weightGrams,
          buyerNote: input.buyerNote,
          promoCodeId: promo?.promoCode.id ?? null,
          subtotalAmount,
          discountAmount,
          totalAmount: subtotalAmount - discountAmount + courier.price,
          paymentExpiresAt,
        },
        trx,
      );

      await merchOrderItemsRepository.createMany(
        sellerLines.map((line) => ({
          productId: line.product.id,
          variantId: line.variant?.id ?? null,
          productName: line.product.name,
          variantLabel: line.variant?.label ?? null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        orderId,
        trx,
      );
      createdIds.push(orderId);
    }
    return createdIds;
  });

  // Notify each seller (email + bell) — after commit, fire-and-log.
  const orders = await Promise.all(orderIds.map((id) => getOrderWithItems(id)));
  for (const order of orders) {
    const seller = await usersRepository.findById(order.seller_id);
    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
    await notifyMerchOrderPlaced(order, seller);
    await pushNotification({
      userId: order.seller_id,
      type: "merch_order_placed",
      title: "New merch order",
      body: `${order.buyer_name} ordered ${itemCount} item${itemCount === 1 ? "" : "s"} — ${formatRupiah(order.total_amount)}`,
      href: "/dashboard/admin/merch/orders",
    });
  }

  return orders;
};

/** @param {string} orderId */
export const getOrderWithItems = async (orderId) => {
  const order = await merchOrdersRepository.findById(orderId);
  if (!order) throw notFound("MERCH_ORDER_NOT_FOUND", "Merch order not found");
  const items = await merchOrderItemsRepository.listByOrder(orderId);
  return { ...order, items };
};

/**
 * @param {string} orderId
 * @param {{ sub: string, role: string }} requester - buyer, seller, or super_admin
 */
export const getOrderForViewer = async (orderId, requester) => {
  const order = await getOrderWithItems(orderId);
  const allowed =
    order.user_id === requester.sub || order.seller_id === requester.sub || requester.role === "super_admin";
  if (!allowed) throw forbidden("NOT_MERCH_ORDER_PARTY", "You do not have access to this merch order");
  return order;
};

/** Buyer purchase history, items attached. @param {string} userId */
export const listMyOrders = async (userId) => {
  const orders = await merchOrdersRepository.listByBuyer(userId);
  return attachItems(orders);
};

/**
 * Seller-facing paginated listing with buyer details, items attached per page.
 * @param {string} sellerId
 * @param {object} [filters] - see repositories/merch-orders-repository.js `listBySeller`
 */
export const listSellingOrders = async (sellerId, filters) => {
  const { rows, ...meta } = await merchOrdersRepository.listBySeller(sellerId, filters);
  return { rows: await attachItems(rows), ...meta };
};

const attachItems = async (orders) => {
  const items = await merchOrderItemsRepository.listByOrders(orders.map((order) => order.id));
  return orders.map((order) => ({
    ...order,
    items: items.filter((item) => item.merch_order_id === order.id),
  }));
};

/**
 * Releases an order's reserved stock and marks it cancelled or expired.
 * Shared by explicit cancellation and the stale-order sweep.
 *
 * Variant-based items (variant_label set) release variant stock — a no-op if
 * the seller has since replaced the variant config (the new config started
 * from zero sold). Base-stock items (variant_label null) release the
 * product's base stock.
 * @param {object} order - a `merch_orders` row
 * @param {"cancelled" | "expired"} status
 */
const releaseOrder = async (order, status) => {
  const items = await merchOrderItemsRepository.listByOrder(order.id);
  await db.transaction(async (trx) => {
    for (const item of items) {
      if (item.variant_label) {
        if (item.variant_id) await productVariantsRepository.releaseStock(item.variant_id, item.quantity, trx);
      } else {
        await productsRepository.releaseStock(item.product_id, item.quantity, trx);
      }
    }
    if (order.promo_code_id) {
      await merchPromoCodesRepository.decrementUsage(order.promo_code_id, trx);
    }
    await merchOrdersRepository.updateStatus(order.id, status, trx);
  });

  const seller = await usersRepository.findById(order.seller_id);
  if (status === "cancelled") {
    await notifyMerchOrderCancelled(order, seller);
  } else {
    await notifyMerchOrderExpired(order, seller);
    await pushNotification({
      userId: order.user_id,
      type: "merch_order_expired",
      title: "Merch order expired",
      body: `The payment window for your ${formatRupiah(order.total_amount)} order closed, so its stock was released.`,
      href: `/merch-orders/${order.id}`,
    });
  }
};

/**
 * @param {string} orderId
 * @param {{ sub: string, role: string }} requester - buyer, seller, or super_admin
 */
export const cancelOrder = async (orderId, requester) => {
  const order = await merchOrdersRepository.findById(orderId);
  if (!order) throw notFound("MERCH_ORDER_NOT_FOUND", "Merch order not found");

  const allowed =
    order.user_id === requester.sub || order.seller_id === requester.sub || requester.role === "super_admin";
  if (!allowed) throw forbidden("NOT_MERCH_ORDER_PARTY", "You do not have access to this merch order");

  if (!["pending_payment", "awaiting_verification"].includes(order.status)) {
    throw conflict("MERCH_ORDER_NOT_CANCELLABLE", `Merch order is already "${order.status}"`);
  }

  await releaseOrder(order, "cancelled");
  return merchOrdersRepository.findById(orderId);
};

/**
 * Sweeps merch orders whose 24h payment hold expired with no proof ever
 * submitted, releasing their reserved stock. Runs on the same interval as the
 * ticket sweep — see server.js.
 */
export const expireStaleMerchOrders = async () => {
  const expired = await merchOrdersRepository.findExpiredPendingOrders();
  for (const order of expired) {
    await releaseOrder(order, "expired");
  }
  return expired.length;
};
