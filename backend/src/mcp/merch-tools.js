import sharp from "sharp";
import { z } from "zod";
import { env } from "../config/env.js";
import * as merchOrdersRepository from "../repositories/merch-orders-repository.js";
import * as productImagesRepository from "../repositories/product-images-repository.js";
import * as productVariantsRepository from "../repositories/product-variants-repository.js";
import * as productsRepository from "../repositories/products-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { createMerchOrderSchema } from "../schemas/merch-order-schemas.js";
import { groupLinesBySeller, resolveCartLines } from "../services/merch-cart-service.js";
import { listCatalog } from "../services/merch-catalog-service.js";
import { createOrders, getOrderWithItems } from "../services/merch-order-service.js";
import { getPaymentInstructions } from "../services/merch-payment-service.js";
import { resolvePaymentOptionsForSeller } from "../services/payment-method-service.js";
import {
  buildAddressFields,
  listDistricts,
  listProvinces,
  listRegencies,
  listVillages,
} from "../services/regional-service.js";
import { getOriginOrThrow, quoteCart } from "../services/shipping-service.js";
import { sendImage } from "../services/whatsapp-client.js";
import { getObject } from "../utils/storage.js";
import { formatJakartaTime, formatRupiah, MERCH_ORDER_STATUS_LABELS, shortRef, toolError, truncate } from "./sitiket-tools.js";

// Merch tools for the assistant (WhatsApp + website chat) — the same steps as the web merch checkout
// (catalog → product + variant → saved delivery address → courier quote per
// seller → split-per-seller order → payment → proof), through the same
// services, on every channel. Merch is signed-in only on the web, so every
// account-bound tool acts on `context.account` — on WhatsApp the account whose
// profile phone is the sender's Meta-verified number (whatsapp-bot-service.js
// `resolveSender`), on the website the signed-in session — never an account
// the model names.

/** "Top N newest merch" the catalog tool returns. */
const MAX_LISTED_MERCH = 10;
/** Catalog rows fetched before filtering to purchasable ones (sold-out / unshippable products drop out). */
const CATALOG_SCAN_SIZE = 40;
/** Product photos sent into the chat per request — each one is a paid WhatsApp message from Oct 2026. */
const MAX_SENT_PHOTOS = 2;
/** Region search results handed to the model per call. */
const MAX_REGION_RESULTS = 25;
/** Merch order statuses that still take a payment proof. */
const OPEN_MERCH_STATUSES = ["pending_payment", "awaiting_verification"];

/** Region level → loader for its list (a parent code is needed below province). */
const REGION_LOADERS = {
  province: () => listProvinces(),
  regency: (parentCode) => listRegencies(parentCode),
  district: (parentCode) => listDistricts(parentCode),
  village: (parentCode) => listVillages(parentCode),
};

/** Profile page where buyers can also fix their phone/address themselves. */
const profileUrl = () => `${env.FRONTEND_URL}/account/profile`;

/**
 * The linked account, re-read from the DB — the address may have been
 * updated earlier in this same message.
 * @param {import("./sitiket-tools.js").ToolContext} context
 * @returns {Promise<{ account?: object, error?: object }>}
 */
const loadAccount = async (context) => {
  if (context.channel === "web" && !context.account) {
    return {
      error: toolError("SIGN_IN_REQUIRED", "The user is not signed in. Ask them to sign in with the Masuk button in the chat, then continue."),
    };
  }
  if (context.duplicateAccounts) {
    return {
      error: toolError(
        "DUPLICATE_ACCOUNTS",
        `Several SiTIKET accounts have this WhatsApp number on their profile, so none can be used. The buyer should keep it on only one account: ${profileUrl()}`,
      ),
    };
  }
  if (!context.account) {
    return {
      error: toolError(
        "NO_LINKED_ACCOUNT",
        `Merch needs a SiTIKET account and none has this WhatsApp number (+${context.waId}) on its profile. Steps: sign in with Google at ${env.FRONTEND_URL}/login, open ${profileUrl()}, save this WhatsApp number as the phone (and the delivery address), then chat again.`,
      ),
    };
  }
  return { account: await usersRepository.findById(context.account.id) };
};

/**
 * The account's saved delivery address, as the bot shows it.
 * @param {object} account - a `users` row
 */
const shippingAddressOf = (account) => ({
  complete: Boolean(account.address && account.village_code),
  street: account.address,
  village: account.village,
  district: account.district,
  city: account.city,
  province: account.province,
  postalCode: account.postal_code,
});

/**
 * @param {object} product - a catalog row (`effective_price`, `max_variant_price`)
 * @returns {string} Example: `"Rp85.000"` or `"Rp85.000 – Rp120.000"`
 */
const priceLabel = (product) =>
  product.max_variant_price && Number(product.max_variant_price) > Number(product.effective_price)
    ? `${formatRupiah(product.effective_price)} – ${formatRupiah(product.max_variant_price)}`
    : formatRupiah(product.effective_price);

/**
 * True when a seller can actually take a merch order — a payment method and a
 * shipping departure address, the two things checkout fails on otherwise.
 * @param {string} sellerId
 */
const sellerCanSell = async (sellerId) => {
  try {
    await Promise.all([resolvePaymentOptionsForSeller(sellerId), getOriginOrThrow(sellerId)]);
    return true;
  } catch {
    return false;
  }
};

/**
 * One merch order as the bot presents it, with its payment instructions.
 * @param {object} order - a `merch_orders` row
 * @param {object} account - the buyer's `users` row
 */
const merchOrderSummary = async (order, account) => {
  const [withItems, seller, instructions] = await Promise.all([
    getOrderWithItems(order.id),
    usersRepository.findById(order.seller_id),
    getPaymentInstructions(order.id, { sub: account.id }),
  ]);
  return {
    orderRef: shortRef(order.id),
    orderUrl: `${env.FRONTEND_URL}/merch-orders/${order.id}`,
    seller: seller?.name ?? null,
    status: MERCH_ORDER_STATUS_LABELS[order.status] ?? order.status,
    items: withItems.items.map((item) => ({
      name: item.product_name,
      variant: item.variant_label,
      quantity: item.quantity,
      subtotal: formatRupiah(item.subtotal),
    })),
    subtotal: formatRupiah(order.subtotal_amount),
    discount: Number(order.discount_amount) > 0 ? formatRupiah(order.discount_amount) : null,
    shipping: { courier: order.courier_name, cost: formatRupiah(order.shipping_cost), estimation: order.shipping_estimation },
    amountToPay: formatRupiah(instructions.amount),
    paymentDeadline: formatJakartaTime(order.payment_expires_at),
    bankAccounts: instructions.bankAccounts.map((account) => ({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountHolderName: account.accountHolderName,
      isRecommended: account.isRecommended,
    })),
    qris: instructions.qris
      ? { merchantName: instructions.qris.merchantName, imageUrl: `${env.FRONTEND_URL}${instructions.qris.qrisImageUrl}` }
      : null,
  };
};

/**
 * How a buyer submits merch payment proof on this channel.
 * @param {import("./sitiket-tools.js").ToolContext} context
 */
const proofHowTo = (context) =>
  context.channel === "web"
    ? "Upload the transfer proof on each order's page (orderUrl) before the deadline — proofs can't be sent in this chat."
    : "Send a PHOTO of the transfer receipt in this chat before the deadline. With more than one unpaid order, put the orderRef in the photo caption.";

/** @type {import("./sitiket-tools.js").SitiketTool[]} */
export const MERCH_TOOLS = [
  {
    name: "list_merch",
    roles: ["buyer", "admin", "super_admin"],
    description:
      "List the newest merchandise that can be bought right now (in stock, seller ready to ship), max 10. Optional keyword.",
    inputSchema: { search: z.string().max(100).optional().describe('Keyword. Example: "kaos"') },
    handler: async ({ search }) => {
      const { rows } = await listCatalog({ search: search || undefined, sortBy: "newest", pageSize: CATALOG_SCAN_SIZE });
      const inStock = rows.filter((product) => Number(product.stock_remaining) > 0);
      /** Memo of sellerId → whether they can take orders, so each seller is checked once. */
      const readyBySeller = new Map();
      const products = [];
      for (const product of inStock) {
        if (!readyBySeller.has(product.owner_id)) readyBySeller.set(product.owner_id, await sellerCanSell(product.owner_id));
        if (readyBySeller.get(product.owner_id)) products.push(product);
        if (products.length === MAX_LISTED_MERCH) break;
      }
      return {
        products: products.map((product) => ({
          productId: product.id,
          name: product.name,
          seller: product.seller_name,
          category: product.category_name,
          price: priceLabel(product),
          hasVariants: Boolean(Number(product.has_variants)),
          stockRemaining: Number(product.stock_remaining),
        })),
      };
    },
  },
  {
    name: "get_merch_details",
    roles: ["buyer", "admin", "super_admin"],
    description: "Get one merch product's details and its purchasable variants (price and stock per variant).",
    inputSchema: { productId: z.string().uuid().describe("productId from list_merch") },
    handler: async ({ productId }) => {
      const product = await productsRepository.findById(productId);
      if (!product || !product.is_active) return toolError("PRODUCT_NOT_FOUND", "Product not found or not for sale");
      const config = await productVariantsRepository.getConfig(product.id);
      const hasVariants = Boolean(Number(product.has_variants));
      return {
        productId: product.id,
        sellerId: product.owner_id,
        name: product.name,
        seller: product.seller_name,
        category: product.category_name,
        description: truncate(product.description, 600),
        weightGrams: product.weight_grams,
        price: hasVariants ? priceLabel(product) : formatRupiah(product.price),
        stockRemaining: hasVariants ? null : Math.max(product.stock - product.quantity_sold, 0),
        optionGroups: config.groups.map((group) => ({ name: group.name, options: group.options.map((option) => option.value) })),
        variants: config.variants
          .filter((variant) => variant.is_active)
          .map((variant) => ({
            variantId: variant.id,
            label: variant.label,
            price: formatRupiah(variant.price),
            stockRemaining: Math.max(variant.stock - variant.quantity_sold, 0),
          })),
        orderingNote: hasVariants
          ? "Ordering requires a variantId; only offer variants with stockRemaining > 0."
          : "No variants: order without a variantId.",
        productUrl: `${env.FRONTEND_URL}/merch/${product.slug}`,
      };
    },
  },
  {
    name: "send_merch_photos",
    roles: ["buyer", "admin", "super_admin"],
    description:
      "Show a merch product's photos straight in this chat, 2 per call (on WhatsApp each photo is a paid message). Use when the buyer wants to see the product; pass page=2, 3… only if they ask for more photos.",
    inputSchema: {
      productId: z.string().uuid().describe("productId from list_merch"),
      page: z.number().int().min(1).max(10).optional().describe("1 = first photos (default), 2 = the next ones, …"),
    },
    handler: async ({ productId, page = 1 }, context) => {
      const product = await productsRepository.findById(productId);
      if (!product || !product.is_active) return toolError("PRODUCT_NOT_FOUND", "Product not found or not for sale");
      const allImages = await productImagesRepository.listByProduct(product.id);
      if (allImages.length === 0) {
        return toolError("NO_PHOTOS", `This product has no photos yet; its page: ${env.FRONTEND_URL}/merch/${product.slug}`);
      }
      /** Index of the first photo this page sends. Example: page 2 → 2 */
      const start = (page - 1) * MAX_SENT_PHOTOS;
      const images = allImages.slice(start, start + MAX_SENT_PHOTOS);
      if (images.length === 0) return toolError("NO_MORE_PHOTOS", `All ${allImages.length} photos were already sent`);

      let sent = 0;
      for (const [offset, image] of images.entries()) {
        const position = start + offset + 1;
        const caption = position === 1 ? `${product.name} — ${priceLabel(product)}` : `${product.name} (${position}/${allImages.length})`;
        // Website chat renders the stored image itself — no conversion, no paid message.
        if (context.channel === "web") {
          context.attachments.push({ type: "image", url: image.image_url, caption });
          sent += 1;
          continue;
        }
        // Stored as WebP in R2 (`/uploads/<key>`); WhatsApp image messages take only JPEG/PNG.
        const stored = await getObject(image.image_url.replace(/^\/uploads\//, ""));
        if (!stored.ok) continue;
        const jpeg = await sharp(Buffer.from(await stored.arrayBuffer())).jpeg({ quality: 85 }).toBuffer();
        await sendImage(context.waId, jpeg, "image/jpeg", caption);
        sent += 1;
      }
      /** Photos not sent yet, offered only if the buyer asks for more. */
      const remaining = Math.max(allImages.length - (start + images.length), 0);
      return {
        sent,
        remaining,
        note:
          "The photos are already in the chat above your reply — don't paste image links. " +
          (remaining > 0 ? `Offer the ${remaining} other photo(s) (page ${page + 1}) and ` : "") +
          "follow up (e.g. variants or ordering).",
      };
    },
  },
  {
    name: "get_my_account",
    roles: ["buyer", "admin", "super_admin"],
    description:
      "Get the buyer's SiTIKET account (WhatsApp: matched by profile phone; website: the signed-in user): name, email, and saved delivery address. Required before any merch order.",
    inputSchema: {},
    handler: async (_args, context) => {
      const { account, error } = await loadAccount(context);
      if (error) return error;
      return {
        name: account.name,
        email: account.email,
        phone: account.phone,
        shippingAddress: shippingAddressOf(account),
        profileUrl: profileUrl(),
      };
    },
  },
  {
    name: "search_region",
    roles: ["buyer", "admin", "super_admin"],
    description:
      'Look up Indonesian regions to build a delivery address, top-down: level "province" (no parent), then "regency" (city/kabupaten, parent = province code), "district" (kecamatan, parent = regency code), "village" (kelurahan/desa, parent = district code; includes postal codes). Filter with a name query.',
    inputSchema: {
      level: z.enum(["province", "regency", "district", "village"]),
      parentCode: z.string().regex(/^\d{2,6}$/).optional().describe("Code of the parent region from the previous level"),
      query: z.string().max(100).optional().describe('Part of the name. Example: "bandung"'),
    },
    handler: async ({ level, parentCode, query }) => {
      if (level !== "province" && !parentCode) return toolError("PARENT_REQUIRED", `Level "${level}" needs the parent region's code`);
      const rows = await REGION_LOADERS[level](parentCode);
      const needle = query?.trim().toLowerCase();
      const matches = needle ? rows.filter((row) => row.name.toLowerCase().includes(needle)) : rows;
      return {
        level,
        totalMatches: matches.length,
        results: matches.slice(0, MAX_REGION_RESULTS).map((row) => ({
          code: row.code,
          name: row.name,
          ...(level === "village" ? { postalCodes: row.postal_codes ?? [] } : {}),
        })),
      };
    },
  },
  {
    name: "update_my_address",
    roles: ["buyer", "admin", "super_admin"],
    description:
      "Save a new delivery address on the buyer's account (same as the website's profile page). Call only after the buyer confirmed the full new address.",
    // Same limits as PATCH /api/auth/me (schemas/auth-schemas.js updateProfileSchema).
    inputSchema: {
      villageCode: z.string().regex(/^\d{10}$/).describe("10-digit village code from search_region level=village"),
      streetAddress: z.string().min(5).max(500).describe("Street, house number, RT/RW, landmark"),
      postalCode: z.string().max(20).optional().describe("One of the village's postal codes"),
    },
    handler: async ({ villageCode, streetAddress, postalCode }, context) => {
      const { account, error } = await loadAccount(context);
      if (error) return error;
      // Region names/codes are resolved server-side from the village, never free-typed.
      const fields = await buildAddressFields(villageCode, postalCode);
      const updated = await usersRepository.updateProfile(account.id, { address: streetAddress, ...fields });
      return { updated: true, shippingAddress: shippingAddressOf(updated) };
    },
  },
  {
    name: "quote_merch_shipping",
    roles: ["buyer", "admin", "super_admin"],
    description:
      "Get courier options and prices per seller for the chosen merch items, shipped to the buyer's saved address. Items from different sellers ship (and are paid) separately.",
    inputSchema: { items: createMerchOrderSchema.shape.items },
    handler: async ({ items }, context) => {
      const { account, error } = await loadAccount(context);
      if (error) return error;
      if (!account.village_code) return toolError("ADDRESS_REQUIRED", "Set the delivery address first (update_my_address)");

      const [quotes, lines] = await Promise.all([quoteCart({ sub: account.id }, items), resolveCartLines(items)]);
      const linesBySeller = groupLinesBySeller(lines);
      const sellers = await Promise.all(
        quotes.map(async (quote) => {
          const sellerLines = linesBySeller.get(quote.sellerId) ?? [];
          const seller = await usersRepository.findById(quote.sellerId);
          return {
            sellerId: quote.sellerId,
            sellerName: seller?.name ?? null,
            items: sellerLines.map((line) => ({
              name: line.product.name,
              variant: line.variant?.label ?? null,
              quantity: line.quantity,
              unitPrice: formatRupiah(line.unitPrice),
            })),
            subtotal: formatRupiah(sellerLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)),
            weightKg: quote.weightKg,
            couriers: quote.couriers.map((courier) => ({
              courierCode: courier.courier_code,
              courierName: courier.courier_name,
              price: formatRupiah(courier.price),
              estimation: courier.estimation,
            })),
          };
        }),
      );
      return {
        shipTo: shippingAddressOf(account),
        sellers,
        note: sellers.length > 1 ? "Items from different sellers become separate orders, each paid and shipped separately." : null,
      };
    },
  },
  {
    name: "create_merch_order",
    roles: ["buyer", "admin", "super_admin"],
    description:
      "Place the merch order (reserves stock; 24h to pay). Call ONLY after the buyer confirmed items, variants, quantities, courier per seller, delivery address and totals. One order is created per seller; returns each order's payment instructions.",
    // Same schema as POST /api/merch-orders.
    inputSchema: createMerchOrderSchema.shape,
    handler: async (input, context) => {
      const { account, error } = await loadAccount(context);
      if (error) return error;
      const orders = await createOrders({ sub: account.id }, input);
      return {
        shipTo: shippingAddressOf(account),
        orders: await Promise.all(orders.map((order) => merchOrderSummary(order, account))),
        howToSubmitProof: proofHowTo(context),
      };
    },
  },
  {
    name: "get_merch_payment_instructions",
    roles: ["buyer", "admin", "super_admin"],
    description: "Payment instructions (amount, bank/QRIS, deadline) for the buyer's unpaid merch orders.",
    inputSchema: {},
    handler: async (_args, context) => {
      const { account, error } = await loadAccount(context);
      if (error) return error;
      const open = (await merchOrdersRepository.listByBuyer(account.id)).filter((order) =>
        OPEN_MERCH_STATUSES.includes(order.status),
      );
      if (open.length === 0) return toolError("NO_OPEN_MERCH_ORDER", "The buyer has no merch order awaiting payment");
      return {
        orders: await Promise.all(open.map((order) => merchOrderSummary(order, account))),
        howToSubmitProof: proofHowTo(context),
      };
    },
  },
];
