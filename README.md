# Ponscat ($PCAT)

A cat that watches the charts so you don't have to. No utility promises, no
roadmap PDF — just a chart-obsessed cat and a community that likes green
candles. Built by Crypto Seekers Nation.

This is a static, no-build-step site: a landing page plus a "live-ish"
dashboard (price, market cap, candlestick chart) that runs on mock data until
the token launches, then switches to real on-chain data with a one-line config
change.

## Structure

```
index.html        # all page content/sections
game.html          # "Bag Chase" mini-game page
css/style.css      # dark theme, layout, responsive rules
css/game.css       # game page/HUD/overlay styles
js/config.js       # token info, social links, data source switch
js/app.js          # wires config into the page + renders the chart
js/game.js         # Bag Chase game engine (canvas, vanilla JS)
assets/            # mascot SVG, favicon
```

## Bag Chase (mini-game)

`game.html` is a small 2D canvas game: grow Ponscat by eating memecoins.

- **Move**: WASD / arrow keys, or drag with mouse/finger.
- **Coins**: `$DOGO` (common), `$FROG` (uncommon), `$MOON` (rare, jittery),
  `$PCAT` (legendary) — each grows the cat and adds to your score.
- **`$RUG`**: disguised as a coin; touching it costs a life and some score.
- **FUD clouds**: drifting hazards that slow you down (no damage).
- 3 lives, endless mode, difficulty ramps over time, high score saved to
  `localStorage`. No dependencies — plain `<canvas>` + vanilla JS.

## Running locally

No build tooling required. Serve the folder with any static file server, e.g.:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Going live

Edit `js/config.js`:

1. Set `TOKEN.contractAddress` once the token is deployed — it appears in the
   hero CA box and enables the copy button automatically.
2. Fill in `LINKS` (x, telegram, discord, dexscreener, buy) — disabled/greyed
   social buttons activate automatically once a URL is present.
3. Set `DATA_SOURCE` to `"live"` and fill in `LIVE.chain` / `LIVE.pairAddress`
   (from the Dexscreener URL `dexscreener.com/<chain>/<pairAddress>`) to pull
   real price/market cap/liquidity/volume from Dexscreener's public API. The
   candlestick shapes stay illustrative (Dexscreener's pair endpoint doesn't
   return full OHLC history) — swap in a real charting API/embed if you want a
   fully accurate history.
4. Update `TOKEN.totalSupply` / `TOKEN.chain` and the tokenomics numbers in
   `index.html` (`#tokenomics`) to match the real launch parameters.

Until step 3, the dashboard clearly labels itself as demo data via the banner
above the stats.

## Deploying

It's plain static files — deploy to GitHub Pages, Netlify, Vercel, Cloudflare
Pages, or any static host by pointing it at this directory.
