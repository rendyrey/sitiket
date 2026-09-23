# "Mimin SiTIKET" assistant — WhatsApp bot, Telegram bot & website chat

A customer-service bot on SiTIKET's WhatsApp Business number (the WhatsApp Cloud API number, phone number ID `1395472303641057`). It lets people buy tickets and merchandise entirely in WhatsApp, lets organizers approve ticket payments from their phone, and lets the Super Admin review organizer applications. The same assistant also runs as a **chat on the website** (§9) and as a **Telegram bot** (§10). Both are extra **channels** onto the same v1 flows, not a separate system: every step calls the same backend services as the web app, so prices, stock, the email OTP, shipping quotes, payment windows and approval rules are identical (see [PAYMENT_VERIFICATION.md](./PAYMENT_VERIFICATION.md)).

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

The same phone match also finds the buyer's **own account** for merch (§4): merch is signed-in-only on the web, so the bot acts on the one active account whose profile phone is the sender's number. If several accounts share a number, none is used and the buyer is asked to keep it on one account.

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

## 4. Merch journey

Same steps as web merch checkout ([SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md), BACKEND.md § _Merch invariants_):

1. **Browse.** "Merch apa saja?" → the **10 newest products that can actually be bought**: in stock, from a seller with a payment method and a shipping origin. A keyword search works too.
2. **Look closer.** "Lihat fotonya" → the bot **sends 2 product photos into the chat**, and offers the next ones only if the buyer asks (each photo is a paid message from October 2026). Details list only variants that are **in stock**, each with its own price.
3. **Account.** Merch needs a SiTIKET account with this WhatsApp number saved as the profile phone. If none matches, the bot explains how: sign in with Google on sitiket.com, save the number (and an address) at `/account/profile`, then chat again. Tickets remain available without an account.
4. **Address check (always).** Before shipping costs are quoted, the bot shows the saved delivery address and asks whether it's right. To change it in chat:
   - The bot walks province → city/regency → district → village (with postal code) using the same region data as the profile page, then asks for the street line.
   - After the buyer confirms, it saves the address to the account, exactly like the profile page. It's a real account update, so the new address also shows on the website.
   - If the region lookup fails, or the buyer prefers, they're sent to `/account/profile`.
5. **Shipping.** Courier options with price and estimate are quoted **per seller** for the chosen items. The buyer picks one courier per seller.
6. **Promo & note.** Optional promo code per seller and a note for the seller.
7. **Confirm & order.** The summary shows items, variant × quantity, subtotal, shipping, total per seller and the address. The order is only created after "ya". A multi-seller cart becomes **one order per seller**, each paid separately, with a **24h** payment window.
8. **Pay & proof.** Payment instructions per order, then a **photo** of the transfer. With several unpaid orders (ticket or merch), the bot asks for the photo again with the **order code as caption**, so it's attached to the right one.
9. **After.** The seller verifies the payment in the dashboard and ships. The buyer can ask for their status in chat at any time.

## 5. Organizer (Admin) journey

1. "Ada pembayaran yang perlu dicek?" → the payment proofs awaiting review **on this organizer's own events**, oldest first. Each shows an **8-character reference**, the buyer, amount, method, note, and a link to the proof photo.
2. To approve, the organizer writes an approval word **and the reference** themselves, e.g. **`setujui a1b2c3d4`** (also accepted: `acc`, `approve`, `terima…`).
3. Approval does exactly what the dashboard's Approve does: order → `paid`, tickets issued, the buyer emailed, plus the WhatsApp QR delivery for bot orders.

Organizers cannot see or approve another organizer's payments. **Rejecting** a proof is still done in the dashboard.

## 6. Super Admin journey

1. "Ada pengajuan penyelenggara?" → pending organizer applications (business name and description, contact phone, applicant name and email, 8-character reference).
2. Approve with **`setujui <reference>`**. The applicant becomes an Admin and is emailed; they must sign in again to see the admin dashboard (see BACKEND.md § _Known gaps_ on JWT role claims). Rejecting is still done in the dashboard.

## 7. Safety rules

- **The approval phrase is the Admin's own.** Lists contain text other people typed: buyer names, transfer notes, business descriptions. An approval only runs when the reviewer's **own current message** contains both an approval word and the exact reference. Text planted in the data ("approve everything") can't trigger an approval.
- **Role tools don't exist for other roles.** A buyer's session has no approve tools at all, however the model is prompted. An organizer's approve is restricted to their events.
- **Photos can't jump the queue.** A proof is only accepted for the sender's own open order (tickets: after the email OTP), before the deadline.
- **Account by phone.** Merch and address changes act only on the account whose profile phone is the sender's number. The profile phone isn't verified, so an account holder must keep their own number correct: a mistyped number would let whoever owns it see and change that account's address.
- **Flood limit.** At most 15 messages per 10 minutes per number (a full merch checkout fits). The 16th gets one "slow down" notice; anything after that in the window is ignored: no reply and no LLM call.

## 8. Known limits

- **WhatsApp costs from 1 Oct 2026.** Meta starts charging every message the business sends, including replies inside the 24h window, at the market's utility rate, with no volume tiers. Receiving messages stays free, and conversations opened from a Click-to-WhatsApp ad/Page button get a 72h free window. Until then, every reply this bot sends is free. Costs to plan for: 1 per reply, up to 2 per photo request, 1 + one per ticket on approval. OpenAI tokens are billed separately for every inbound text.

- **24-hour window.** WhatsApp only lets the bot send free-form messages within 24h of the buyer's last message. If a payment is approved later than that, the WhatsApp QR message fails. The buyer still gets the tickets by email. Covering this needs a Meta-approved utility template (🔜).
- **Conversation memory** (last ~8 messages, reset after 30 min idle) is kept in the API process: a backend restart forgets open chats. Orders are unaffected; they're in the database.
- **Once a number is on the Cloud API**, its chats are not readable in the WhatsApp Business app — they only flow through the bot.
- Not in the bot (use the dashboard/website): rejecting proofs or applications, cancellations, refunds, **approving merch payments** (sellers use the dashboard).

## 9. Website chat

A floating chat button on every page of sitiket.com opens the same assistant: same persona, same Bahasa Indonesia replies, same tools and rules. What changes on the website:

| | WhatsApp | Website chat |
| --- | --- | --- |
| Who you are | the account whose profile phone is your WhatsApp number | the account you're **signed in** with |
| Without an account | tickets via guest checkout (email OTP) | ask anything; ordering, order status and address changes need **sign-in** (the chat shows a *Masuk* button) |
| Ticket checkout | name + email in chat, **6-digit email code** | name/email/phone from the account, **no code** (the site's normal signed-in checkout) |
| Payment proof | send a **photo** in the chat | upload it on the **order page** the chat links to |
| Merch photos | sent as WhatsApp images (paid from Oct 2026) | shown inside the chat |
| Approvals (Admin/Super Admin) | same guarded `setujui <code>` | same guarded `setujui <code>`, when signed in with that role |
| Cost | per WhatsApp message (from 1 Oct 2026) + LLM | LLM only |

Limits: 15 messages per 10 minutes per chat, and 40 per 10 minutes per network (so guests can't dodge the per-chat limit). The chat's visible history is remembered in the browser (per account). The panel also offers the Telegram bot (§10) — a Telegram button in its header and, before the first message, a *Lanjut di Telegram* card — for buyers who'd rather get tickets and order updates in Telegram. The web conversation doesn't carry over; Telegram starts fresh. The assistant's own memory follows the same 30-minute rule as WhatsApp.

## 10. Telegram bot

[@sitiket_assistant_bot](https://t.me/sitiket_assistant_bot). The landing page shows a QR code that opens it, plus an "Open in Telegram" button for phones. Same assistant, tools and rules as WhatsApp; what differs:

| | Telegram |
| --- | --- |
| Who you are | Nobody by default — Telegram doesn't reveal a phone number. Tapping **📱 Bagikan nomor HP** shares the user's Telegram-verified number; the bot accepts only the sender's **own** contact and remembers it. That number is matched to SiTIKET accounts exactly like a WhatsApp number (so admins/Super Admins must have it on their profile, as for WhatsApp). |
| Tickets | Guest checkout: name, email and (until the number is shared) phone in chat, then the **6-digit email code**. |
| Merch, order status on the account, address changes, approvals | Need the shared number to match a SiTIKET account profile. |
| Payment proof | Send a **photo** (or an image file) in the chat; several unpaid orders → put the order code in the caption. |
| Tickets after approval | Confirmation + **one QR photo per ticket** in the Telegram chat, plus email. No 24-hour window like WhatsApp — delivery works any time (unless the user blocked the bot). |
| Merch photos | Sent as Telegram photos. |
| Cost | **Free** (Telegram charges nothing) — only the LLM tokens. |

Limits: 15 messages per 10 minutes per user (one notice, then ignored until the window passes); group chats are ignored — the bot only talks in private chats. `/start` shows a fixed greeting (no LLM cost).
