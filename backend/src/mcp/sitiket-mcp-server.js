import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MERCH_TOOLS } from "./merch-tools.js";
import { executeTool, SITIKET_TOOLS } from "./sitiket-tools.js";

/** Every tool the server can offer; each message's server registers only its sender's share. */
const ALL_TOOLS = [...SITIKET_TOOLS, ...MERCH_TOOLS];

// Local MCP server exposing SiTIKET's ticket-buying flow as tools. It runs
// in-process (in-memory transport) rather than as a stdio child: one server is
// built per inbound WhatsApp message with that sender's identity baked in, so
// the tool list itself is the permission boundary — a buyer's server simply
// has no approve_* tools to call, whatever the model asks for.

/** Server/client identity reported in the MCP handshake. */
const SERVER_INFO = { name: "sitiket", version: "1.0.0" };
const CLIENT_INFO = { name: "sitiket-whatsapp-bot", version: "1.0.0" };

/**
 * Builds an MCP server holding only the tools `context.role` may use.
 *
 * @param {import("./sitiket-tools.js").ToolContext} context - Example: `{ waId: "628112003717", role: "buyer", userText: "event apa aja?" }`
 * @returns {McpServer}
 */
export const createSitiketMcpServer = (context) => {
  const server = new McpServer(SERVER_INFO);
  for (const tool of ALL_TOOLS.filter((candidate) => candidate.roles.includes(context.role))) {
    server.registerTool(tool.name, { description: tool.description, inputSchema: tool.inputSchema }, async (args) => {
      const result = await executeTool(tool, args, context);
      return { content: [{ type: "text", text: JSON.stringify(result) }], isError: Boolean(result.error) };
    });
  }
  return server;
};

/**
 * Starts a context-bound server and returns a connected MCP client for it.
 * Callers must `close()` when the message is handled.
 *
 * @param {import("./sitiket-tools.js").ToolContext} context
 * @returns {Promise<{ client: Client, close: () => Promise<void> }>}
 */
export const connectSitiketMcp = async (context) => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createSitiketMcpServer(context);
  const client = new Client(CLIENT_INFO);
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  // Closing one end of the linked pair closes the other.
  return { client, close: () => client.close() };
};
