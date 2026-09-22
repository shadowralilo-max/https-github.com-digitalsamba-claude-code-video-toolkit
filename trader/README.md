# Meme Coin Auto Trader

An autonomous trading bot for meme coins on [AgentPump](https://agentpump.io)
(Solana bonding-curve launches + Raydium after graduation). It scans for
tokens, buys and sells on its own with **real SOL**, and enforces a hard
total-loss circuit breaker.

## ⚠️ Read this before funding the wallet

- This bot trades **real money autonomously**, once you set `LIVE_TRADING=true`.
  No trade is confirmed with you individually.
- Meme coins on bonding-curve launchpads are extremely volatile and commonly
  go to zero (rug pulls, abandoned launches, pure speculation). Assume any
  money you put in this wallet can be lost entirely and quickly.
- The one safety net this bot provides is a **hard cumulative realized-loss
  cap** (`MAX_TOTAL_LOSS_USD`, default **$2**). Once realized losses reach
  that amount, the bot halts itself and refuses to restart until you
  manually review `data/state.json`. This limits downside from *this bot's
  own trading logic* — it does not protect the unrealized value of open
  positions between poll cycles, and it does not protect against a total
  loss of a position that goes to zero before the bot can sell (bonding
  curves and thin liquidity can gap through your stop-loss).
- Only fund the wallet with an amount you are fully prepared to lose —
  a few dollars is plenty given the loss cap above.
- The private key for the trading wallet is held by the `agentpump-mcp`
  server, not by this app. Treat `npm run wallet -- export-key` output as
  extremely sensitive — anyone who sees it can drain the wallet.

## How it works

1. `src/mcpClient.js` spawns the same `agentpump-mcp` server already
   configured in this repo's `.mcp.json` and talks to it over MCP, using the
   same wallet/trading tools available to Claude Code sessions
   (`sol_buy`, `sol_sell`, `sol_raydium_buy`, `sol_raydium_sell`,
   `sol_list_tokens`, `sol_token_info`, `sol_balance`, ...).
2. `src/strategy.js` picks candidates: either a fixed `WATCHLIST_MINTS`
   list, or a scan of live bonding-curve listings filtered by graduation
   progress and optional name/symbol keywords. This is a deliberately
   simple, transparent default — not investment advice, and not tuned for
   profitability. Replace it if you have a better idea.
3. `src/riskManager.js` tracks realized P&L in USD (via a live SOL/USD
   price) and trips a circuit breaker at `MAX_TOTAL_LOSS_USD`.
4. `src/index.js` runs the loop: check exits on open positions
   (take-profit / stop-loss), then look for new entries if under the
   position cap and the circuit breaker hasn't tripped.

All trades and P&L events are logged to `data/trades.log` (one JSON object
per line) and console. Position and P&L state persists in `data/state.json`
so the bot can be restarted safely.

## Setup

```bash
cd trader
npm install
cp .env.example .env
```

Edit `.env` — at minimum review `MAX_TOTAL_LOSS_USD` and `PER_TRADE_SOL`.
Leave `LIVE_TRADING=false` for your first run.

Set up the wallet:

```bash
npm run wallet
```

This creates a wallet (first run) and prints its address. Send a small
amount of SOL to that address — enough to cover a few trades at
`PER_TRADE_SOL` plus network fees, and comfortable to lose entirely.

Dry run first (no real funds move, uses live market data):

```bash
npm start
```

Watch `data/trades.log` for a while and sanity-check the decisions it's
making. When ready to go live:

```bash
# in .env
LIVE_TRADING=true
```

```bash
npm start
```

Stop any time with Ctrl+C — it finishes the current cycle and exits without
forcing a sell of open positions. To pull funds back out:

```bash
npm run wallet -- withdraw <your-address>
```

## Resetting after a halt

If the circuit breaker trips, the bot refuses to start again until you
review `data/state.json` (it records `halted: true` and `haltedReason`).
Decide what to do with any still-open positions manually, then either
delete `data/state.json` or edit it (e.g. set `"halted": false`) once
you've adjusted your strategy or risk limits.

## Configuration reference

See `.env.example` for every option: position size, take-profit/stop-loss
percentages, max concurrent positions, poll interval, and candidate
filters (bonding-curve progress range, name keywords, or a fixed
watchlist).
