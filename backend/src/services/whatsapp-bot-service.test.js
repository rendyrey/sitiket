import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

// Set before config/env.js is first imported — env is parsed once at import time.
process.env.WHATSAPP_APP_SECRET = "test-app-secret";

const { pickProofTarget } = await import("./whatsapp-bot-service.js");
const { floodDecision, trimHistory } = await import("./assistant-service.js");
const { buildSystemPrompt } = await import("./assistant-prompts.js");
const { isApprovalTypedByUser } = await import("../mcp/sitiket-tools.js");
const { isValidSignature } = await import("../routes/whatsapp.js");
const { toWhatsappId } = await import("../utils/phone.js");

test("approval runs only when the Super Admin typed both an approval word and the exact ref", () => {
  assert.equal(isApprovalTypedByUser("a1b2c3d4", "setujui a1b2c3d4"), true);
  assert.equal(isApprovalTypedByUser("a1b2c3d4", "Acc A1B2C3D4 ya"), true);
  // Ref only (e.g. asking for details) is not an approval.
  assert.equal(isApprovalTypedByUser("a1b2c3d4", "detail a1b2c3d4 dong"), false);
  // Approval word but a different ref — e.g. one the model picked up from injected data.
  assert.equal(isApprovalTypedByUser("deadbeef", "setujui a1b2c3d4"), false);
  // "approve all" can never match: refs must be exactly 8 hex chars.
  assert.equal(isApprovalTypedByUser("all", "approve all"), false);
  assert.equal(isApprovalTypedByUser("a1", "setujui a1b2c3d4"), false);
});

test("profile phones in any common format match the WhatsApp sender id", () => {
  assert.equal(toWhatsappId("081234567890"), "6281234567890");
  assert.equal(toWhatsappId("+62 812-3456-7890"), "6281234567890");
  assert.equal(toWhatsappId("6281234567890"), "6281234567890");
  assert.equal(toWhatsappId(null), "");
});

test("history is trimmed at user turns, never splitting a tool call from its result", () => {
  const history = [
    { role: "user", content: "1" },
    { role: "assistant", content: null, tool_calls: [{ id: "t1" }] },
    { role: "tool", tool_call_id: "t1", content: "{}" },
    { role: "assistant", content: "a" },
    { role: "user", content: "2" },
    { role: "assistant", content: "b" },
  ];
  assert.deepEqual(trimHistory(history, 5), history);
  assert.deepEqual(trimHistory(history, 1), history.slice(4));
});

test("a payment photo goes to the order named in its caption, or the only open order", () => {
  const ticket = { ref: "aaaa1111", kind: "ticket" };
  const merch = { ref: "bbbb2222", kind: "merch" };
  assert.equal(pickProofTarget([ticket], undefined), ticket);
  assert.equal(pickProofTarget([ticket, merch], "transfer bbbb2222"), merch);
  assert.equal(pickProofTarget([ticket, merch], "BBBB2222"), merch);
  // Several open orders and no (or an unknown) ref: ambiguous, the buyer is asked.
  assert.equal(pickProofTarget([ticket, merch], "sudah transfer"), null);
  assert.equal(pickProofTarget([ticket, merch], "cccc3333"), null);
  assert.equal(pickProofTarget([], "aaaa1111"), null);
});

test("a flooding sender is told once, then ignored (each reply is a paid message)", () => {
  assert.equal(floodDecision(1, false), "answer");
  assert.equal(floodDecision(15, false), "answer"); // a full merch checkout still fits
  assert.equal(floodDecision(16, false), "notify");
  assert.equal(floodDecision(17, true), "ignore");
  assert.equal(floodDecision(40, true), "ignore");
});

test("each channel gets its own flow in the shared prompt", () => {
  const whatsapp = buildSystemPrompt({ channel: "whatsapp", role: "buyer" }, "sekarang");
  const web = buildSystemPrompt({ channel: "web", role: "admin" }, "sekarang");
  assert.ok(whatsapp.includes("verify_email_code") && !whatsapp.includes("SIGN_IN_REQUIRED"));
  assert.ok(web.includes("SIGN_IN_REQUIRED") && !web.includes("verify_email_code"));
  assert.ok(web.includes("*Admin*") && !whatsapp.includes("*Admin*"));
  assert.ok(whatsapp.includes("Bahasa Indonesia") && web.includes("Bahasa Indonesia"));
});

test("webhook signature must be Meta's HMAC of the exact raw body", () => {
  const body = Buffer.from('{"entry":[]}');
  const signature = `sha256=${createHmac("sha256", "test-app-secret").update(body).digest("hex")}`;
  assert.equal(isValidSignature(body, signature), true);
  assert.equal(isValidSignature(Buffer.from('{"entry":[1]}'), signature), false);
  assert.equal(isValidSignature(body, "sha256=00"), false);
  assert.equal(isValidSignature(body, undefined), false);
});
