import { createHmac, timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import { env } from "../config/env.js";
import { handleWebhookPayload } from "../services/whatsapp-bot-service.js";

// WhatsApp Cloud API webhook. Meta calls sitiket.com/api/webhooks/whatsapp,
// which the Next app relays here verbatim (nginx only routes /uploads/ to this
// API). Mounted in app.js BEFORE express.json(): the signature is an HMAC of
// the exact raw bytes, so the body must not be parsed first.

export const whatsappRouter = Router();

/**
 * Checks Meta's `sha256=<hex>` signature against an HMAC of the raw body.
 *
 * @param {Buffer} rawBody - exact request bytes
 * @param {string | undefined} header - `X-Hub-Signature-256`. Example: `"sha256=9f2c…"`
 * @returns {boolean} true only when the app secret is configured and the digests match
 */
export const isValidSignature = (rawBody, header) => {
  if (!env.WHATSAPP_APP_SECRET || !header?.startsWith("sha256=")) return false;
  /** Signature Meta sent, as bytes. */
  const received = Buffer.from(header.slice("sha256=".length), "hex");
  /** Signature expected for this body. */
  const expected = createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
};

// Meta's subscription handshake: echo hub.challenge when the verify token matches.
whatsappRouter.get("/webhook", (request, response) => {
  const tokenMatches =
    Boolean(env.WHATSAPP_VERIFY_TOKEN) &&
    request.query["hub.mode"] === "subscribe" &&
    request.query["hub.verify_token"] === env.WHATSAPP_VERIFY_TOKEN;
  if (!tokenMatches) {
    response.status(403).send("Forbidden");
    return;
  }
  response.status(200).type("text/plain").send(String(request.query["hub.challenge"] ?? ""));
});

// Inbound messages + delivery statuses. Acked with 200 before the bot runs —
// an LLM reply takes seconds and Meta retries slow webhooks.
whatsappRouter.post("/webhook", express.raw({ type: "application/json", limit: "1mb" }), (request, response) => {
  const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
  if (!isValidSignature(rawBody, request.get("x-hub-signature-256"))) {
    response.status(401).send("Invalid signature");
    return;
  }
  response.sendStatus(200);

  try {
    handleWebhookPayload(JSON.parse(rawBody.toString("utf8")));
  } catch (error) {
    console.error("[whatsapp-webhook] unreadable payload:", error);
  }
});
