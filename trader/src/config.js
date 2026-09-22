import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv(join(ROOT, ".env"));

function bool(name, fallback) {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v.toLowerCase() === "true" || v === "1";
}

function num(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function list(name) {
  const v = process.env[name];
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  root: ROOT,
  liveTrading: bool("LIVE_TRADING", false),
  maxTotalLossUsd: num("MAX_TOTAL_LOSS_USD", 2),
  perTradeSol: num("PER_TRADE_SOL", 0.02),
  takeProfitPct: num("TAKE_PROFIT_PCT", 50),
  stopLossPct: num("STOP_LOSS_PCT", 25),
  maxOpenPositions: num("MAX_OPEN_POSITIONS", 2),
  pollIntervalSeconds: num("POLL_INTERVAL_SECONDS", 30),
  minProgressPct: num("MIN_PROGRESS_PCT", 5),
  maxProgressPct: num("MAX_PROGRESS_PCT", 80),
  nameKeywords: list("NAME_KEYWORDS").map((s) => s.toLowerCase()),
  watchlistMints: list("WATCHLIST_MINTS"),
};
