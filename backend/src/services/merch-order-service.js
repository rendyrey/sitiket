import { db } from "../config/db.js";
import { env } from "../config/env.js";
import * as merchOrderItemsRepository from "../repositories/merch-order-items-repository.js";
import * as merchOrdersRepository from "../repositories/merch-orders-repository.js";
import * as productVariantsRepository from "../repositories/product-variants-repository.js";
import * as productsRepository from "../repositories/products-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http-error.js";
import {
  notifyMerchOrderCancelled,
  notifyMerchOrderExpired,
  notifyMerchOrderPlaced,
} from "./notification-service.js";
import { resolvePaymentOptionsForSeller } from "./payment-method-service.js";
import { pushNotification } from "./web-notification-service.js";

const formatRupiah = (amount) => `Rp ${Number(amount).toLocaleString("id-ID")}`;

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
 * - stock is reserved via guarded atomic UPDATEs so overselling is impossible;
 * - the buyer's identity/contact/shipping details come from their signed-in
 *   profile (merch checkout requires an account and a saved address).
 *
 * @param {{ sub: string }} requester - merch checkout is signed-in only
 * @param {{ items: Array<{ productId: string, variantId?: string, quantity: number }>, buyerNote?: string }} input
 * @returns {Promise<object[]>} the created orders (one per seller), each with its `items`
 */
export const createOrders = async (requester, input) => {
  const buyer = await usersRepository.findById(requester.sub);
  if (!buyer.phone || !buyer.address) {
    throw conflict(
      "PROFILE_INCOMPLETE",
      "Add your phone number and delivery address to your account before checking out merch",
    );
  }

  // Resolve every line against the live catalog, server-side.
  const lines = [];
  for (const item of input.items) {
    const product = await productsRepository.findById(item.productId);
    if (!product || !product.is_active) {
      throw badRequest("PRODUCT_NOT_AVAILABLE", `Product ${item.productId} is not available`);
    }

    let variant = null;
    if (product.has_variants) {
      if (!item.variantId) throw badRequest("VARIANT_REQUIRED", `"${product.name}" requires choosing a variant`);
      variant = await productVariantsRepository.findVariantById(item.variantId);
      if (!variant || variant.product_id !== product.id || !variant.is_active) {
        throw badRequest("VARIANT_NOT_AVAILABLE", `The chosen variant of "${product.name}" is not available`);
      }
    } else if (item.variantId) {
      throw badRequest("VARIANT_NOT_AVAILABLE", `"${product.name}" has no variants`);
    }

    lines.push({
      product,
      variant,
      quantity: item.quantity,
      unitPrice: variant ? variant.price : product.price,
    });
  }

  // Group per seller; fail fast if any seller has no way to get paid,
  // BEFORE reserving anyone's stock.
  const linesBySeller = new Map();
  for (const line of lines) {
    const sellerId = line.product.owner_id;
    if (!linesBySeller.has(sellerId)) linesBySeller.set(sellerId, []);
    linesBySeller.get(sellerId).push(line);
  }
  await Promise.all([...linesBySeller.keys()].map((sellerId) => resolvePaymentOptionsForSeller(sellerId)));

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
          buyerNote: input.buyerNote,
          subtotalAmount,
          totalAmount: subtotalAmount,
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
