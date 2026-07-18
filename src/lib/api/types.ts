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
export type RefundStatus = "requested" | "approved" | "rejected" | "completed";
export type TicketStatus = "issued" | "used" | "void";
export type CheckInResult = "success" | "duplicate" | "invalid" | "expired";

// ============================================================================
// Presenter-shaped entities — already camelCase, booleans already real
// ============================================================================

export interface User {
  id: Uuid;
  email: string;
  emailVerifiedAt: IsoDateTimeString | null;
  name: string;
  phone: string | null;
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
  maxTicketsPerUser: number;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface OrderItem {
  id: Uuid;
  ticketTypeId: Uuid;
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
  userId: Uuid | null;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  guestEmailVerifiedAt: IsoDateTimeString | null;
  promoCodeId: Uuid | null;
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

export interface RawEventStaff {
  id: Uuid;
  event_id: Uuid;
  user_id: Uuid;
  role: EventStaffRole;
  invited_by: Uuid;
  created_at: IsoDateTimeString;
}

/** `GET /events/:eventId/staff` only — joins in the invited user's name/email. */
export interface RawEventStaffWithUser extends RawEventStaff {
  user_name: string;
  user_email: string;
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
  bank_account_id: Uuid;
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

export interface RawTaxonomy {
  id: Uuid;
  name: string;
  slug: string;
  is_active: MysqlRawBoolean;
  sort_order: number;
  created_at: IsoDateTimeString;
  updated_at: IsoDateTimeString;
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
  invitedBy: Uuid;
  createdAt: IsoDateTimeString;
  /** Only present from the list endpoint (joins the invited user). */
  userName?: string;
  userEmail?: string;
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
  bankAccountId: Uuid;
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

export interface TaxonomyItem {
  id: Uuid;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

/** `GET /orders/:orderId/payments/instructions` — where + how much a buyer should transfer. */
export interface PaymentInstructions {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
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
}

export type UpdateBankAccountRequest = Partial<CreateBankAccountRequest>;

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
  maxTicketsPerUser?: number;
}

export type UpdateEventRequest = Partial<CreateEventRequest>;

export interface ListEventsQuery {
  /** An `event_categories.slug`, not an id. */
  category?: string;
  city?: string;
  search?: string;
  status?: EventStatus;
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

export type UpdateTicketTypeRequest = Partial<CreateTicketTypeRequest & { isActive: boolean }>;

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

export interface ScanTicketResult {
  result: CheckInResult;
  ticket: Ticket | null;
}
