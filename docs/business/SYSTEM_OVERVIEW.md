# SiTIKET — Business & Product Overview

> AI/human entry point for the business domain. Read this first, then [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) for schema, [PAYMENT_VERIFICATION.md](./PAYMENT_VERIFICATION.md) for the v1 payment flow, and [CHECKIN_GATE_SYSTEM.md](./CHECKIN_GATE_SYSTEM.md) for gate scanning.

## 1. What SiTIKET is

SiTIKET is an event discovery and ticket-purchasing platform for the Indonesian market: event organizers list events and sell tickets; the public discovers events and buys tickets with or without an account; a platform-level Super Admin governs the organizers and the shared taxonomy.

## 2. Roles

| Role | Who | Core capability |
| --- | --- | --- |
| **Super Admin** | Platform operator | Approves/rejects Admin applications, manages all Admins and buyers, manages global `event_categories`/`ticket_categories`, full visibility across every event and order. |
| **Admin (event owner)** | Event organizer, approved by Super Admin | Creates and manages their own events, ticket types, pricing, stock, promo codes, bank accounts, and reviews/verifies payments and check-ins for their own events only. |
| **User (buyer)** | Anyone, logged in or guest | Discovers events, buys tickets (account optional), views purchase history and tickets when logged in. |

A single Google account can hold exactly one `role` at a time (`user`, `admin`, `super_admin`) but nothing stops an `admin` from also buying tickets to someone else's event — buying doesn't require a role check, only an authenticated or guest checkout path.

## 3. Confirmed v1 scope decisions

These were explicitly decided with the product owner during design and materially shape the schema — see the linked schema sections for how each is implemented.

| Decision | Choice | Rationale |
| --- | --- | --- |
| Payment verification | **Manual bank transfer + proof upload**, reviewed by the event owner. No payment gateway in v1. | Fastest to ship without a merchant/PG account; gateway (Midtrans/Xendit) is an explicit future upgrade — see [PAYMENT_VERIFICATION.md](./PAYMENT_VERIFICATION.md) §5. |
| Gate entry validation | **In-app QR check-in.** Staff scan tickets through the platform; a ticket flips to `used` with a timestamp, blocking reuse. | Prevents the same QR being used at multiple entrances or resold after entry; see [CHECKIN_GATE_SYSTEM.md](./CHECKIN_GATE_SYSTEM.md). |
| Admin onboarding | **Requires Super Admin approval** before an account can create events. | Curated marketplace — avoids fraudulent/fake organizers publishing events and collecting payments unsupervised. |
| Refunds | **Manual/offline, status-tracked only.** No automated money movement; a `refund_requests` record tracks the decision and completion state. | v1 has no payment gateway to call a refund API against in the first place; keeps scope small while still giving the Super Admin/owner an auditable trail. |

## 4. Primary user journeys

### 4.1 Discover & buy a ticket (User / guest)

1. Browse `/events`, filter by category and city.
2. Open an event detail page, pick ticket type(s) and quantity (capped at the event's `max_tickets_per_user`), optionally apply a promo code.
3. Checkout: logged-in buyers get name/email/phone prefilled from their account; guests type them manually. Guests must verify their email (OTP) before the order can proceed to payment (see [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) §4.8).
4. See the event owner's bank account, transfer manually, upload proof of transfer.
5. Wait for the event owner to review and approve the proof.
6. On approval, receive one QR-coded ticket per unit purchased (5 tickets bought → 5 QR codes), viewable in "My tickets" if logged in, or via the emailed confirmation for guests.

### 4.2 Create & run an event (Admin)

1. Apply to become an Admin; wait for Super Admin approval.
2. Create an event (name, description, category, dates, location or meeting link, contact person).
3. Add one or more ticket types (category, price, stock, sale window), a poster + gallery images, and optionally promo codes.
4. Toggle the event visible/published when ready to sell.
5. Review incoming orders; approve or reject payment proofs.
6. On event day, staff (the owner or delegated `event_staff`) scan buyer QR codes at the gate through the platform.
7. Handle cancellations/refund requests manually; mark `refund_requests` as processed once money is actually returned.

### 4.3 Govern the platform (Super Admin)

1. Review and approve/reject pending Admin applications.
2. Manage the global `event_categories` and `ticket_categories` lists.
3. Oversee all events, orders, and buyers across the platform (support/escalation visibility).
4. Suspend abusive Admin or buyer accounts.

## 5. Feature list → status

| Feature | v1 |
| --- | --- |
| Google OAuth sign-in | ✅ |
| Guest checkout with prefilled fields for logged-in users | ✅ |
| Event CRUD with full field set (name, slug, description, category, status, dates, location, meeting link, contact person) | ✅ |
| Ticket stock & pricing per ticket type | ✅ |
| Promo codes (per-event, expiring, usage-capped) | ✅ |
| Multiple bank accounts per Admin, per-event override | ✅ |
| Event visibility toggle (independent of draft/published/cancelled) | ✅ |
| Per-ticket QR generation (one per unit purchased) | ✅ |
| Multi-image upload with one Instagram-ready poster | ✅ |
| Purchase history & "my tickets" for logged-in users | ✅ |
| Manual bank-transfer payment verification | ✅ |
| In-app QR gate check-in with duplicate/fraud detection | ✅ |
| Admin onboarding via Super Admin approval | ✅ |
| Manual, status-tracked refunds | ✅ |
| Automated payment gateway (Midtrans/Xendit) | 🔜 future — see [PAYMENT_VERIFICATION.md](./PAYMENT_VERIFICATION.md) §5 |
| Automated gateway-driven refunds | 🔜 future, depends on the above |
| Ticket transfer/resale between buyers | ❌ not in scope, not modeled |
| Multi-currency / multi-language | ❌ not in scope — IDR and Bahasa/English UI copy only |
| Seat-map/assigned-seating tickets | ❌ not in scope — all tickets are general admission within a `ticket_type` |

## 6. Related documents

- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) — full relational schema, ERD, and business-rule-to-constraint mapping.
- [PAYMENT_VERIFICATION.md](./PAYMENT_VERIFICATION.md) — v1 manual bank-transfer flow, states, and the future payment-gateway migration path.
- [CHECKIN_GATE_SYSTEM.md](./CHECKIN_GATE_SYSTEM.md) — QR ticket lifecycle and gate scanning flow.
