import { config } from "./config.js";
import { logger } from "./logger.js";
import { getSolUsdPrice } from "./priceFeed.js";

// Tracks realized P&L against the hard MAX_TOTAL_LOSS_USD circuit breaker.
// Once cumulative realized losses reach the cap, the bot must stop opening
// new positions and the caller is expected to halt entirely.
export class RiskManager {
  constructor(state) {
    this.state = state;
  }

  isHalted() {
    return this.state.halted;
  }

  canOpenNewPosition() {
    if (this.state.halted) return false;
    const openCount = Object.keys(this.state.positions).length;
    return openCount < config.maxOpenPositions;
  }

  async recordRealizedPnlSol(pnlSol) {
    const solUsd = await getSolUsdPrice();
    const pnlUsd = pnlSol * solUsd;
    if (pnlUsd < 0) {
      this.state.realizedLossUsd += -pnlUsd;
    } else {
      this.state.realizedGainUsd += pnlUsd;
    }

    logger.trade("Realized P&L recorded", {
      pnlSol,
      pnlUsd: Number(pnlUsd.toFixed(4)),
      cumulativeLossUsd: Number(this.state.realizedLossUsd.toFixed(4)),
      cumulativeGainUsd: Number(this.state.realizedGainUsd.toFixed(4)),
    });

    if (this.state.realizedLossUsd >= config.maxTotalLossUsd && !this.state.halted) {
      this.state.halted = true;
      this.state.haltedReason = `Cumulative realized loss of $${this.state.realizedLossUsd.toFixed(
        2
      )} reached the $${config.maxTotalLossUsd} cap`;
      logger.error("CIRCUIT BREAKER TRIPPED — halting all trading", {
        reason: this.state.haltedReason,
      });
    }
  }
}
