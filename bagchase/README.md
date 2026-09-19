# Ponscat Bag Chase

A standalone, static 2D game site: grow Ponscat by eating memecoins while
dodging `$RUG` traps and FUD clouds. Branded as Ponscat ($PCAT), but fully
independent of the main marketing site — deploy it on its own domain or
subdomain (e.g. `play.ponscat.com`) without needing the rest of the repo.

## Structure

```
index.html     # the whole site: nav, intro, game stage, footer
css/style.css  # shared branding styles (nav, buttons, footer, pill)
css/game.css   # game HUD, overlays, canvas stage
js/config.js   # token name/ticker + external links (main site, socials)
js/app.js      # wires config into the page (branding text, links, mobile nav)
js/game.js     # the game engine (canvas, vanilla JS, no dependencies)
assets/        # mascot SVG, favicon
```

## Running locally

No build tooling required:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Configuring

Edit `js/config.js`:

- `TOKEN.name` / `TOKEN.ticker` — swap if the token identity changes.
- `LINKS.mainSite` — URL of the main Ponscat marketing site. Until set, the
  "Main Site" buttons render disabled/greyed out.
- `LINKS.x` / `LINKS.telegram` / `LINKS.buy` — social/DEX links shown in nav.

## The game

- **Move**: WASD / arrow keys, or drag with mouse/finger.
- **Coins**: `$DOGO` (common), `$FROG` (uncommon), `$MOON` (rare, jittery),
  `$PCAT` (legendary) — each grows the cat and adds to your score.
- **`$RUG`**: disguised as a coin; touching it costs a life and some score.
- **FUD clouds**: drifting hazards that slow you down (no damage).
- 3 lives, endless mode, difficulty ramps over time, high score saved to
  `localStorage`.

## Deploying

Plain static files — deploy to GitHub Pages, Netlify, Vercel, Cloudflare
Pages, or any static host by pointing it at this `bagchase/` directory.
