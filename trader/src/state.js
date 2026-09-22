import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";

const dataDir = join(config.root, "data");
mkdirSync(dataDir, { recursive: true });
const statePath = join(dataDir, "state.json");

function defaultState() {
  return {
    // mint -> { costSol, qtyTokens, entryPriceSol, graduated, openedAt }
    positions: {},
    // sum of realized losses in USD (positive number = money lost)
    realizedLossUsd: 0,
    // sum of realized gains in USD
    realizedGainUsd: 0,
    halted: false,
    haltedReason: null,
  };
}

export function loadState() {
  if (!existsSync(statePath)) return defaultState();
  try {
    return { ...defaultState(), ...JSON.parse(readFileSync(statePath, "utf8")) };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}
