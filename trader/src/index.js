import { config } from "./config.js";
import { logger } from "./logger.js";
import { loadState, saveState } from "./state.js";
import { RiskManager } from "./riskManager.js";
import { findCandidates, evaluateExit } from "./strategy.js";
import { agentPump } from "./mcpClient.js";
import { pickNumber, sleep } from "./utils.js";

const PRICE_KEYS = ["price", "priceSol", "priceInSol", "currentPrice"];
const GRADUATED_KEYS = ["graduated", "isGraduated"];

let shuttingDown = false;
process.on("SIGINT", () => {
  logger.info("Shutdown requested — finishing current cycle then exiting.");
  shuttingDown = true;
});
process.on("SIGTERM", () => {
  shuttingDown = true;
});

function isGraduated(info) {
  if (info == null || typeof info !== "object") return false;
  for (const key of GRADUATED_KEYS) {
    if (typeof info[key] === "boolean") return info[key];
  }
  const status = String(info.status ?? "").toLowerCase();
  return status.includes("graduat");
}

async function getBalanceSol() {
  const raw = await agentPump.balance();
  return pickNumber(raw, ["sol", "balance", "amount"]) ?? 0;
}

async function openPosition(state, risk, mint) {
  const balanceBefore = await getBalanceSol();

  if (config.liveTrading) {
    await agentPump.buy(mint, config.perTradeSol);
  } else {
    logger.info("[DRY RUN] would buy", { mint, sol: config.perTradeSol });
  }

  const balanceAfter = config.liveTrading ? await getBalanceSol() : balanceBefore - config.perTradeSol;
  const costSol = config.liveTrading ? Math.max(balanceBefore - balanceAfter, 0) : config.perTradeSol;

  let info = {};
  try {
    info = await agentPump.tokenInfo(mint);
  } catch (err) {
    logger.warn("tokenInfo failed right after buy", { mint, error: String(err) });
  }
  const entryPriceSol = pickNumber(info, PRICE_KEYS) ?? 1;

  state.positions[mint] = {
    costSol,
    entryPriceSol,
    graduated: isGraduated(info),
    openedAt: new Date().toISOString(),
  };
  saveState(state);

  logger.trade(config.liveTrading ? "BUY" : "[DRY RUN] BUY", {
    mint,
    costSol,
    entryPriceSol,
  });
}

async function closePosition(state, risk, mint, position, reason) {
  const balanceBefore = await getBalanceSol();

  if (config.liveTrading) {
    if (position.graduated) {
      await agentPump.raydiumSell(mint, 100);
    } else {
      await agentPump.sell(mint, 100);
    }
  } else {
    logger.info("[DRY RUN] would sell", { mint, reason });
  }

  let proceedsSol;
  if (config.liveTrading) {
    const balanceAfter = await getBalanceSol();
    proceedsSol = Math.max(balanceAfter - balanceBefore, 0);
  } else {
    let info = {};
    try {
      info = await agentPump.tokenInfo(mint);
    } catch {
      // fall through with entry price -> 0 pnl
    }
    const currentPriceSol = pickNumber(info, PRICE_KEYS) ?? position.entryPriceSol;
    proceedsSol = position.costSol * (currentPriceSol / position.entryPriceSol);
  }

  const pnlSol = proceedsSol - position.costSol;
  delete state.positions[mint];
  saveState(state);

  logger.trade(config.liveTrading ? "SELL" : "[DRY RUN] SELL", {
    mint,
    reason,
    proceedsSol,
    pnlSol,
  });

  await risk.recordRealizedPnlSol(pnlSol);
  saveState(state);
}

async function cycle(state, risk) {
  // 1. Check exits on open positions first.
  for (const [mint, position] of Object.entries(state.positions)) {
    let info;
    try {
      info = await agentPump.tokenInfo(mint);
    } catch (err) {
      logger.warn("tokenInfo failed for open position", { mint, error: String(err) });
      continue;
    }
    position.graduated = isGraduated(info);
    const currentPriceSol = pickNumber(info, PRICE_KEYS);
    if (currentPriceSol == null) continue;

    const exit = evaluateExit(position, currentPriceSol);
    if (exit) {
      await closePosition(state, risk, mint, position, exit.reason);
    }
  }

  // 2. Look for new entries, if the circuit breaker hasn't tripped.
  if (!risk.canOpenNewPosition()) return;

  const openMints = new Set(Object.keys(state.positions));
  const candidates = await findCandidates(openMints);

  for (const { mint } of candidates) {
    if (!risk.canOpenNewPosition()) break;
    await openPosition(state, risk, mint);
  }
}

async function main() {
  logger.info("Starting meme-coin auto trader", {
    liveTrading: config.liveTrading,
    maxTotalLossUsd: config.maxTotalLossUsd,
    perTradeSol: config.perTradeSol,
    takeProfitPct: config.takeProfitPct,
    stopLossPct: config.stopLossPct,
    maxOpenPositions: config.maxOpenPositions,
  });

  if (!config.liveTrading) {
    logger.info(
      "LIVE_TRADING is false — running in DRY RUN mode. No real funds will move. " +
        "Set LIVE_TRADING=true in .env once you've reviewed the strategy."
    );
  } else {
    logger.warn(
      "LIVE_TRADING is TRUE — this bot will spend real SOL autonomously, " +
        `up to a $${config.maxTotalLossUsd} total realized loss cap.`
    );
  }

  const state = loadState();
  const risk = new RiskManager(state);

  if (risk.isHalted()) {
    logger.error("Bot is halted from a previous run — refusing to start.", {
      reason: state.haltedReason,
    });
    logger.error(
      "Delete or edit trader/data/state.json to reset (only after reviewing what happened)."
    );
    process.exit(1);
  }

  while (!shuttingDown) {
    try {
      await cycle(state, risk);
    } catch (err) {
      logger.error("Cycle failed", { error: String(err?.stack ?? err) });
    }

    if (risk.isHalted()) {
      logger.error("Circuit breaker tripped — stopping.", { reason: state.haltedReason });
      break;
    }

    await sleep(config.pollIntervalSeconds * 1000);
  }

  logger.info("Trader stopped.", {
    openPositions: Object.keys(state.positions).length,
    realizedLossUsd: state.realizedLossUsd,
    realizedGainUsd: state.realizedGainUsd,
  });
}

main().catch((err) => {
  logger.error("Fatal error", { error: String(err?.stack ?? err) });
  process.exitCode = 1;
});
