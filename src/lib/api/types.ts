/**
 * SiTIKET backend API types — hand-mirrored from `backend/src/schemas/*.js`,
 * `backend/src/utils/presenters.js`, and `backend/src/repositories/*.js`.
 * Keep this in sync with the backend when either side changes a shape.
 *
 * Only 4 entities (User, Event, Order, Ticket) pass through a backend
 * presenter and arrive camelCase with real booleans. Every other entity
 * below is a raw Knex row: snake_case, and any boolean column arrives as
 * the MySQL `TINYINT(1)` value `0 | 1`, not `true`/`false`. The `Raw*`
 * interfaces here match that wire shape exactly; `normalize.ts` converts
 * each into the plain camelCase/boolean type of the same name (without the
 * `Raw` prefix) that the rest of the app should use.
 */

// ============================================================================
// Shared primitives
// ============================================================================

export type Uuid = string;
/** ISO-8601 UTC datetime string, e.g. `"2026-06-20T09:00:00.000Z"`. */
export type IsoDateTimeString = string;
/** Whole-Rupiah integer amount — IDR has no cents in practice. */
export type RupiahAmount = number;
/** MySQL `TINYINT(1)` boolean as returned by mysql2 on raw (non-presented) rows. */
export type MysqlRawBoolean = 0 | 1;

// ============================================================================
// Enums
// ============================================================================

export type UserRole = "user" | "admin" | "super_admin";
export type UserStatus = "active" | "suspended";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type MeetingPlatform = "zoom" | "google_meet" | "other";
export type AdminApplicationStatus = "pending" | "approved" | "rejected";
export type EventStaffRole = "scanner";
export type DiscountType = "percentage" | "fixed_amount";
export type OrderStatus =
  | "pending_payment"
  | "awaiting_verification"
  | "paid"
  | "expired"
  | "cancelled"
  | "refund_requested"
  | "refunded"
  | "refund_rejected";
export type OrderPaymentStatus = "pending_review" | "approved" | "rejected";
export type PaymentMethod = "bank_transfer" | "qris";
export type EmailProvider = "gmail" | "custom";
export type RefundStatus = "requested" | "approved" | "rejected" | "completed";
export type TicketStatus = "issued" | "used" | "void";
export type CheckInResult = "success" | "duplicate" | "invalid" | "expired";
/** Merch orders have no refund machinery in v1 — the seller settles directly with the buyer. */
export type MerchOrderStatus = "pending_payment" | "awaiting_verification" | "paid" | "expired" | "cancelled";
export type MerchCatalogSort = "newest" | "price_asc" | "price_desc";

// ============================================================================
// Presenter-shaped entities — already camelCase, booleans already real
// ============================================================================

export interface User {
  id: Uuid;
  email: string;
  emailVerifiedAt: IsoDateTimeString | null;
  name: string;
  phone: string | null;
  /** Delivery address — a prerequisite for merch checkout (snapshotted onto each merch order). */
  address: string | null;
  city: string | null;
  province: string | null;
  /** Region names below city level — resolved server-side from the chosen village, never free-typed. */
  district: string | null;
  village: string | null;
  /** api.co.id region codes; `villageCode` (10 digits) is what shipping quotes key on. */
  provinceCode: string | null;
  cityCode: string | null;
  districtCode: string | null;
  villageCode: string | null;
  postalCode: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: IsoDateTimeString;
}

export interface EventCategoryRef {
  id: Uuid;
  name: string;
  slug: string;
}

export interface Event {
  id: Uuid;
  ownerId: Uuid;
  category: EventCategoryRef;
  name: string;
  slug: string;
  description: string;
  status: EventStatus;
  isVisible: boolean;
  startDate: IsoDateTimeString;
  endDate: IsoDateTimeString;
  venueName: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string;
  meetingUrl: string | null;
  meetingPlatform: MeetingPlatform | null;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  /** `null` means "resolve to the owner's default BankAccount at checkout time". */
  bankAccountId: Uuid | null;
  /** Buyers may pay by scanning the organizer's QRIS code (requires the owner's QrisConfig). */
  qrisEnabled: boolean;
  maxTicketsPerUser: number;
  /** Tickets from `paid` orders. Only populated on owner-facing listings (e.g. the admin dashboard). */
  ticketsSold?: number;
  /** Gross revenue (pre-discount) from `paid` orders. Only populated on owner-facing listings. */
  revenue?: number;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface OrderItem {
  id: Uuid;
  ticketTypeId: Uuid;
  /** Only present on the buyer's transaction history (`GET /api/orders/mine`). */
  ticketTypeName?: string;
  quantity: number;
  unitPrice: RupiahAmount;
  subtotal: RupiahAmount;
}

/**
 * `items`/`tickets` are only present on SOME endpoints — see the endpoint
 * table in BACKEND.md. Never assume either key exists; check with `?.`.
 */
export interface Order {
  id: Uuid;
  eventId: Uuid;
  /** Only present on the buyer's transaction history (`GET /api/orders/mine`). */
  eventName?: string;
  eventSlug?: string;
  userId: Uuid | null;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  guestEmailVerifiedAt: IsoDateTimeString | null;
  promoCodeId: Uuid | null;
  /** Event-owner listing only — live (non-void) tickets this order holds. */
  ticketsTotal?: number;
  /** Event-owner listing only — how many of those were scanned at the gate. */
  ticketsUsed?: number;
  subtotalAmount: RupiahAmount;
  discountAmount: RupiahAmount;
  totalAmount: RupiahAmount;
  status: OrderStatus;
  paymentExpiresAt: IsoDateTimeString;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  items?: OrderItem[];
  tickets?: Ticket[];
}

export interface Ticket {
  id: Uuid;
  /** Not a UUID — a compact base64url string, e.g. `"O5vZ3q8pXW2yj1Ht"`. */
  ticketCode: string;
  /** HMAC-signed payload to render into the QR image — never decode/trust it client-side. */
  qrPayload: string;
  status: TicketStatus;
  checkedInAt: IsoDateTimeString | null;
  orderId: Uuid;
  eventId: Uuid;
  ticketTypeId: Uuid;
  ticketTypeName: string;
  /** Event + organizer context — "My tickets" groups and labels QRs by these. */
  eventName: string;
  eventSlug: string;
  eventStartDate: IsoDateTimeString;
  eventEndDate: IsoDateTimeString;
  eventVenueName: string | null;
  eventCity: string | null;
  /** The organizer's (event owner's) display name; null if the account was deleted. */
  organizerName: string | null;
  buyerName: string;
  buyerEmail: string;
  createdAt: IsoDateTimeString;
}

// ============================================================================
// Raw (non-presented) entities — snake_case, MysqlRawBoolean
// ============================================================================

export interface RawBankAccount {
  id: Uuid;
  owner_id: Uuid;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  is_default: MysqlRawBoolean;
  show_on_ticket_checkout: MysqlRawBoolean;
  show_on_merch_checkout: MysqlRawBoolean;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

export interface RawAdminApplication {
  id: Uuid;
  user_id: Uuid;
  business_name: string;
  business_description: string | null;
  contact_phone: string;
  status: AdminApplicationStatus;
  reviewed_by: Uuid | null;
  reviewed_at: IsoDateTimeString | null;
  review_notes: string | null;
  created_at: IsoDateTimeString;
}

export interface RawEventImage {
  id: Uuid;
  event_id: Uuid;
  image_url: string;
  is_poster: MysqlRawBoolean;
  width: number;
  height: number;
  sort_order: number;
  created_at: IsoDateTimeString;
}

export type EventStaffStatus = "pending" | "accepted" | "declined";

export interface RawEventStaff {
  id: Uuid;
  event_id: Uuid;
  user_id: Uuid;
  role: EventStaffRole;
  status: EventStaffStatus;
  invited_by: Uuid;
  created_at: IsoDateTimeString;
}

/** `GET /events/:eventId/staff` only — joins in the invited user's name/email. */
export interface RawEventStaffWithUser extends RawEventStaff {
  user_name: string;
  user_email: string;
}

/** `GET /staff-invitations` — the caller's own invitations, with event + inviter context. */
export interface RawStaffInvitation extends RawEventStaff {
  event_name: string;
  event_slug: string;
  event_start_date: IsoDateTimeString;
  event_venue_name: string | null;
  event_city: string | null;
  inviter_name: string | null;
}

export interface RawTicketType {
  id: Uuid;
  event_id: Uuid;
  category_id: Uuid;
  name: string;
  price: RupiahAmount;
  quantity_total: number;
  quantity_sold: number;
  sale_start_at: IsoDateTimeString | null;
  sale_end_at: IsoDateTimeString | null;
  is_active: MysqlRawBoolean;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

export interface RawPromoCode {
  id: Uuid;
  event_id: Uuid;
  code: string;
  discount_type: DiscountType;
  /** `DECIMAL(12,2)` — arrives as a STRING, e.g. `"10.00"`. */
  discount_value: string;
  max_uses: number;
  used_count: number;
  valid_from: IsoDateTimeString | null;
  valid_until: IsoDateTimeString | null;
  is_active: MysqlRawBoolean;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

export interface RawOrderPayment {
  id: Uuid;
  order_id: Uuid;
  /** `null` for QRIS payments — there is no payout bank account involved. */
  bank_account_id: Uuid | null;
  method: PaymentMethod;
  amount: RupiahAmount;
  proof_image_url: string;
  transfer_note: string | null;
  status: OrderPaymentStatus;
  reviewed_by: Uuid | null;
  reviewed_at: IsoDateTimeString | null;
  reviewer_notes: string | null;
  submitted_at: IsoDateTimeString;
}

export interface RawRefundRequest {
  id: Uuid;
  order_id: Uuid;
  requested_by: Uuid | null;
  reason: string;
  status: RefundStatus;
  processed_by: Uuid | null;
  processed_at: IsoDateTimeString | null;
  notes: string | null;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

/** `GET /refund-requests/mine` only — joins in order context. */
export interface RawRefundRequestWithOrderContext extends RawRefundRequest {
  event_id: Uuid;
  total_amount: RupiahAmount;
}

/** The organizer's static QRIS code — one per owner, `GET/PUT/PATCH/DELETE /qris-config`. */
export interface RawQrisConfig {
  id: Uuid;
  owner_id: Uuid;
  merchant_name: string;
  qris_image_url: string;
  show_on_ticket_checkout: MysqlRawBoolean;
  show_on_merch_checkout: MysqlRawBoolean;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

/**
 * The organizer's outbound email identity — one per owner. Gmail rows are
 * OAuth-connected ("Connect Gmail", `google_connected: 1`, no SMTP fields);
 * custom rows carry a full SMTP config. Stored credentials never leave the
 * backend — rows arrive with password/refresh-token already stripped.
 */
export interface RawOrganizerEmailConfig {
  id: Uuid;
  owner_id: Uuid;
  provider: EmailProvider;
  /** `null` on OAuth-connected Gmail rows. */
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: MysqlRawBoolean;
  from_email: string;
  from_name: string | null;
  /** 1 when the row sends through a connected Google account (Gmail API). */
  google_connected: MysqlRawBoolean;
  verified_at: IsoDateTimeString | null;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

export interface RawTaxonomy {
  id: Uuid;
  name: string;
  slug: string;
  is_active: MysqlRawBoolean;
  sort_order: number;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

/** `GET /merch-categories?withCounts=true` (super_admin) adds `product_count`. */
export interface RawMerchCategory extends RawTaxonomy {
  /** Aggregate — may arrive as a string from MySQL; normalize with `Number()`. */
  product_count?: number | string;
}

/**
 * One catalog row from `GET /api/merch` / `GET /api/products/mine` — a raw
 * `products` row plus the correlated columns the repository selects
 * (thumbnail, effective price, remaining stock, …). MySQL aggregates can
 * arrive as strings; normalize.ts converts them.
 */
export interface RawProduct {
  id: Uuid;
  owner_id: Uuid;
  category_id: Uuid;
  name: string;
  slug: string;
  description: string;
  /** Base price — ignored for selling once the product has variants. */
  price: RupiahAmount;
  stock: number;
  /** Package weight in grams — shipping quotes bill per started kg. */
  weight_grams: number;
  quantity_sold: number;
  is_active: MysqlRawBoolean;
  deleted_at: IsoDateTimeString | null;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
  category_name: string | null;
  category_slug: string | null;
  /** The seller's public name (joined from `users`); null only if the account was deleted. */
  seller_name: string | null;
  /** First gallery image (`/uploads/...`), or null while the product has no photos. */
  thumbnail_url: string | null;
  /** Cheapest active-variant price when variants exist, else the base price. */
  effective_price: number | string;
  max_variant_price: number | string | null;
  stock_remaining: number | string | null;
  has_variants: number;
  /** Owner listing only — units/revenue from paid merch orders. */
  units_sold?: number | string;
  revenue?: number | string;
}

export interface RawProductImage {
  id: Uuid;
  product_id: Uuid;
  image_url: string;
  sort_order: number;
  created_at: IsoDateTimeString;
}

export interface RawProductOption {
  id: Uuid;
  group_id: Uuid;
  value: string;
  position: number;
  created_at: IsoDateTimeString;
}

export interface RawProductOptionGroup {
  id: Uuid;
  product_id: Uuid;
  name: string;
  position: number;
  created_at: IsoDateTimeString;
  options: RawProductOption[];
}

export interface RawProductVariant {
  id: Uuid;
  product_id: Uuid;
  /** Human-readable combination, e.g. `"Red / M"`. */
  label: string;
  price: RupiahAmount;
  stock: number;
  quantity_sold: number;
  is_active: MysqlRawBoolean;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
  /** The `product_options` ids this combination is made of — one per group. */
  option_ids: Uuid[];
}

/** `GET /api/merch/:slug` (public) and `GET /api/products/:id` (owner). */
export interface RawProductDetail extends RawProduct {
  images: RawProductImage[];
  groups: RawProductOptionGroup[];
  variants: RawProductVariant[];
}

export interface RawMerchOrderItem {
  id: Uuid;
  merch_order_id: Uuid;
  product_id: Uuid;
  /** Null for base-stock items, or after the seller replaced the variant config. */
  variant_id: Uuid | null;
  /** Snapshots taken at checkout — stable even if the product is renamed/deleted. */
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price: RupiahAmount;
  subtotal: RupiahAmount;
  created_at: IsoDateTimeString;
}

export interface RawMerchOrder {
  id: Uuid;
  seller_id: Uuid;
  /** Never null — merch checkout requires a signed-in buyer. */
  user_id: Uuid;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  shipping_address: string;
  shipping_city: string | null;
  shipping_province: string | null;
  shipping_postal_code: string | null;
  shipping_district: string | null;
  shipping_village: string | null;
  shipping_village_code: string | null;
  /** The seller departure village the quote was priced from. */
  origin_village_code: string | null;
  /** Courier snapshot — null on orders created before courier shipping existed. */
  courier_code: string | null;
  courier_name: string | null;
  shipping_estimation: string | null;
  shipping_cost: RupiahAmount;
  shipping_weight_grams: number | null;
  buyer_note: string | null;
  /** Seller-scoped promo code applied at checkout — null when none was used. */
  promo_code_id: Uuid | null;
  subtotal_amount: RupiahAmount;
  discount_amount: RupiahAmount;
  total_amount: RupiahAmount;
  status: MerchOrderStatus;
  payment_expires_at: IsoDateTimeString;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
  /** Present on create/detail/mine/selling responses. */
  items?: RawMerchOrderItem[];
}

export interface RawMerchOrderPayment {
  id: Uuid;
  merch_order_id: Uuid;
  /** `null` for QRIS payments. */
  bank_account_id: Uuid | null;
  method: PaymentMethod;
  amount: RupiahAmount;
  proof_image_url: string;
  transfer_note: string | null;
  status: OrderPaymentStatus;
  reviewed_by: Uuid | null;
  reviewed_at: IsoDateTimeString | null;
  reviewer_notes: string | null;
  submitted_at: IsoDateTimeString;
}

/** A seller-scoped merch promo code (`GET /api/merch-promo-codes`). */
export interface RawMerchPromoCode {
  id: Uuid;
  seller_id: Uuid;
  code: string;
  discount_type: DiscountType;
  /** `DECIMAL(12,2)` — arrives as a STRING, e.g. `"10.00"`. */
  discount_value: string;
  max_uses: number;
  used_count: number;
  valid_from: IsoDateTimeString | null;
  valid_until: IsoDateTimeString | null;
  is_active: MysqlRawBoolean;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

/** Buyer-facing checkout preview of a code (`POST /api/merch-promo-codes/validate`). */
export interface RawMerchPromoValidation {
  code: string;
  discount_type: DiscountType;
  /** `DECIMAL(12,2)` — arrives as a STRING. */
  discount_value: string;
}

/** One header-bell notification row (`GET /api/notifications`). */
export interface RawNotification {
  id: Uuid;
  user_id: Uuid;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: IsoDateTimeString | null;
  created_at: IsoDateTimeString;
}

// ============================================================================
// Normalized (client-side) entities — see lib/api/normalize.ts
// ============================================================================

export interface BankAccount {
  id: Uuid;
  ownerId: Uuid;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  isDefault: boolean;
  /** Shown to ticket buyers at checkout — even an event's pinned override is skipped when off. */
  showOnTicketCheckout: boolean;
  /** Shown to merch buyers at checkout. Both flags off = hidden from buyers everywhere. */
  showOnMerchCheckout: boolean;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface AdminApplication {
  id: Uuid;
  userId: Uuid;
  businessName: string;
  businessDescription: string | null;
  contactPhone: string;
  status: AdminApplicationStatus;
  reviewedBy: Uuid | null;
  reviewedAt: IsoDateTimeString | null;
  reviewNotes: string | null;
  createdAt: IsoDateTimeString;
}

export interface EventImage {
  id: Uuid;
  eventId: Uuid;
  imageUrl: string;
  isPoster: boolean;
  width: number;
  height: number;
  sortOrder: number;
  createdAt: IsoDateTimeString;
}

export interface EventStaff {
  id: Uuid;
  eventId: Uuid;
  userId: Uuid;
  role: EventStaffRole;
  status: EventStaffStatus;
  invitedBy: Uuid;
  createdAt: IsoDateTimeString;
  /** Only present from the list endpoint (joins the invited user). */
  userName?: string;
  userEmail?: string;
}

/** One recorded door (on-the-spot) sale tally entry — counts only, no buyer data. */
export interface OnsiteSale {
  id: Uuid;
  eventId: Uuid;
  ticketTypeId: Uuid;
  ticketTypeName: string | null;
  quantity: number;
  unitPrice: RupiahAmount;
  note: string | null;
  recordedBy: Uuid | null;
  recordedByName: string | null;
  createdAt: IsoDateTimeString;
}

/** One of the signed-in user's own gate-staff invitations, with event context. */
export interface StaffInvitation extends Omit<EventStaff, "userName" | "userEmail"> {
  eventName: string;
  eventSlug: string;
  eventStartDate: IsoDateTimeString;
  eventVenueName: string | null;
  eventCity: string | null;
  inviterName: string | null;
}

export interface TicketType {
  id: Uuid;
  eventId: Uuid;
  categoryId: Uuid;
  name: string;
  price: RupiahAmount;
  quantityTotal: number;
  quantitySold: number;
  saleStartAt: IsoDateTimeString | null;
  saleEndAt: IsoDateTimeString | null;
  isActive: boolean;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface PromoCode {
  id: Uuid;
  eventId: Uuid;
  code: string;
  discountType: DiscountType;
  /** Parsed to a number client-side — see normalize.ts. */
  discountValue: number;
  maxUses: number;
  usedCount: number;
  validFrom: IsoDateTimeString | null;
  validUntil: IsoDateTimeString | null;
  isActive: boolean;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface OrderPayment {
  id: Uuid;
  orderId: Uuid;
  /** `null` for QRIS payments. */
  bankAccountId: Uuid | null;
  method: PaymentMethod;
  amount: RupiahAmount;
  proofImageUrl: string;
  transferNote: string | null;
  status: OrderPaymentStatus;
  reviewedBy: Uuid | null;
  reviewedAt: IsoDateTimeString | null;
  reviewerNotes: string | null;
  submittedAt: IsoDateTimeString;
}

export interface RefundRequest {
  id: Uuid;
  orderId: Uuid;
  requestedBy: Uuid | null;
  reason: string;
  status: RefundStatus;
  processedBy: Uuid | null;
  processedAt: IsoDateTimeString | null;
  notes: string | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  /** Only present from `GET /refund-requests/mine`. */
  eventId?: Uuid;
  totalAmount?: RupiahAmount;
}

export interface QrisConfig {
  id: Uuid;
  ownerId: Uuid;
  merchantName: string;
  qrisImageUrl: string;
  /** Offered to ticket buyers (on top of each event's own `qrisEnabled` opt-in). */
  showOnTicketCheckout: boolean;
  /** Offered to merch buyers. Both flags off = QRIS hidden everywhere without deleting it. */
  showOnMerchCheckout: boolean;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface OrganizerEmailConfig {
  id: Uuid;
  ownerId: Uuid;
  provider: EmailProvider;
  /** `null` on OAuth-connected Gmail rows. */
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string | null;
  /** True when the row sends through a connected Google account (Gmail API). */
  googleConnected: boolean;
  verifiedAt: IsoDateTimeString | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface TaxonomyItem {
  id: Uuid;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface MerchCategory extends TaxonomyItem {
  /** Only present from `GET /merch-categories?withCounts=true` (super_admin). */
  productCount?: number;
}

export interface Product {
  id: Uuid;
  ownerId: Uuid;
  categoryId: Uuid;
  categoryName: string | null;
  categorySlug: string | null;
  /** The seller's public name — shown on catalog cards and the detail page. */
  sellerName: string | null;
  name: string;
  slug: string;
  description: string;
  /** Base price — display `effectivePrice` (and the range up to `maxVariantPrice`) instead. */
  price: RupiahAmount;
  stock: number;
  /** Package weight in grams — shipping quotes bill per started kg. */
  weightGrams: number;
  quantitySold: number;
  isActive: boolean;
  thumbnailUrl: string | null;
  effectivePrice: RupiahAmount;
  maxVariantPrice: RupiahAmount | null;
  stockRemaining: number;
  hasVariants: boolean;
  /** Owner listing only. */
  unitsSold?: number;
  revenue?: number;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface ProductImage {
  id: Uuid;
  productId: Uuid;
  imageUrl: string;
  sortOrder: number;
  createdAt: IsoDateTimeString;
}

export interface ProductOption {
  id: Uuid;
  groupId: Uuid;
  value: string;
  position: number;
}

export interface ProductOptionGroup {
  id: Uuid;
  productId: Uuid;
  name: string;
  position: number;
  options: ProductOption[];
}

export interface ProductVariant {
  id: Uuid;
  productId: Uuid;
  label: string;
  price: RupiahAmount;
  stock: number;
  quantitySold: number;
  isActive: boolean;
  /** One `ProductOption` id per group — match against the buyer's selection. */
  optionIds: Uuid[];
}

export interface ProductDetail extends Product {
  images: ProductImage[];
  groups: ProductOptionGroup[];
  variants: ProductVariant[];
}

export interface MerchOrderItem {
  id: Uuid;
  merchOrderId: Uuid;
  productId: Uuid;
  variantId: Uuid | null;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: RupiahAmount;
  subtotal: RupiahAmount;
}

export interface MerchOrder {
  id: Uuid;
  sellerId: Uuid;
  userId: Uuid;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: string;
  shippingCity: string | null;
  shippingProvince: string | null;
  shippingPostalCode: string | null;
  shippingDistrict: string | null;
  shippingVillage: string | null;
  shippingVillageCode: string | null;
  originVillageCode: string | null;
  /** Courier snapshot — null on orders created before courier shipping existed. */
  courierCode: string | null;
  courierName: string | null;
  shippingEstimation: string | null;
  shippingCost: RupiahAmount;
  shippingWeightGrams: number | null;
  buyerNote: string | null;
  /** Seller-scoped promo code applied at checkout — null when none was used. */
  promoCodeId: Uuid | null;
  subtotalAmount: RupiahAmount;
  discountAmount: RupiahAmount;
  totalAmount: RupiahAmount;
  status: MerchOrderStatus;
  paymentExpiresAt: IsoDateTimeString;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  items?: MerchOrderItem[];
}

export interface MerchOrderPayment {
  id: Uuid;
  merchOrderId: Uuid;
  bankAccountId: Uuid | null;
  method: PaymentMethod;
  amount: RupiahAmount;
  proofImageUrl: string;
  transferNote: string | null;
  status: OrderPaymentStatus;
  reviewedBy: Uuid | null;
  reviewedAt: IsoDateTimeString | null;
  reviewerNotes: string | null;
  submittedAt: IsoDateTimeString;
}

export interface MerchPromoCode {
  id: Uuid;
  sellerId: Uuid;
  code: string;
  discountType: DiscountType;
  /** Parsed to a number client-side — see normalize.ts. */
  discountValue: number;
  maxUses: number;
  usedCount: number;
  validFrom: IsoDateTimeString | null;
  validUntil: IsoDateTimeString | null;
  isActive: boolean;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

/** Buyer-facing checkout preview of a code — enough to price the discount in the UI. */
export interface MerchPromoValidation {
  code: string;
  discountType: DiscountType;
  discountValue: number;
}

export interface AppNotification {
  id: Uuid;
  userId: Uuid;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: IsoDateTimeString | null;
  createdAt: IsoDateTimeString;
}

/** One payout account a buyer may transfer to, as surfaced by the payment instructions endpoint. */
export interface PaymentInstructionsBankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  /** True for the organizer's default (or event-overridden) account. */
  isRecommended: boolean;
}

/** The organizer's QRIS code as surfaced to a buyer by the payment instructions endpoint. */
export interface PaymentInstructionsQris {
  merchantName: string;
  /** Backend-relative path (`/uploads/...`) — resolve with `toAssetUrl` before rendering. */
  qrisImageUrl: string;
}

/** `GET /orders/:orderId/payments/instructions` — every way a buyer can pay + how much. */
export interface PaymentInstructions {
  /** May be empty when the organizer only accepts QRIS. */
  bankAccounts: PaymentInstructionsBankAccount[];
  /** `null` unless the event enabled QRIS and the organizer has a QRIS code. */
  qris: PaymentInstructionsQris | null;
  amount: RupiahAmount;
}

// ============================================================================
// Generic envelopes
// ============================================================================

export interface ApiPageMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/** One Zod issue as returned by the backend's `validate` middleware in `error.details`. */
export interface ValidationIssue {
  path: (string | number)[];
  message: string;
}

// ============================================================================
// Request DTOs (already camelCase on the wire)
// ============================================================================

export interface GoogleLoginRequest {
  idToken: string;
}

export interface ListUsersQuery {
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}

export interface ApplyAdminRequest {
  businessName: string;
  businessDescription?: string;
  contactPhone: string;
}

export interface DecideRequest {
  reviewNotes?: string;
}

export interface CreateTaxonomyRequest {
  name: string;
  slug: string;
  sortOrder?: number;
}

export interface UpdateTaxonomyRequest {
  name?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateBankAccountRequest {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  isDefault?: boolean;
  showOnTicketCheckout?: boolean;
  showOnMerchCheckout?: boolean;
}

export type UpdateBankAccountRequest = Partial<CreateBankAccountRequest>;

/** `PATCH /qris-config` — where the owner's QRIS code is shown to buyers. */
export interface UpdateQrisConfigRequest {
  showOnTicketCheckout?: boolean;
  showOnMerchCheckout?: boolean;
}

export interface CreateEventRequest {
  name: string;
  description: string;
  categoryId: Uuid;
  startDate: string;
  endDate: string;
  venueName?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  meetingUrl?: string;
  meetingPlatform?: MeetingPlatform;
  contactPersonName: string;
  contactPersonEmail: string;
  contactPersonPhone: string;
  bankAccountId?: Uuid;
  /** Requires the owner to have a QrisConfig — the backend rejects it otherwise (`QRIS_CONFIG_MISSING`). */
  qrisEnabled?: boolean;
  maxTicketsPerUser?: number;
}

export type UpdateEventRequest = Partial<CreateEventRequest>;

/**
 * `PUT /email-config` — custom SMTP only; Gmail connects via OAuth through
 * `/api/auth/google-mail/start` instead. The backend live-verifies the
 * credentials before saving (`EMAIL_CONFIG_VERIFICATION_FAILED` on failure).
 */
export interface SaveEmailConfigRequest {
  provider: "custom";
  email: string;
  password: string;
  fromName?: string;
  host: string;
  port: number;
  secure?: boolean;
}

export interface ListEventsQuery {
  /** An `event_categories.slug`, not an id. */
  category?: string;
  city?: string;
  search?: string;
  status?: EventStatus;
  page?: number;
  pageSize?: number;
}

/** `GET /api/events/:eventId/orders` — server-side search/filter/sort/pagination for the admin orders table. */
export interface ListEventOrdersQuery {
  /** Matches buyer name or email. */
  search?: string;
  status?: OrderStatus;
  sortBy?: "createdAt" | "buyerName";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface InviteEventStaffRequest {
  email: string;
}

export interface CreateTicketTypeRequest {
  categoryId: Uuid;
  name: string;
  price: number;
  quantityTotal: number;
  saleStartAt?: string;
  saleEndAt?: string;
}

export type UpdateTicketTypeRequest = Partial<
  Omit<CreateTicketTypeRequest, "saleStartAt" | "saleEndAt"> & {
    /** `null` clears the bound; `undefined`/absent leaves it unchanged. */
    saleStartAt: string | null;
    saleEndAt: string | null;
    isActive: boolean;
  }
>;

export interface CreatePromoCodeRequest {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number;
  validFrom?: string;
  validUntil?: string;
}

export type UpdatePromoCodeRequest = Partial<Omit<CreatePromoCodeRequest, "code"> & { isActive: boolean }>;

export interface CreateOrderItemRequest {
  ticketTypeId: Uuid;
  quantity: number;
}

export interface CreateOrderRequest {
  eventId: Uuid;
  items: CreateOrderItemRequest[];
  promoCode?: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
}

export interface RequestRefundRequest {
  reason: string;
  guestEmail?: string;
}

export interface ScanTicketRequest {
  qrPayload: string;
  deviceLabel?: string;
}

// ---- Merch ----

export interface CreateProductRequest {
  categoryId: Uuid;
  name: string;
  description: string;
  price: number;
  stock: number;
  /** Package weight in grams (defaults server-side to 1000g = the couriers' 1kg minimum). */
  weightGrams?: number;
}

export type UpdateProductRequest = Partial<CreateProductRequest>;

/**
 * `PUT /api/products/:id/variants` — the whole option/variant matrix,
 * replaced atomically. `variants[].options[i]` is the chosen value from
 * `groups[i]`. Empty arrays remove variants entirely (base price/stock applies).
 */
export interface ReplaceVariantsRequest {
  groups: { name: string; options: string[] }[];
  variants: { options: string[]; price: number; stock: number; isActive?: boolean }[];
}

/** `GET /api/merch` — public storefront search/filter/pagination. */
export interface ListMerchCatalogQuery {
  search?: string;
  /** A `merch_categories.slug`, not an id. */
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: MerchCatalogSort;
  page?: number;
  pageSize?: number;
}

export interface CreateMerchOrderItemRequest {
  productId: Uuid;
  /** Required when the product has variants. */
  variantId?: Uuid;
  quantity: number;
}

/**
 * `POST /api/merch-orders` — may span multiple sellers; the backend splits it
 * into one order per seller and returns them all.
 */
export interface CreateMerchOrderRequest {
  items: CreateMerchOrderItemRequest[];
  /**
   * One courier choice per seller in the cart. Only the courier CODE is sent —
   * the backend re-prices it from the seller's departure address and the
   * cart's weight, never trusting a client-side price.
   */
  shipping: { sellerId: Uuid; courierCode: string }[];
  /**
   * Optional promo code per seller in the cart (codes are seller-scoped). Only
   * the code is sent — the backend re-validates and re-prices the discount.
   */
  promoCodes?: { sellerId: Uuid; code: string }[];
  buyerNote?: string;
}

/** `POST /api/merch-promo-codes/validate` — buyer-facing checkout preview. */
export interface ValidateMerchPromoCodeRequest {
  sellerId: Uuid;
  code: string;
}

export interface CreateMerchPromoCodeRequest {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number;
  validFrom?: string;
  validUntil?: string;
}

export type UpdateMerchPromoCodeRequest = Partial<Omit<CreateMerchPromoCodeRequest, "code"> & { isActive: boolean }>;

/** `GET /api/merch-orders/selling` — the seller table's server-side search/filter/sort/pagination. */
export interface ListSellingMerchOrdersQuery {
  /** Matches buyer name or email. */
  search?: string;
  status?: MerchOrderStatus;
  sortBy?: "createdAt" | "buyerName";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/**
 * `PATCH /api/auth/me` — self-service contact + delivery address. The region
 * is submitted as a 10-digit village code; the backend resolves the full
 * hierarchy (province/city/district/village names + codes) from it, so region
 * names are never free-typed.
 */
export interface UpdateProfileRequest {
  phone?: string;
  address?: string;
  villageCode?: string;
  /** Must be one of the chosen village's own postal codes; defaults to its first. */
  postalCode?: string;
}

// ---- Shipping & Indonesian regions (api.co.id, proxied + DB-cached by the backend) ----

/**
 * Region rows come back exactly as api.co.id ships them (snake_case). They are
 * transient picker data — never stored client-side — so there is no
 * `normalize.ts` mapping for them.
 */
export interface RegionProvince {
  /** 2-digit province code, e.g. `"31"`. */
  code: string;
  name: string;
}

export interface RegionRegency {
  /** 4-digit regency/city code, e.g. `"3172"`. */
  code: string;
  name: string;
  province_code: string;
  province: string;
}

export interface RegionDistrict {
  /** 6-digit district (kecamatan) code, e.g. `"317205"`. */
  code: string;
  name: string;
  regency_code: string;
  regency: string;
  province_code: string;
  province: string;
}

export interface RegionVillage {
  /** 10-digit village code — what shipping quotes key on. */
  code: string;
  name: string;
  district_code: string;
  district: string;
  regency_code: string;
  regency: string;
  province_code: string;
  province: string;
  postal_codes?: string[];
  /** False when no courier serves this village yet (vendor flag). */
  is_courier_support?: boolean;
}

/** One courier option inside a shipping quote (already normalized camelCase). */
export interface CourierOption {
  courierCode: string;
  courierName: string;
  price: RupiahAmount;
  /** e.g. `"2 - 3 days"`; null when the courier reports none. */
  estimation: string | null;
}

/** Raw courier entry as the backend relays it from api.co.id. */
export interface RawCourierOption {
  courier_code: string;
  courier_name: string;
  price: RupiahAmount;
  weight: number;
  estimation: string | null;
}

/** `POST /api/shipping/quotes` — one entry per seller group in the cart. */
export interface RawShippingQuote {
  sellerId: Uuid;
  weightGrams: number;
  weightKg: number;
  couriers: RawCourierOption[];
}

export interface ShippingQuote {
  sellerId: Uuid;
  weightGrams: number;
  weightKg: number;
  couriers: CourierOption[];
}

/** One entry of the courier catalog (`GET /api/shipping/couriers`). */
export interface ShippingCourier {
  code: string;
  name: string;
}

/** `GET/PUT /api/shipping-origin` — raw `seller_shipping_origins` row. */
export interface RawSellerShippingOrigin {
  id: Uuid;
  owner_id: Uuid;
  address: string;
  province: string;
  city: string;
  district: string;
  village: string;
  province_code: string;
  city_code: string;
  district_code: string;
  village_code: string;
  postal_code: string | null;
  /** Courier whitelist — null means the seller offers every courier. */
  enabled_couriers: string[] | null;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
}

/** The seller's shipping departure address — mandatory before selling merch. */
export interface SellerShippingOrigin {
  id: Uuid;
  ownerId: Uuid;
  address: string;
  province: string;
  city: string;
  district: string;
  village: string;
  provinceCode: string;
  cityCode: string;
  districtCode: string;
  villageCode: string;
  postalCode: string | null;
  /** Courier whitelist — null means the seller offers every courier. */
  enabledCouriers: string[] | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

/** `PUT /api/shipping-origin` — the village choice + street detail; hierarchy resolved server-side. */
export interface SaveShippingOriginRequest {
  villageCode: string;
  address: string;
  postalCode?: string;
  /** Courier whitelist (min 1 code); omit or null to offer every courier. */
  enabledCouriers?: string[] | null;
}

export interface ScanTicketResult {
  result: CheckInResult;
  ticket: Ticket | null;
}

// ---- Event attendance report (organizer dashboard) ----
// The backend shapes this one camelCase already (see
// backend/src/services/event-attendance-service.js), so there is no `Raw…`
// counterpart and nothing in normalize.ts to map.

/** One 15-minute slice of the gate's arrival curve. */
export interface AttendanceArrivalBucket {
  /** Start of the bucket, UTC. Format it in `Asia/Jakarta` for display. */
  startsAt: IsoDateTimeString;
  /** Scans that landed inside this bucket. */
  arrivals: number;
  /** Running total of scans up to and including this bucket. */
  cumulative: number;
}

/** Sold-vs-scanned split for a single ticket tier. */
export interface AttendanceByTicketType {
  ticketTypeId: Uuid;
  name: string;
  price: RupiahAmount;
  /** Live tickets (issued + used). Refund-voided tickets are excluded. */
  sold: number;
  checkedIn: number;
}

/** Scans credited to one gate-staff account. */
export interface AttendanceByScanner {
  userId: Uuid | null;
  name: string;
  email: string | null;
  scans: number;
}

export interface EventAttendanceReport {
  eventId: Uuid;
  eventName: string;
  eventStartDate: IsoDateTimeString;
  /** Live tickets sold — `issued` + `used`, excluding refund-voided ones. */
  ticketsSold: number;
  checkedIn: number;
  notArrived: number;
  /** Tickets voided by a refund; counted as neither sold nor absent. */
  voided: number;
  /** `checkedIn / ticketsSold`, as a 0–1 fraction. `0` when nothing sold. */
  attendanceRate: number;
  /** Owner/super_admin only — `null` when viewed by gate staff. */
  revenue: RupiahAmount | null;
  /** Door (on-the-spot) tally — these buyers get no QR, so they never appear in `checkedIn`. */
  onsiteSold: number;
  /** Owner/super_admin only — `null` when viewed by gate staff. */
  onsiteRevenue: RupiahAmount | null;
  byTicketType: AttendanceByTicketType[];
  arrivals: AttendanceArrivalBucket[];
  bucketMinutes: number;
  firstCheckInAt: IsoDateTimeString | null;
  lastCheckInAt: IsoDateTimeString | null;
  peakBucket: { startsAt: IsoDateTimeString; arrivals: number } | null;
  byScanner: AttendanceByScanner[];
}
