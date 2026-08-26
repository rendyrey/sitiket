import type {
  AdminApplication,
  AppNotification,
  BankAccount,
  EventImage,
  EventStaff,
  StaffInvitation,
  MerchCategory,
  MerchOrder,
  MerchOrderItem,
  MerchOrderPayment,
  OrderPayment,
  OrganizerEmailConfig,
  Product,
  ProductDetail,
  ProductImage,
  ProductOptionGroup,
  ProductVariant,
  PromoCode,
  QrisConfig,
  RawAdminApplication,
  RawBankAccount,
  RawEventImage,
  RawEventStaff,
  RawEventStaffWithUser,
  RawStaffInvitation,
  RawMerchCategory,
  RawMerchOrder,
  RawMerchOrderItem,
  RawMerchOrderPayment,
  RawNotification,
  RawOrderPayment,
  RawOrganizerEmailConfig,
  RawProduct,
  RawProductDetail,
  RawProductImage,
  RawProductOptionGroup,
  RawProductVariant,
  RawPromoCode,
  RawQrisConfig,
  RawRefundRequest,
  RawRefundRequestWithOrderContext,
  RawSellerShippingOrigin,
  RawShippingQuote,
  SellerShippingOrigin,
  ShippingQuote,
  RawTaxonomy,
  RawTicketType,
  RefundRequest,
  TaxonomyItem,
  TicketType,
} from "./types";

/**
 * Client-side equivalent of the backend's `utils/presenters.js` — converts
 * the 9 entities the backend returns as raw Knex rows (snake_case,
 * `TINYINT(1)` booleans) into the plain camelCase/boolean shape the rest of
 * the app uses. See lib/api/types.ts for why this exists.
 */

export const toBankAccount = (raw: RawBankAccount): BankAccount => ({
  id: raw.id,
  ownerId: raw.owner_id,
  bankName: raw.bank_name,
  accountNumber: raw.account_number,
  accountHolderName: raw.account_holder_name,
  isDefault: raw.is_default === 1,
  isVisible: raw.is_visible === 1,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const toAdminApplication = (raw: RawAdminApplication): AdminApplication => ({
  id: raw.id,
  userId: raw.user_id,
  businessName: raw.business_name,
  businessDescription: raw.business_description,
  contactPhone: raw.contact_phone,
  status: raw.status,
  reviewedBy: raw.reviewed_by,
  reviewedAt: raw.reviewed_at,
  reviewNotes: raw.review_notes,
  createdAt: raw.created_at,
});

export const toEventImage = (raw: RawEventImage): EventImage => ({
  id: raw.id,
  eventId: raw.event_id,
  imageUrl: raw.image_url,
  isPoster: raw.is_poster === 1,
  width: raw.width,
  height: raw.height,
  sortOrder: raw.sort_order,
  createdAt: raw.created_at,
});

export const toEventStaff = (raw: RawEventStaff | RawEventStaffWithUser): EventStaff => ({
  id: raw.id,
  eventId: raw.event_id,
  userId: raw.user_id,
  role: raw.role,
  status: raw.status,
  invitedBy: raw.invited_by,
  createdAt: raw.created_at,
  ...("user_name" in raw ? { userName: raw.user_name, userEmail: raw.user_email } : {}),
});

export const toStaffInvitation = (raw: RawStaffInvitation): StaffInvitation => ({
  id: raw.id,
  eventId: raw.event_id,
  userId: raw.user_id,
  role: raw.role,
  status: raw.status,
  invitedBy: raw.invited_by,
  createdAt: raw.created_at,
  eventName: raw.event_name,
  eventSlug: raw.event_slug,
  eventStartDate: raw.event_start_date,
  eventVenueName: raw.event_venue_name,
  eventCity: raw.event_city,
  inviterName: raw.inviter_name,
});

export const toTicketType = (raw: RawTicketType): TicketType => ({
  id: raw.id,
  eventId: raw.event_id,
  categoryId: raw.category_id,
  name: raw.name,
  price: raw.price,
  quantityTotal: raw.quantity_total,
  quantitySold: raw.quantity_sold,
  saleStartAt: raw.sale_start_at,
  saleEndAt: raw.sale_end_at,
  isActive: raw.is_active === 1,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const toPromoCode = (raw: RawPromoCode): PromoCode => ({
  id: raw.id,
  eventId: raw.event_id,
  code: raw.code,
  discountType: raw.discount_type,
  discountValue: Number(raw.discount_value),
  maxUses: raw.max_uses,
  usedCount: raw.used_count,
  validFrom: raw.valid_from,
  validUntil: raw.valid_until,
  isActive: raw.is_active === 1,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const toQrisConfig = (raw: RawQrisConfig): QrisConfig => ({
  id: raw.id,
  ownerId: raw.owner_id,
  merchantName: raw.merchant_name,
  qrisImageUrl: raw.qris_image_url,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const toOrganizerEmailConfig = (raw: RawOrganizerEmailConfig): OrganizerEmailConfig => ({
  id: raw.id,
  ownerId: raw.owner_id,
  provider: raw.provider,
  smtpHost: raw.smtp_host,
  smtpPort: raw.smtp_port,
  smtpSecure: raw.smtp_secure === 1,
  fromEmail: raw.from_email,
  fromName: raw.from_name,
  googleConnected: raw.google_connected === 1,
  verifiedAt: raw.verified_at,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const toOrderPayment = (raw: RawOrderPayment): OrderPayment => ({
  id: raw.id,
  orderId: raw.order_id,
  bankAccountId: raw.bank_account_id,
  method: raw.method,
  amount: raw.amount,
  proofImageUrl: raw.proof_image_url,
  transferNote: raw.transfer_note,
  status: raw.status,
  reviewedBy: raw.reviewed_by,
  reviewedAt: raw.reviewed_at,
  reviewerNotes: raw.reviewer_notes,
  submittedAt: raw.submitted_at,
});

export const toRefundRequest = (raw: RawRefundRequest | RawRefundRequestWithOrderContext): RefundRequest => ({
  id: raw.id,
  orderId: raw.order_id,
  requestedBy: raw.requested_by,
  reason: raw.reason,
  status: raw.status,
  processedBy: raw.processed_by,
  processedAt: raw.processed_at,
  notes: raw.notes,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  ...("event_id" in raw ? { eventId: raw.event_id, totalAmount: raw.total_amount } : {}),
});

export const toTaxonomyItem = (raw: RawTaxonomy): TaxonomyItem => ({
  id: raw.id,
  name: raw.name,
  slug: raw.slug,
  isActive: raw.is_active === 1,
  sortOrder: raw.sort_order,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const toMerchCategory = (raw: RawMerchCategory): MerchCategory => ({
  ...toTaxonomyItem(raw),
  ...(raw.product_count !== undefined ? { productCount: Number(raw.product_count) } : {}),
});

export const toProduct = (raw: RawProduct): Product => ({
  id: raw.id,
  ownerId: raw.owner_id,
  categoryId: raw.category_id,
  categoryName: raw.category_name,
  categorySlug: raw.category_slug,
  sellerName: raw.seller_name ?? null,
  name: raw.name,
  slug: raw.slug,
  description: raw.description,
  price: raw.price,
  stock: raw.stock,
  weightGrams: raw.weight_grams,
  quantitySold: raw.quantity_sold,
  isActive: raw.is_active === 1,
  thumbnailUrl: raw.thumbnail_url,
  // MySQL aggregates/correlated subqueries may arrive as strings — coerce.
  effectivePrice: Number(raw.effective_price),
  maxVariantPrice: raw.max_variant_price === null ? null : Number(raw.max_variant_price),
  stockRemaining: Number(raw.stock_remaining ?? 0),
  hasVariants: Number(raw.has_variants) === 1,
  ...(raw.units_sold !== undefined ? { unitsSold: Number(raw.units_sold) } : {}),
  ...(raw.revenue !== undefined ? { revenue: Number(raw.revenue) } : {}),
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const toProductImage = (raw: RawProductImage): ProductImage => ({
  id: raw.id,
  productId: raw.product_id,
  imageUrl: raw.image_url,
  sortOrder: raw.sort_order,
  createdAt: raw.created_at,
});

export const toProductOptionGroup = (raw: RawProductOptionGroup): ProductOptionGroup => ({
  id: raw.id,
  productId: raw.product_id,
  name: raw.name,
  position: raw.position,
  options: raw.options.map((option) => ({
    id: option.id,
    groupId: option.group_id,
    value: option.value,
    position: option.position,
  })),
});

export const toProductVariant = (raw: RawProductVariant): ProductVariant => ({
  id: raw.id,
  productId: raw.product_id,
  label: raw.label,
  price: raw.price,
  stock: raw.stock,
  quantitySold: raw.quantity_sold,
  isActive: raw.is_active === 1,
  optionIds: raw.option_ids,
});

export const toProductDetail = (raw: RawProductDetail): ProductDetail => ({
  ...toProduct(raw),
  images: raw.images.map(toProductImage),
  groups: raw.groups.map(toProductOptionGroup),
  variants: raw.variants.map(toProductVariant),
});

export const toMerchOrderItem = (raw: RawMerchOrderItem): MerchOrderItem => ({
  id: raw.id,
  merchOrderId: raw.merch_order_id,
  productId: raw.product_id,
  variantId: raw.variant_id,
  productName: raw.product_name,
  variantLabel: raw.variant_label,
  quantity: raw.quantity,
  unitPrice: raw.unit_price,
  subtotal: raw.subtotal,
});

export const toMerchOrder = (raw: RawMerchOrder): MerchOrder => ({
  id: raw.id,
  sellerId: raw.seller_id,
  userId: raw.user_id,
  buyerName: raw.buyer_name,
  buyerEmail: raw.buyer_email,
  buyerPhone: raw.buyer_phone,
  shippingAddress: raw.shipping_address,
  shippingCity: raw.shipping_city,
  shippingProvince: raw.shipping_province,
  shippingPostalCode: raw.shipping_postal_code,
  shippingDistrict: raw.shipping_district,
  shippingVillage: raw.shipping_village,
  shippingVillageCode: raw.shipping_village_code,
  originVillageCode: raw.origin_village_code,
  courierCode: raw.courier_code,
  courierName: raw.courier_name,
  shippingEstimation: raw.shipping_estimation,
  shippingCost: raw.shipping_cost,
  shippingWeightGrams: raw.shipping_weight_grams,
  buyerNote: raw.buyer_note,
  subtotalAmount: raw.subtotal_amount,
  totalAmount: raw.total_amount,
  status: raw.status,
  paymentExpiresAt: raw.payment_expires_at,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  ...(raw.items ? { items: raw.items.map(toMerchOrderItem) } : {}),
});

export const toMerchOrderPayment = (raw: RawMerchOrderPayment): MerchOrderPayment => ({
  id: raw.id,
  merchOrderId: raw.merch_order_id,
  bankAccountId: raw.bank_account_id,
  method: raw.method,
  amount: raw.amount,
  proofImageUrl: raw.proof_image_url,
  transferNote: raw.transfer_note,
  status: raw.status,
  reviewedBy: raw.reviewed_by,
  reviewedAt: raw.reviewed_at,
  reviewerNotes: raw.reviewer_notes,
  submittedAt: raw.submitted_at,
});

export const toAppNotification = (raw: RawNotification): AppNotification => ({
  id: raw.id,
  userId: raw.user_id,
  type: raw.type,
  title: raw.title,
  body: raw.body,
  href: raw.href,
  readAt: raw.read_at,
  createdAt: raw.created_at,
});

export const toSellerShippingOrigin = (raw: RawSellerShippingOrigin): SellerShippingOrigin => ({
  id: raw.id,
  ownerId: raw.owner_id,
  address: raw.address,
  province: raw.province,
  city: raw.city,
  district: raw.district,
  village: raw.village,
  provinceCode: raw.province_code,
  cityCode: raw.city_code,
  districtCode: raw.district_code,
  villageCode: raw.village_code,
  postalCode: raw.postal_code,
  enabledCouriers: raw.enabled_couriers,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const toShippingQuote = (raw: RawShippingQuote): ShippingQuote => ({
  sellerId: raw.sellerId,
  weightGrams: raw.weightGrams,
  weightKg: raw.weightKg,
  couriers: raw.couriers.map((courier) => ({
    courierCode: courier.courier_code,
    courierName: courier.courier_name,
    price: courier.price,
    estimation: courier.estimation,
  })),
});
