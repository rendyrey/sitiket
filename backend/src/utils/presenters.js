/**
 * Shapes a `users` row for an API response, dropping internal fields
 * (`google_sub`) that a client never needs.
 * @param {object} user - a `users` row
 */
export const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  emailVerifiedAt: user.email_verified_at,
  name: user.name,
  phone: user.phone,
  avatarUrl: user.avatar_url,
  role: user.role,
  status: user.status,
  createdAt: user.created_at,
});

/**
 * Shapes an `events` row (as returned by repositories/events-repository.js,
 * which left-joins `event_categories`) for an API response.
 * @param {object} event
 */
export const toPublicEvent = (event) => ({
  id: event.id,
  ownerId: event.owner_id,
  category: { id: event.category_id, name: event.category_name, slug: event.category_slug },
  name: event.name,
  slug: event.slug,
  description: event.description,
  status: event.status,
  isVisible: Boolean(event.is_visible),
  startDate: event.start_date,
  endDate: event.end_date,
  venueName: event.venue_name,
  address: event.address,
  city: event.city,
  province: event.province,
  country: event.country,
  meetingUrl: event.meeting_url,
  meetingPlatform: event.meeting_platform,
  contactPersonName: event.contact_person_name,
  contactPersonEmail: event.contact_person_email,
  contactPersonPhone: event.contact_person_phone,
  bankAccountId: event.bank_account_id,
  maxTicketsPerUser: event.max_tickets_per_user,
  createdAt: event.created_at,
  updatedAt: event.updated_at,
});

/**
 * Shapes an `orders` row — optionally with its `items` (from
 * services/order-service.js `getOrderWithItems`) — for an API response.
 * @param {object} order
 */
export const toPublicOrder = (order) => ({
  id: order.id,
  eventId: order.event_id,
  userId: order.user_id,
  buyerName: order.buyer_name,
  buyerEmail: order.buyer_email,
  buyerPhone: order.buyer_phone,
  guestEmailVerifiedAt: order.guest_email_verified_at,
  promoCodeId: order.promo_code_id,
  subtotalAmount: order.subtotal_amount,
  discountAmount: order.discount_amount,
  totalAmount: order.total_amount,
  status: order.status,
  paymentExpiresAt: order.payment_expires_at,
  createdAt: order.created_at,
  updatedAt: order.updated_at,
  items: order.items?.map((item) => ({
    id: item.id,
    ticketTypeId: item.ticket_type_id,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    subtotal: item.subtotal,
  })),
});

/**
 * Shapes a `tickets` row (as returned by repositories/tickets-repository.js,
 * which joins in order/event context) for an API response. Includes
 * `qrPayload` — the buyer needs it client-side to render the QR image.
 * @param {object} ticket
 */
export const toPublicTicket = (ticket) => ({
  id: ticket.id,
  ticketCode: ticket.ticket_code,
  qrPayload: ticket.qr_payload,
  status: ticket.status,
  checkedInAt: ticket.checked_in_at,
  orderId: ticket.order_id,
  eventId: ticket.event_id,
  ticketTypeId: ticket.ticket_type_id,
  ticketTypeName: ticket.ticket_type_name,
  buyerName: ticket.buyer_name,
  buyerEmail: ticket.buyer_email,
  createdAt: ticket.created_at,
});
