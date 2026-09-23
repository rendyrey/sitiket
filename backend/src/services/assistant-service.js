import { env } from "../config/env.js";
import { connectSitiketMcp } from "../mcp/sitiket-mcp-server.js";
import { formatJakartaTime } from "../mcp/sitiket-tools.js";
import { buildSystemPrompt } from "./assistant-prompts.js";

// The SiTIKET assistant's conversation engine, shared by every channel
// (services/whatsapp-bot-service.js, services/web-chat-service.js): per-chat
// history, a model ↔ local-MCP-tools loop, per-chat serialization and a flood
// guard. Channels only decide who the user is (the ToolContext) and how the
// reply is delivered.

/** Previous turns kept per chat. Example: 8 → the last 8 user messages and everything after them. */
const MAX_REMEMBERED_USER_TURNS = 8;
/** A chat idle this long starts fresh. */
const CONVERSATION_TTL_MS = 30 * 60 * 1000;
/** Model ↔ tool round-trips allowed per message before giving up (stops runaway loops/cost). */
const MAX_TOOL_ROUNDS = 6;
/** Longest user text passed to the model; the rest is dropped. */
export const MAX_USER_TEXT_LENGTH = 1500;
/**
 * Per-chat flood guard: at most this many messages … Sized for the longest
 * honest flow — a merch checkout with an in-chat address change is ~12-14 messages.
 */
const RATE_LIMIT_MAX_MESSAGES = 15;
/** … within this window. */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export const FALLBACK_REPLY =
  "Maaf Kak, Mimin belum bisa memproses permintaan itu 🙏 Boleh ditulis ulang dengan lebih singkat? Misalnya: *event apa saja minggu ini?*";

/**
 * Chat history per chat key. Example: `Map { "wa:628112003717" => { messages: [...], lastActiveAt: 1790000000000 } }`
 * ponytail: in-memory, single pm2 instance — a restart forgets open chats (orders
 * themselves are in MySQL, so nothing is lost); move to a table if the API ever scales out.
 */
const conversations = new Map();
/** Serializes each chat's turns so two quick messages can't interleave one history. */
const chatQueues = new Map();
/**
 * Flood-guard state per chat key. Example: `Map { "wa:628112003717" => { times: [1790000000000, …], notifiedAt: 0 } }`
 * ponytail: never pruned — one small entry per chat that ever wrote; sweep it if that grows past memory.
 */
const floodStateByChat = new Map();

/** @returns {boolean} true when the LLM endpoint (the OpenAI-compatible embeddings config) is set. */
export const isAssistantConfigured = () => Boolean(env.EMBEDDINGS_BASE_URL && env.EMBEDDINGS_API_KEY);

/**
 * Keeps the last `maxUserTurns` user messages and everything after them.
 * Cutting only at user messages keeps each assistant `tool_calls` message
 * together with its `tool` results — the chat API rejects a split pair.
 *
 * @param {Array<{ role: string }>} messages
 * @param {number} maxUserTurns - Example: `8`
 * @returns {Array<{ role: string }>}
 */
export const trimHistory = (messages, maxUserTurns) => {
  const userIndexes = messages.flatMap((message, index) => (message.role === "user" ? [index] : []));
  if (userIndexes.length <= maxUserTurns) return messages;
  return messages.slice(userIndexes[userIndexes.length - maxUserTurns]);
};

/** @param {string} chatKey - Example: `"web:7f3c…"` */
const loadHistory = (chatKey) => {
  const conversation = conversations.get(chatKey);
  if (!conversation || Date.now() - conversation.lastActiveAt > CONVERSATION_TTL_MS) return [];
  return conversation.messages;
};

/**
 * @param {string} chatKey
 * @param {Array<object>} messages
 */
const saveHistory = (chatKey, messages) => {
  const now = Date.now();
  // Drop idle chats here instead of on a timer — O(chats) per message is nothing at this scale.
  for (const [key, conversation] of conversations) {
    if (now - conversation.lastActiveAt > CONVERSATION_TTL_MS) conversations.delete(key);
  }
  conversations.set(chatKey, { messages: trimHistory(messages, MAX_REMEMBERED_USER_TURNS), lastActiveAt: now });
};

/**
 * Records an exchange that happened outside the model (e.g. a WhatsApp proof
 * photo handled directly) so the model knows about it if the chat continues.
 * @param {string} chatKey
 * @param {string} userContent - Example: `"[mengirim foto bukti pembayaran]"`
 * @param {string} reply
 */
export const appendExchange = (chatKey, userContent, reply) =>
  saveHistory(chatKey, [
    ...loadHistory(chatKey),
    { role: "user", content: userContent },
    { role: "assistant", content: reply },
  ]);

/**
 * Flood-guard decision for one inbound message. Over the limit, the chat gets
 * ONE "slow down" notice per window and is then ignored — every WhatsApp reply
 * is a paid message from Oct 2026, and ignoring also skips the LLM.
 *
 * @param {number} messageCount - this chat's messages in the current window, this one included. Example: `16`
 * @param {boolean} alreadyNotified - whether the notice already went out this window
 * @returns {"answer" | "notify" | "ignore"}
 */
export const floodDecision = (messageCount, alreadyNotified) => {
  if (messageCount <= RATE_LIMIT_MAX_MESSAGES) return "answer";
  return alreadyNotified ? "ignore" : "notify";
};

/**
 * Records one inbound message and returns its {@link floodDecision}.
 * @param {string} chatKey
 * @returns {"answer" | "notify" | "ignore"}
 */
export const checkFlood = (chatKey) => {
  const now = Date.now();
  const state = floodStateByChat.get(chatKey) ?? { times: [], notifiedAt: 0 };
  state.times = state.times.filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  state.times.push(now);
  const decision = floodDecision(state.times.length, now - state.notifiedAt < RATE_LIMIT_WINDOW_MS);
  if (decision === "notify") state.notifiedAt = now;
  floodStateByChat.set(chatKey, state);
  return decision;
};

/**
 * Runs `task` after every earlier task for the same chat has finished.
 * @template T
 * @param {string} chatKey
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
export const runExclusive = (chatKey, task) => {
  const run = (chatQueues.get(chatKey) ?? Promise.resolve()).catch(() => {}).then(task);
  chatQueues.set(chatKey, run);
  run.finally(() => {
    if (chatQueues.get(chatKey) === run) chatQueues.delete(chatKey);
  }).catch(() => {});
  return run;
};

/**
 * MCP tool list → chat-completions function tools. `$schema` is dropped: it's
 * JSON Schema metadata the chat API doesn't need.
 * @param {Array<{ name: string, description?: string, inputSchema: object }>} tools
 */
const toChatTools = (tools) =>
  tools.map(({ name, description, inputSchema }) => {
    const { $schema: _schema, ...parameters } = inputSchema;
    return { type: "function", function: { name, description, parameters } };
  });

/**
 * One chat-completions call on the OpenAI-compatible endpoint already
 * configured for embeddings (same key, chat model WHATSAPP_BOT_MODEL).
 * @param {Array<object>} messages
 * @param {Array<object>} tools
 * @returns {Promise<{ content: string | null, tool_calls?: Array<object> }>} the assistant message
 */
const requestChatCompletion = async (messages, tools) => {
  const endpoint = `${env.EMBEDDINGS_BASE_URL.replace(/\/+$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.EMBEDDINGS_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: env.WHATSAPP_BOT_MODEL, messages, tools }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Chat completion failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return (await response.json()).choices[0].message;
};

/**
 * Runs one model tool call through the MCP client.
 * @param {import("@modelcontextprotocol/sdk/client/index.js").Client} client
 * @param {{ function: { name: string, arguments: string } }} call
 * @returns {Promise<string>} the tool result text handed back to the model
 */
const callMcpTool = async (client, call) => {
  try {
    const result = await client.callTool({ name: call.function.name, arguments: JSON.parse(call.function.arguments || "{}") });
    return result.content.filter((part) => part.type === "text").map((part) => part.text).join("\n");
  } catch (error) {
    return JSON.stringify({ error: { code: "TOOL_CALL_FAILED", message: error.message } });
  }
};

/**
 * One assistant turn: model ↔ MCP tools loop over this chat's history.
 * Callers should wrap it in {@link runExclusive} for the same `chatKey`.
 *
 * @param {object} input
 * @param {string} input.chatKey - history key, unique per channel + user. Example: `"wa:628112003717"`, `"web:7f3c…"`
 * @param {Omit<import("../mcp/sitiket-tools.js").ToolContext, "userText" | "attachments">} input.context - who is chatting
 * @param {string} input.text - the user's message. Example: `"event apa aja bulan ini?"`
 * @returns {Promise<{ reply: string, attachments: Array<{ type: "image", url: string, caption: string }> }>}
 *   `attachments` are images tools produced for channels that render them (web chat).
 */
export const runAssistantTurn = async ({ chatKey, context, text }) => {
  const userText = text.slice(0, MAX_USER_TEXT_LENGTH);
  /** Filled by tools that produce media for the channel (e.g. send_merch_photos on web). */
  const attachments = [];
  const { client, close } = await connectSitiketMcp({ ...context, userText, attachments });
  try {
    const { tools } = await client.listTools();
    const chatTools = toChatTools(tools);
    const systemMessage = { role: "system", content: buildSystemPrompt(context, formatJakartaTime(new Date())) };
    const history = [...loadHistory(chatKey), { role: "user", content: userText }];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const message = await requestChatCompletion([systemMessage, ...history], chatTools);
      const toolCalls = message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        const reply = message.content?.trim() || FALLBACK_REPLY;
        history.push({ role: "assistant", content: reply });
        saveHistory(chatKey, history);
        return { reply, attachments };
      }
      history.push({ role: "assistant", content: message.content ?? null, tool_calls: toolCalls });
      for (const call of toolCalls) {
        history.push({ role: "tool", tool_call_id: call.id, content: await callMcpTool(client, call) });
      }
    }

    history.push({ role: "assistant", content: FALLBACK_REPLY });
    saveHistory(chatKey, history);
    return { reply: FALLBACK_REPLY, attachments };
  } finally {
    await close();
  }
};
