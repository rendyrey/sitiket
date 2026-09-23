import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

// WhatsApp Cloud API webhook (Meta → sitiket.com/api/webhooks/whatsapp).
// Lives in Next rather than the Express backend because nginx only routes
// /uploads/ to the backend — everything else, this path included, already
// reaches Next, so no proxy change is needed.
// ponytail: only logs events (see `pm2 logs sitiket-app`); persist statuses /
// react to inbound messages once there's a feature that needs them.

/**
 * Meta's subscription handshake: echo `hub.challenge` back when the verify
 * token matches the one typed into the app dashboard.
 *
 * @param request - `GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=…&hub.challenge=1158201444`
 * @returns the challenge as plain text, or 403 on a token mismatch.
 */
export function GET(request: Request): Response {
  const params = new URL(request.url).searchParams;
  const tokenMatches =
    Boolean(env.WHATSAPP_VERIFY_TOKEN) &&
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === env.WHATSAPP_VERIFY_TOKEN;

  if (!tokenMatches) return new Response("Forbidden", { status: 403 });
  return new Response(params.get("hub.challenge") ?? "", { status: 200 });
}

/**
 * Receives message-status (`sent`/`delivered`/`read`/`failed`) and inbound
 * message events. The body is only trusted after its `X-Hub-Signature-256`
 * HMAC (keyed with the Meta app secret) checks out.
 *
 * @param request - Meta's POST; header example: `X-Hub-Signature-256: sha256=9f2c…`
 * @returns 200 once accepted (Meta retries anything else), 401 on a bad signature.
 */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  console.log("[whatsapp-webhook]", rawBody);
  return new Response(null, { status: 200 });
}

/**
 * Checks Meta's `sha256=<hex>` signature against an HMAC of the raw body.
 *
 * @param rawBody - exact request body text, before any JSON parsing.
 * @param header - `X-Hub-Signature-256` value. Example: `"sha256=9f2c…"`
 * @returns true only when the app secret is configured and the digests match.
 */
function isValidSignature(rawBody: string, header: string | null): boolean {
  if (!env.WHATSAPP_APP_SECRET || !header?.startsWith("sha256=")) return false;

  /** Signature Meta sent, as bytes. */
  const received = Buffer.from(header.slice("sha256=".length), "hex");
  /** Signature we expect for this body. */
  const expected = createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest();

  return received.length === expected.length && timingSafeEqual(received, expected);
}
