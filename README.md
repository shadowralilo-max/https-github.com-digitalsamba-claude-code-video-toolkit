# Ponscat ($PCAT)

A cat that watches the charts so you don't have to. No utility promises, no
roadmap PDF — just a chart-obsessed cat and a community that likes green
candles. Built by Crypto Seekers Nation.

This is a static, no-build-step site: a landing page plus a "live-ish"
dashboard (price, market cap, candlestick chart) that runs on mock data until
the token launches, then switches to real on-chain data with a one-line config
change.

This repo holds two independent static sites:

- **`/` (this site)** — the Ponscat marketing/landing page.
- **`/bagchase`** — **Bag Chase**, a standalone Ponscat-branded 2D game
  (grow the cat by eating memecoins, dodge `$RUG`) meant to be deployed on
  its own domain or subdomain. See [`bagchase/README.md`](bagchase/README.md)
  for details. The marketing site's nav/hero "Play" links point at it via
  `LINKS.game` in `js/config.js` — fill that in once the game site is
  deployed, and the buttons activate automatically (they render
  disabled/greyed until then).

## Structure

```
index.html        # all page content/sections
css/style.css      # dark theme, layout, responsive rules
js/config.js       # token info, social links, data source switch
js/app.js          # wires config into the page + renders the chart
assets/            # mascot SVG, favicon
bagchase/          # standalone "Bag Chase" game site (own README)
```

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
2. Fill in `LINKS` (x, telegram, discord, dexscreener, buy, game) —
   disabled/greyed buttons activate automatically once a URL is present.
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
Pages, or any static host by pointing it at this directory (the repo root,
excluding `bagchase/`). Deploy `bagchase/` as its own separate site/project
(ideally its own subdomain, e.g. `play.ponscat.com`) — see its README.
