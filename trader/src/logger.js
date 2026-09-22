import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";

const dataDir = join(config.root, "data");
mkdirSync(dataDir, { recursive: true });
const logPath = join(dataDir, "trades.log");

function write(level, msg, extra) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(extra !== undefined ? { extra } : {}),
  });
  console.log(`[${level}] ${msg}`, extra ?? "");
  try {
    appendFileSync(logPath, line + "\n");
  } catch {
    // best-effort file logging only
  }
}

export const logger = {
  info: (msg, extra) => write("INFO", msg, extra),
  warn: (msg, extra) => write("WARN", msg, extra),
  error: (msg, extra) => write("ERROR", msg, extra),
  trade: (msg, extra) => write("TRADE", msg, extra),
};
