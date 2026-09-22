import { logger } from "./logger.js";

let cached = { price: null, at: 0 };
const CACHE_MS = 60_000;
const FALLBACK_SOL_USD = 150; // used only if the price API is unreachable

export async function getSolUsdPrice() {
  const now = Date.now();
  if (cached.price && now - cached.at < CACHE_MS) return cached.price;

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    if (!res.ok) throw new Error(`price API status ${res.status}`);
    const json = await res.json();
    const price = json?.solana?.usd;
    if (typeof price !== "number") throw new Error("unexpected price payload");
    cached = { price, at: now };
    return price;
  } catch (err) {
    logger.warn("Failed to fetch SOL/USD price, using fallback", {
      error: String(err),
      fallback: FALLBACK_SOL_USD,
    });
    return cached.price ?? FALLBACK_SOL_USD;
  }
}
