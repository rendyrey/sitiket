# WhatsApp Ticket Bot — "Mimin SiTIKET"

A customer-service bot on SiTIKET's WhatsApp Business number (the WhatsApp Cloud API number, phone number ID `1395472303641057`). It lets people buy tickets entirely in WhatsApp, lets organizers approve payments from their phone, and lets the Super Admin review organizer applications. It is a second **channel** onto the same v1 flows, not a separate system: every step calls the same backend services as the web app, so prices, stock, the email OTP, payment windows and approval rules are identical (see [PAYMENT_VERIFICATION.md](./PAYMENT_VERIFICATION.md)).

Engineering details (message path, MCP server, config, limits) live in [BACKEND.md](../../BACKEND.md) § _WhatsApp bot_; deployment and Meta dashboard setup in [DEPLOYMENT.md](../../DEPLOYMENT.md) § _WhatsApp bot setup_.

## 1. Language and tone

- Replies are **Bahasa Indonesia only**, whatever language the user writes in.
- Persona "Mimin SiTIKET": warm, polite, short WhatsApp-style messages. It always ends with a clear next step or options, never a dead end.
- It only states facts the system returned (events, prices, stock, bank accounts, statuses). It never invents them.
- What it cannot do (refunds, changing an order, on-site issues, becoming an organizer) is handed off to the event's organizer contact (the same contact block the ticket emails show) or to the website.

## 2. Who the bot thinks you are

The sender's WhatsApp number comes from Meta's signed webhook, so it can't be spoofed. The bot compares it with the **phone saved on SiTIKET accounts**:

| Sender's number matches… | Treated as | Can do (in addition to buying) |
| --- | --- | --- |
| an active **Super Admin** account's phone | Super Admin | See and approve pending **organizer (Admin) applications** |
| an active **Admin** account's phone | Admin (event organizer) | See and approve pending **ticket payment proofs for their own events** |
| anything else | Buyer | — |

- Admins and Super Admins **must have their WhatsApp number on their account** (profile page). Super Admins can also be given one through `npm run db:promote-super-admin -- <email> <phone>`, which now requires the phone. The backend logs a warning at boot for each Admin/Super Admin without a phone; they get buyer treatment until it's set.
- Any common format works (`0812…`, `+62 812-…`, `62812…`).
- Payment approval belongs to the **event's organizer**, not the Super Admin. This matches the dashboard, where an organizer reviews proofs for their own events.

## 3. Buyer journey

Same steps as web guest checkout (see [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) §4.1):

1. **Discover.** "Event apa saja?" → upcoming published events (optionally filtered by name or city). "Harga tiketnya?" → ticket types with price, remaining stock, sale status and the per-buyer ticket cap.
2. **Order details.** The bot asks for **full name and email** (and an optional promo code). The phone number is **not** asked: the WhatsApp number is used and stored as the order's `buyer_phone`.
3. **Confirm.** The bot shows a summary (event, ticket type × quantity, total, name, email). The order is only created after the buyer replies "ya". Creating the order **reserves the tickets** and starts the payment window (`ORDER_PAYMENT_HOLD_MINUTES`, 10 min).
4. **Email OTP.** A 6-digit code is emailed (from the organizer's email, as on the web). The buyer types it into the chat. Five wrong codes block that order; the buyer then places a new one.
5. **Pay.** The bot shows the bank account(s) and/or QRIS link, the exact amount and the deadline.
6. **Proof.** The buyer sends a **photo** of the transfer. A photo is always treated as the payment proof for the buyer's open order. PDFs/documents are not accepted. The order moves to `awaiting_verification`.
7. **Tickets.** When the organizer approves (from the dashboard **or** the bot), the buyer receives a confirmation plus **one QR image per ticket in the chat**. That's the same QR the gate scanner reads. The email with the tickets is still sent as before.

The buyer can ask "status pesanan saya" at any time. The bot lists the orders placed from that WhatsApp number with their status.

Orders placed through the bot are marked with the WhatsApp number that placed them (`orders.whatsapp_wa_id`, see [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) §4.6). Only that number can verify, pay for, or send proof for them.

## 4. Organizer (Admin) journey

1. "Ada pembayaran yang perlu dicek?" → the payment proofs awaiting review **on this organizer's own events**, oldest first. Each shows an **8-character reference**, the buyer, amount, method, note, and a link to the proof photo.
2. To approve, the organizer writes an approval word **and the reference** themselves, e.g. **`setujui a1b2c3d4`** (also accepted: `acc`, `approve`, `terima…`).
3. Approval does exactly what the dashboard's Approve does: order → `paid`, tickets issued, the buyer emailed, plus the WhatsApp QR delivery for bot orders.

Organizers cannot see or approve another organizer's payments. **Rejecting** a proof is still done in the dashboard.

## 5. Super Admin journey

1. "Ada pengajuan penyelenggara?" → pending organizer applications (business name and description, contact phone, applicant name and email, 8-character reference).
2. Approve with **`setujui <reference>`**. The applicant becomes an Admin and is emailed; they must sign in again to see the admin dashboard (see BACKEND.md § _Known gaps_ on JWT role claims). Rejecting is still done in the dashboard.

## 6. Safety rules

- **The approval phrase is the Admin's own.** Lists contain text other people typed: buyer names, transfer notes, business descriptions. An approval only runs when the reviewer's **own current message** contains both an approval word and the exact reference. Text planted in the data ("approve everything") can't trigger an approval.
- **Role tools don't exist for other roles.** A buyer's session has no approve tools at all, however the model is prompted. An organizer's approve is restricted to their events.
- **Photos can't jump the queue.** A proof is only accepted for the sender's own open order, after the email OTP, before the deadline.
- **Flood limit.** At most 20 messages per 10 minutes per sender.

## 7. Known limits

- **24-hour window.** WhatsApp only lets the bot send free-form messages within 24h of the buyer's last message. If a payment is approved later than that, the WhatsApp QR message fails. The buyer still gets the tickets by email. Covering this needs a Meta-approved utility template (🔜).
- **Conversation memory** (last ~8 messages, reset after 30 min idle) is kept in the API process: a backend restart forgets open chats. Orders are unaffected; they're in the database.
- **Once a number is on the Cloud API**, its chats are not readable in the WhatsApp Business app — they only flow through the bot.
- Not in the bot (use the dashboard/website): rejecting proofs or applications, cancellations, refunds, merch purchases.
