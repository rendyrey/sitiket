import type {
  AdminApplication,
  BankAccount,
  EventImage,
  EventStaff,
  OrderPayment,
  PromoCode,
  RawAdminApplication,
  RawBankAccount,
  RawEventImage,
  RawEventStaff,
  RawEventStaffWithUser,
  RawOrderPayment,
  RawPromoCode,
  RawRefundRequest,
  RawRefundRequestWithOrderContext,
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
  invitedBy: raw.invited_by,
  createdAt: raw.created_at,
  ...("user_name" in raw ? { userName: raw.user_name, userEmail: raw.user_email } : {}),
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

export const toOrderPayment = (raw: RawOrderPayment): OrderPayment => ({
  id: raw.id,
  orderId: raw.order_id,
  bankAccountId: raw.bank_account_id,
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
