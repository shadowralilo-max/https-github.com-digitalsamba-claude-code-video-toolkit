import { config } from "./config.js";
import { logger } from "./logger.js";
import { agentPump } from "./mcpClient.js";

// Very simple, transparent default strategy — tune via .env, or replace
// wholesale. This is NOT investment advice and is not tuned for profitability.
//
// Candidate selection:
//   - fixed watchlist mode, if WATCHLIST_MINTS is set: only ever consider
//     those mints.
//   - otherwise, scan AgentPump's live bonding-curve listings and keep
//     tokens whose graduation progress falls inside
//     [MIN_PROGRESS_PCT, MAX_PROGRESS_PCT] (filters out both brand-new,
//     untested launches and tokens about to graduate) and whose name/symbol
//     matches NAME_KEYWORDS, if any are set.
//
// Exit rules (applied to every open position, independent of how it was
// picked): sell the whole position at TAKE_PROFIT_PCT gain or
// STOP_LOSS_PCT loss versus entry price.

export async function findCandidates(openMints) {
  if (config.watchlistMints.length > 0) {
    const candidates = [];
    for (const mint of config.watchlistMints) {
      if (openMints.has(mint)) continue;
      try {
        const info = await agentPump.tokenInfo(mint);
        candidates.push({ mint, info });
      } catch (err) {
        logger.warn("Failed to fetch watchlist token info", { mint, error: String(err) });
      }
    }
    return candidates;
  }

  let listing;
  try {
    listing = await agentPump.listTokens(undefined, 50);
  } catch (err) {
    logger.warn("Failed to list AgentPump tokens", { error: String(err) });
    return [];
  }

  const tokens = Array.isArray(listing) ? listing : listing?.tokens ?? [];
  const candidates = [];

  for (const t of tokens) {
    const mint = t.mint ?? t.address;
    if (!mint || openMints.has(mint)) continue;

    const progress = Number(t.progress ?? t.progressPct ?? t.percentToGraduation ?? NaN);
    if (Number.isFinite(progress)) {
      if (progress < config.minProgressPct || progress > config.maxProgressPct) continue;
    }

    if (config.nameKeywords.length > 0) {
      const haystack = `${t.name ?? ""} ${t.symbol ?? ""}`.toLowerCase();
      const matches = config.nameKeywords.some((k) => haystack.includes(k));
      if (!matches) continue;
    }

    candidates.push({ mint, info: t });
  }

  return candidates;
}

export function evaluateExit(position, currentPriceSol) {
  if (!position.entryPriceSol || position.entryPriceSol <= 0) return null;
  const changePct = ((currentPriceSol - position.entryPriceSol) / position.entryPriceSol) * 100;

  if (changePct >= config.takeProfitPct) {
    return { reason: "take_profit", changePct };
  }
  if (changePct <= -config.stopLossPct) {
    return { reason: "stop_loss", changePct };
  }
  return null;
}
