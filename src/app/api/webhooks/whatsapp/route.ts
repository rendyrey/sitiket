import { env } from "@/lib/env";

// WhatsApp Cloud API webhook (Meta → sitiket.com/api/webhooks/whatsapp),
// relayed verbatim to the backend (backend/src/routes/whatsapp.js), which owns
// the verify-token handshake, the X-Hub-Signature-256 check and the bot. It
// lives in Next only because nginx routes nothing but /uploads/ to the backend.

/** Backend endpoint every WhatsApp webhook call is relayed to. Example: `"http://127.0.0.1:4000/api/whatsapp/webhook"` */
const BACKEND_WEBHOOK_URL = `${env.API_BASE_URL}/api/whatsapp/webhook`;

/**
 * Meta's subscription handshake, answered by the backend.
 *
 * @param request - `GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=…&hub.challenge=1158201444`
 * @returns the backend's answer: the challenge as text, or 403.
 */
export async function GET(request: Request): Promise<Response> {
  const upstream = await fetch(`${BACKEND_WEBHOOK_URL}${new URL(request.url).search}`, { cache: "no-store" });
  return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": "text/plain" } });
}

/**
 * Inbound messages and delivery statuses. The body is forwarded as raw bytes
 * with its signature header, because the backend verifies an HMAC of exactly
 * those bytes.
 *
 * @param request - Meta's POST; header example: `X-Hub-Signature-256: sha256=9f2c…`
 * @returns the backend's status: 200 once accepted (Meta retries anything else), 401 on a bad signature.
 */
export async function POST(request: Request): Promise<Response> {
  const upstream = await fetch(BACKEND_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": request.headers.get("x-hub-signature-256") ?? "",
    },
    body: await request.arrayBuffer(),
    cache: "no-store",
  });
  return new Response(null, { status: upstream.status });
}
