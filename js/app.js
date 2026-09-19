(function () {
  const cfg = window.PONSCAT_CONFIG;

  // ---------- helpers ----------
  function fmtUsd(n, opts = {}) {
    if (n < 0.01) {
      return "$" + n.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    }
    return n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: opts.decimals ?? 2,
    });
  }

  function fmtCompact(n) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
  }

  function seededRandom(seed) {
    let s = seed;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  // ---------- mock data ----------
  function generateMockCandles(count, basePrice) {
    const rand = seededRandom(42);
    const candles = [];
    let price = basePrice;
    for (let i = 0; i < count; i++) {
      const open = price;
      const drift = (rand() - 0.42) * 0.06; // slight upward bias, meme-coin energy
      const close = Math.max(open * (1 + drift), basePrice * 0.2);
      const high = Math.max(open, close) * (1 + rand() * 0.03);
      const low = Math.min(open, close) * (1 - rand() * 0.03);
      candles.push({ open, high, low, close });
      price = close;
    }
    return candles;
  }

  function drawCandles(canvas, candles) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const allValues = candles.flatMap((c) => [c.high, c.low]);
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    const pad = (max - min) * 0.08 || max * 0.05;
    const scaledMax = max + pad;
    const scaledMin = min - pad;

    const slotW = w / candles.length;
    const bodyW = Math.max(2, slotW * 0.55);

    // gridlines
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    candles.forEach((c, i) => {
      const x = i * slotW + slotW / 2;
      const yFor = (v) => h - ((v - scaledMin) / (scaledMax - scaledMin)) * h;
      const up = c.close >= c.open;
      const color = up ? "#1ef07a" : "#ff5c5c";

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, yFor(c.high));
      ctx.lineTo(x, yFor(c.low));
      ctx.stroke();

      ctx.fillStyle = color;
      const bodyTop = yFor(Math.max(c.open, c.close));
      const bodyBottom = yFor(Math.min(c.open, c.close));
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, Math.max(1.5, bodyBottom - bodyTop));
    });
  }

  // ---------- live mode (stub, used once a real pair exists) ----------
  async function fetchLiveStats() {
    const { chain, pairAddress, endpoint } = cfg.LIVE;
    if (!chain || !pairAddress) return null;
    try {
      const res = await fetch(endpoint(chain, pairAddress));
      const data = await res.json();
      const pair = data?.pairs?.[0] ?? data?.pair;
      if (!pair) return null;
      return {
        price: parseFloat(pair.priceUsd),
        change24h: parseFloat(pair.priceChange?.h24 ?? 0),
        marketCap: parseFloat(pair.fdv ?? pair.marketCap ?? 0),
        liquidity: parseFloat(pair.liquidity?.usd ?? 0),
        volume24h: parseFloat(pair.volume?.h24 ?? 0),
      };
    } catch (err) {
      console.warn("Live fetch failed, falling back to mock data:", err);
      return null;
    }
  }

  // ---------- wire up page ----------
  function init() {
    // token identity
    document.querySelectorAll("[data-ticker]").forEach((el) => (el.textContent = cfg.TOKEN.ticker));
    document.querySelectorAll("[data-token-name]").forEach((el) => (el.textContent = cfg.TOKEN.name));
    document.querySelectorAll("[data-community-name]").forEach((el) => (el.textContent = cfg.COMMUNITY_NAME));
    document.querySelectorAll("[data-supply]").forEach((el) => (el.textContent = cfg.TOKEN.totalSupply));

    const caEl = document.getElementById("contract-address");
    const caBox = document.getElementById("ca-box");
    if (caEl) {
      if (cfg.TOKEN.contractAddress) {
        caEl.textContent = cfg.TOKEN.contractAddress;
      } else {
        caEl.textContent = "Not deployed yet — CA drops here at launch";
        caBox?.classList.add("pending");
      }
    }
    document.getElementById("copy-ca")?.addEventListener("click", () => {
      if (!cfg.TOKEN.contractAddress) return;
      navigator.clipboard?.writeText(cfg.TOKEN.contractAddress);
      const btn = document.getElementById("copy-ca");
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = original), 1500);
    });

    // socials
    const linkMap = {
      "link-x": cfg.LINKS.x,
      "link-telegram": cfg.LINKS.telegram,
      "link-discord": cfg.LINKS.discord,
      "link-dexscreener": cfg.LINKS.dexscreener,
      "link-buy": cfg.LINKS.buy,
      "link-x-footer": cfg.LINKS.x,
      "link-telegram-footer": cfg.LINKS.telegram,
      "link-game-nav": cfg.LINKS.game,
      "link-game-hero": cfg.LINKS.game,
    };
    Object.entries(linkMap).forEach(([id, url]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (url) {
        el.href = url;
        el.classList.remove("disabled");
        el.removeAttribute("aria-disabled");
      } else {
        el.setAttribute("aria-disabled", "true");
        el.classList.add("disabled");
        el.addEventListener("click", (e) => e.preventDefault());
      }
    });

    // mobile nav
    const menuToggle = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");
    menuToggle?.addEventListener("click", () => navLinks.classList.toggle("open"));

    // dashboard
    const banner = document.getElementById("mock-banner");
    const canvas = document.getElementById("price-chart");
    const priceNowEl = document.getElementById("price-now");
    const priceChangeEl = document.getElementById("price-change");
    const mcapEl = document.getElementById("stat-mcap");
    const liqEl = document.getElementById("stat-liquidity");
    const volEl = document.getElementById("stat-volume");
    const supplyEl = document.getElementById("stat-supply");

    const basePrice = 0.0000042;

    function renderMock() {
      if (banner) banner.style.display = "flex";
      const candles = generateMockCandles(48, basePrice);
      const last = candles[candles.length - 1];
      const first = candles[0];
      const change = ((last.close - first.open) / first.open) * 100;

      if (canvas) drawCandles(canvas, candles);
      if (priceNowEl) priceNowEl.textContent = fmtUsd(last.close, { decimals: 8 });
      if (priceChangeEl) {
        priceChangeEl.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
        priceChangeEl.className = "value " + (change >= 0 ? "up" : "down");
      }
      if (mcapEl) mcapEl.textContent = "$" + fmtCompact(last.close * 420_000_000_000);
      if (liqEl) liqEl.textContent = "$" + fmtCompact(38_400);
      if (volEl) volEl.textContent = "$" + fmtCompact(112_900);
      if (supplyEl) supplyEl.textContent = cfg.TOKEN.totalSupply;
    }

    async function renderLive() {
      const stats = await fetchLiveStats();
      if (!stats) {
        renderMock();
        return;
      }
      if (banner) banner.style.display = "none";
      const candles = generateMockCandles(48, stats.price); // real OHLC needs a charting API; placeholder shape
      if (canvas) drawCandles(canvas, candles);
      if (priceNowEl) priceNowEl.textContent = fmtUsd(stats.price, { decimals: 8 });
      if (priceChangeEl) {
        priceChangeEl.textContent = `${stats.change24h >= 0 ? "+" : ""}${stats.change24h.toFixed(2)}%`;
        priceChangeEl.className = "value " + (stats.change24h >= 0 ? "up" : "down");
      }
      if (mcapEl) mcapEl.textContent = "$" + fmtCompact(stats.marketCap);
      if (liqEl) liqEl.textContent = "$" + fmtCompact(stats.liquidity);
      if (volEl) volEl.textContent = "$" + fmtCompact(stats.volume24h);
      if (supplyEl) supplyEl.textContent = cfg.TOKEN.totalSupply;
    }

    if (cfg.DATA_SOURCE === "live") {
      renderLive();
      setInterval(renderLive, 30_000);
    } else {
      renderMock();
    }

    window.addEventListener("resize", () => {
      if (cfg.DATA_SOURCE !== "live") renderMock();
    });

    // timeframe tabs (visual only in mock mode)
    document.querySelectorAll(".timeframe-tabs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".timeframe-tabs button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        renderMock();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
