import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { logger } from "./logger.js";

let client = null;

export async function getAgentPumpClient() {
  if (client) return client;

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "agentpump-mcp"],
  });

  const c = new Client({ name: "meme-coin-auto-trader", version: "0.1.0" }, {
    capabilities: {},
  });

  await c.connect(transport);
  logger.info("Connected to agentpump-mcp");
  client = c;
  return client;
}

async function callTool(name, args = {}) {
  const c = await getAgentPumpClient();
  const result = await c.callTool({ name, arguments: args });
  if (result.isError) {
    const text = result.content?.map((p) => p.text ?? "").join(" ") || "unknown error";
    throw new Error(`agentpump tool ${name} failed: ${text}`);
  }
  const text = result.content?.map((p) => p.text ?? "").join("\n") ?? "";
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const agentPump = {
  address: () => callTool("sol_address"),
  balance: () => callTool("sol_balance"),
  createWallet: () => callTool("sol_create_wallet"),
  exportKey: () => callTool("sol_export_key"),
  listTokens: (query, limit) => callTool("sol_list_tokens", { query, limit }),
  tokenInfo: (mint) => callTool("sol_token_info", { mint }),
  buy: (mint, sol) => callTool("sol_buy", { mint, sol }),
  sell: (mint, percent) => callTool("sol_sell", { mint, percent }),
  raydiumBuy: (mint, sol) => callTool("sol_raydium_buy", { mint, sol }),
  raydiumSell: (mint, percent) => callTool("sol_raydium_sell", { mint, percent }),
  withdraw: (to, sol) => callTool("sol_withdraw", { to, sol }),
};
