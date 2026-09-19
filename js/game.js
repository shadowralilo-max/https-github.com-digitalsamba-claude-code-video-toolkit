// Ponscat Bag Chase — a 2D canvas game where the cat eats memecoins to grow.
// Vanilla JS, no dependencies, no build step.
(function () {
  "use strict";

  const canvas = document.getElementById("game-canvas");
  if (!canvas) return; // not on the game page
  const ctx = canvas.getContext("2d");

  const stageWrap = document.getElementById("stage-wrap");
  const hudScore = document.getElementById("hud-score");
  const hudBest = document.getElementById("hud-best");
  const hudLevel = document.getElementById("hud-level");
  const hudLives = document.getElementById("hud-lives");
  const hudTime = document.getElementById("hud-time");
  const levelToast = document.getElementById("level-toast");

  const overlayStart = document.getElementById("overlay-start");
  const overlayPause = document.getElementById("overlay-pause");
  const overlayGameOver = document.getElementById("overlay-gameover");
  const btnStart = document.getElementById("btn-start");
  const btnResume = document.getElementById("btn-resume");
  const btnRetry = document.getElementById("btn-retry");
  const gameoverTitle = document.getElementById("gameover-title");
  const gameoverSub = document.getElementById("gameover-sub");
  const finalScoreEl = document.getElementById("final-score");
  const finalLevelEl = document.getElementById("final-level");
  const finalBestEl = document.getElementById("final-best");

  const HIGH_SCORE_KEY = "ponscat_game_highscore";
  const MAX_LIVES = 3;

  const LEVELS = [
    { min: 0, name: "Kitten" },
    { min: 20, name: "Cat" },
    { min: 60, name: "Chonky Cat" },
    { min: 140, name: "Big Chonk" },
    { min: 280, name: "Legendary Chonk" },
  ];

  const COIN_TYPES = [
    { id: "dogo", label: "$DOGO", color: "#f2a93b", ring: "#c97f12", value: 1, radius: 11, weight: 52, jitter: 0 },
    { id: "frog", label: "$FROG", color: "#3ddc84", ring: "#1a8f4c", value: 3, radius: 13, weight: 26, jitter: 0.4 },
    { id: "moon", label: "$MOON", color: "#6fb1ff", ring: "#2f6fd6", value: 7, radius: 15, weight: 13, jitter: 1.1 },
    { id: "pcat", label: "$PCAT", color: "#1ef07a", ring: "#0a3d24", value: 15, radius: 18, weight: 4, jitter: 0.8, glow: true },
  ];
  const RUG_TYPE = { id: "rug", label: "$RUG", color: "#c23b3b", ring: "#ff5c5c", value: 0, radius: 13, weight: 0 };

  function getLevel(score) {
    let current = LEVELS[0];
    for (const lvl of LEVELS) {
      if (score >= lvl.min) current = lvl;
    }
    return current;
  }

  function loadBest() {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  }
  function saveBest(n) {
    localStorage.setItem(HIGH_SCORE_KEY, String(n));
  }

  // ---------- canvas sizing ----------
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let width = 0;
  let height = 0;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.player) {
      state.player.x = Math.min(state.player.x, width - state.player.radius);
      state.player.y = Math.min(state.player.y, height - state.player.radius);
    }
  }

  // ---------- state ----------
  const state = {
    mode: "start", // start | playing | paused | gameover
    score: 0,
    best: loadBest(),
    lives: MAX_LIVES,
    elapsed: 0,
    lastLevelName: LEVELS[0].name,
    player: null,
    coins: [],
    fuds: [],
    particles: [],
    keys: Object.create(null),
    pointer: { active: false, x: 0, y: 0 },
    coinTimer: 0,
    fudTimer: 0,
    invulnTimer: 0,
    shake: 0,
    slowTimer: 0,
  };

  function makePlayer() {
    return {
      x: width / 2,
      y: height / 2,
      vx: 0,
      vy: 0,
      radius: 18,
      facing: 1,
      hitFlash: 0,
    };
  }

  function playerMaxRadius() {
    return Math.min(width, height) * 0.16;
  }

  function updatePlayerSize() {
    const p = state.player;
    const target = 18 + Math.min(playerMaxRadius() - 18, Math.sqrt(state.score) * 2.6);
    p.radius += (target - p.radius) * 0.12;
  }

  function playerMaxSpeed() {
    const p = state.player;
    return Math.max(1.9, 4.7 - (p.radius - 18) * 0.028) * (state.slowTimer > 0 ? 0.45 : 1);
  }

  // ---------- spawning ----------
  function weightedPick(list) {
    const total = list.reduce((sum, t) => sum + t.weight, 0);
    let r = Math.random() * total;
    for (const item of list) {
      if (r < item.weight) return item;
      r -= item.weight;
    }
    return list[list.length - 1];
  }

  function rugWeight() {
    return Math.min(30, 8 + state.elapsed * 0.35);
  }

  function spawnCoin() {
    const pool = COIN_TYPES.concat([{ ...RUG_TYPE, weight: rugWeight() }]);
    const type = weightedPick(pool);
    const margin = type.radius + 6;
    const x = margin + Math.random() * (width - margin * 2);
    const y = margin + Math.random() * (height - margin * 2);
    state.coins.push({
      type,
      x,
      y,
      baseX: x,
      baseY: y,
      born: state.elapsed,
      wobbleSeed: Math.random() * Math.PI * 2,
      scale: 0,
    });
  }

  function spawnFud() {
    const r = 26 + Math.random() * 10;
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    if (edge === 0) { x = -r; y = Math.random() * height; }
    else if (edge === 1) { x = width + r; y = Math.random() * height; }
    else if (edge === 2) { x = Math.random() * width; y = -r; }
    else { x = Math.random() * width; y = height + r; }
    const speed = 0.5 + Math.min(1.2, state.elapsed * 0.01);
    const angle = Math.atan2(height / 2 - y, width / 2 - x) + (Math.random() - 0.5) * 1.2;
    state.fuds.push({
      x, y, radius: r,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }

  function spawnParticle(x, y, text, color) {
    state.particles.push({ x, y, text, color, life: 1, vy: -0.6 });
  }

  // ---------- lifecycle ----------
  function resetGame() {
    state.score = 0;
    state.lives = MAX_LIVES;
    state.elapsed = 0;
    state.coins = [];
    state.fuds = [];
    state.particles = [];
    state.coinTimer = 0;
    state.fudTimer = 2; // grace period before first FUD cloud
    state.invulnTimer = 1.2;
    state.slowTimer = 0;
    state.shake = 0;
    state.lastLevelName = LEVELS[0].name;
    state.player = makePlayer();
    updateHud();
  }

  function startGame() {
    resetGame();
    state.mode = "playing";
    overlayStart.classList.add("hidden");
    overlayPause.classList.add("hidden");
    overlayGameOver.classList.add("hidden");
  }

  function pauseGame() {
    if (state.mode !== "playing") return;
    state.mode = "paused";
    overlayPause.classList.remove("hidden");
  }

  function resumeGame() {
    if (state.mode !== "paused") return;
    state.mode = "playing";
    overlayPause.classList.add("hidden");
  }

  function endGame() {
    state.mode = "gameover";
    const level = getLevel(state.score);
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
      gameoverTitle.textContent = "New high score!";
      gameoverSub.textContent = "Rugged, but you set a new record on the way down.";
    } else {
      gameoverTitle.textContent = "Rugged.";
      gameoverSub.textContent = "You got rug-pulled one too many times.";
    }
    finalScoreEl.textContent = String(state.score);
    finalLevelEl.textContent = level.name;
    finalBestEl.textContent = String(state.best);
    overlayGameOver.classList.remove("hidden");
    updateHud();
  }

  // ---------- input ----------
  const MOVE_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"]);
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (MOVE_KEYS.has(k)) {
      state.keys[k] = true;
      e.preventDefault();
    }
    if (k === "p" || k === "escape") {
      if (state.mode === "playing") pauseGame();
      else if (state.mode === "paused") resumeGame();
    }
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (MOVE_KEYS.has(k)) state.keys[k] = false;
  });

  function canvasPointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches && e.touches[0];
    const clientX = t ? t.clientX : e.clientX;
    const clientY = t ? t.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function onPointerDown(e) {
    state.pointer.active = true;
    const p = canvasPointFromEvent(e);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
  }
  function onPointerMove(e) {
    if (!state.pointer.active) return;
    const p = canvasPointFromEvent(e);
    state.pointer.x = p.x;
    state.pointer.y = p.y;
    e.preventDefault();
  }
  function onPointerUp() {
    state.pointer.active = false;
  }

  canvas.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);
  canvas.addEventListener("touchstart", onPointerDown, { passive: true });
  canvas.addEventListener("touchmove", onPointerMove, { passive: false });
  canvas.addEventListener("touchend", onPointerUp);

  window.addEventListener("blur", () => pauseGame());

  btnStart.addEventListener("click", startGame);
  btnResume.addEventListener("click", resumeGame);
  btnRetry.addEventListener("click", startGame);

  // ---------- update ----------
  function updatePlayer(dt) {
    const p = state.player;
    const accel = 0.9;
    let ax = 0, ay = 0;

    if (state.keys["w"] || state.keys["arrowup"]) ay -= 1;
    if (state.keys["s"] || state.keys["arrowdown"]) ay += 1;
    if (state.keys["a"] || state.keys["arrowleft"]) ax -= 1;
    if (state.keys["d"] || state.keys["arrowright"]) ax += 1;

    if (ax !== 0 || ay !== 0) {
      const len = Math.hypot(ax, ay) || 1;
      p.vx += (ax / len) * accel;
      p.vy += (ay / len) * accel;
    } else if (state.pointer.active) {
      const dx = state.pointer.x - p.x;
      const dy = state.pointer.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        p.vx += (dx / dist) * accel;
        p.vy += (dy / dist) * accel;
      }
    }

    p.vx *= 0.9;
    p.vy *= 0.9;
    const maxSpeed = playerMaxSpeed();
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > maxSpeed) {
      p.vx = (p.vx / speed) * maxSpeed;
      p.vy = (p.vy / speed) * maxSpeed;
    }

    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.x = Math.max(p.radius, Math.min(width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(height - p.radius, p.y));

    if (Math.abs(p.vx) > 0.05) p.facing = p.vx > 0 ? 1 : -1;
    if (p.hitFlash > 0) p.hitFlash -= dt;
    updatePlayerSize();
  }

  function updateCoins(dt) {
    state.coinTimer -= dt;
    const spawnInterval = Math.max(0.35, 1.1 - state.elapsed * 0.004);
    if (state.coinTimer <= 0 && state.coins.length < 14) {
      spawnCoin();
      state.coinTimer = spawnInterval;
    }

    const p = state.player;
    for (let i = state.coins.length - 1; i >= 0; i--) {
      const c = state.coins[i];
      if (c.scale < 1) c.scale = Math.min(1, c.scale + dt * 6);

      if (c.type.jitter > 0) {
        c.x = c.baseX + Math.sin(state.elapsed * 1.6 + c.wobbleSeed) * 10 * c.type.jitter;
        c.y = c.baseY + Math.cos(state.elapsed * 1.3 + c.wobbleSeed) * 10 * c.type.jitter;
      }

      const dist = Math.hypot(p.x - c.x, p.y - c.y);
      if (dist < p.radius + c.type.radius * c.scale - 4) {
        if (c.type.id === "rug") {
          hitRug(c);
        } else {
          eatCoin(c);
        }
        state.coins.splice(i, 1);
      }
    }
  }

  function eatCoin(c) {
    state.score += c.type.value;
    spawnParticle(c.x, c.y, "+" + c.type.value, c.type.color);
    maybeAnnounceLevel();
  }

  function hitRug(c) {
    if (state.invulnTimer > 0) return;
    state.lives -= 1;
    state.invulnTimer = 1.4;
    state.shake = 0.35;
    state.player.hitFlash = 0.4;
    const lost = Math.min(state.score, 5 + Math.floor(state.score * 0.1));
    state.score = Math.max(0, state.score - lost);
    spawnParticle(c.x, c.y, lost > 0 ? "-" + lost : "RUGGED", RUG_TYPE.ring);
    if (state.lives <= 0) {
      endGame();
    }
  }

  function updateFuds(dt) {
    state.fudTimer -= dt;
    const spawnInterval = Math.max(2.6, 6 - state.elapsed * 0.03);
    if (state.fudTimer <= 0) {
      spawnFud();
      state.fudTimer = spawnInterval;
    }
    const p = state.player;
    state.slowTimer = Math.max(0, state.slowTimer - dt);
    for (let i = state.fuds.length - 1; i >= 0; i--) {
      const f = state.fuds[i];
      f.x += f.vx * dt * 60;
      f.y += f.vy * dt * 60;
      if (f.x < -80 || f.x > width + 80 || f.y < -80 || f.y > height + 80) {
        state.fuds.splice(i, 1);
        continue;
      }
      const dist = Math.hypot(p.x - f.x, p.y - f.y);
      if (dist < p.radius + f.radius - 6) {
        state.slowTimer = 1.1;
      }
    }
  }

  function maybeAnnounceLevel() {
    const level = getLevel(state.score);
    if (level.name !== state.lastLevelName) {
      state.lastLevelName = level.name;
      showLevelToast(`🐾 Ranked up: ${level.name}!`);
    }
  }

  let toastTimer = null;
  function showLevelToast(text) {
    levelToast.textContent = text;
    levelToast.classList.remove("hidden");
    requestAnimationFrame(() => levelToast.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      levelToast.classList.remove("show");
      setTimeout(() => levelToast.classList.add("hidden"), 250);
    }, 1600);
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const pt = state.particles[i];
      pt.life -= dt * 1.1;
      pt.y += pt.vy;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
  }

  function update(dt) {
    if (state.mode !== "playing") return;
    state.elapsed += dt;
    if (state.invulnTimer > 0) state.invulnTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

    updatePlayer(dt);
    updateCoins(dt);
    updateFuds(dt);
    updateParticles(dt);
    updateHud();
  }

  // ---------- render ----------
  function drawBackground() {
    ctx.fillStyle = "#0b0d11";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  function drawCoin(c) {
    const r = c.type.radius * c.scale;
    if (r <= 0) return;
    ctx.save();
    ctx.translate(c.x, c.y);
    if (c.type.glow) {
      ctx.shadowColor = c.type.color;
      ctx.shadowBlur = 16;
    }
    if (c.type.id === "rug") {
      ctx.setLineDash([4, 3]);
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = c.type.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = c.type.ring;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0b0d11";
    ctx.font = `700 ${Math.max(7, r * 0.42)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.type.label.replace("$", ""), 0, 1);
    ctx.restore();
  }

  function drawFud(f) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#8b93a1";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(f.x + (i - 1) * f.radius * 0.5, f.y + (i % 2 === 0 ? 4 : -4), f.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.85;
    ctx.font = `${f.radius * 0.7}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#dfe3e8";
    ctx.fillText("FUD", f.x, f.y);
    ctx.restore();
  }

  function drawPlayer() {
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.facing, 1);

    if (p.hitFlash > 0) {
      ctx.shadowColor = "#ff5c5c";
      ctx.shadowBlur = 20;
    } else if (state.invulnTimer > 0 && Math.floor(state.elapsed * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const r = p.radius;
    // tail
    ctx.strokeStyle = "#1ef07a";
    ctx.lineWidth = Math.max(3, r * 0.18);
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, r * 0.2);
    ctx.quadraticCurveTo(-r * 1.6, r * 0.4, -r * 1.3, -r * 0.6);
    ctx.stroke();

    // ears
    ctx.fillStyle = "#17c968";
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.75);
    ctx.lineTo(-r * 0.1, -r * 1.3);
    ctx.lineTo(r * 0.05, -r * 0.65);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.75);
    ctx.lineTo(r * 0.1, -r * 1.3);
    ctx.lineTo(-r * 0.05, -r * 0.65);
    ctx.closePath();
    ctx.fill();

    // body
    ctx.fillStyle = "#1ef07a";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // face
    ctx.fillStyle = "#062114";
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.1, Math.max(1.5, r * 0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.32, -r * 0.1, Math.max(1.5, r * 0.09), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, r * 0.12);
    ctx.lineTo(-r * 0.12, r * 0.28);
    ctx.lineTo(r * 0.12, r * 0.28);
    ctx.closePath();
    ctx.fill();

    // crown accessory for top rank
    if (state.lastLevelName === "Legendary Chonk") {
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 1.05);
      ctx.lineTo(-r * 0.4, -r * 1.45);
      ctx.lineTo(-r * 0.18, -r * 1.15);
      ctx.lineTo(0, -r * 1.55);
      ctx.lineTo(r * 0.18, -r * 1.15);
      ctx.lineTo(r * 0.4, -r * 1.45);
      ctx.lineTo(r * 0.4, -r * 1.05);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    ctx.textAlign = "center";
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillStyle = pt.color;
      ctx.font = "700 14px 'Space Grotesk', sans-serif";
      ctx.fillText(pt.text, pt.x, pt.y);
    }
    ctx.restore();
  }

  function render() {
    ctx.save();
    if (state.shake > 0) {
      const mag = state.shake * 8;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    drawBackground();
    for (const c of state.coins) drawCoin(c);
    for (const f of state.fuds) drawFud(f);
    if (state.player) drawPlayer();
    drawParticles();
    ctx.restore();
  }

  // ---------- HUD ----------
  function updateHud() {
    hudScore.textContent = String(state.score);
    hudBest.textContent = String(Math.max(state.best, state.score));
    hudLevel.textContent = getLevel(state.score).name;
    hudLives.innerHTML =
      '<span style="color:var(--green)">' + "●".repeat(Math.max(0, state.lives)) + "</span>" +
      '<span style="color:var(--text-dim)">' + "○".repeat(Math.max(0, MAX_LIVES - state.lives)) + "</span>";
    hudTime.textContent = Math.floor(state.elapsed) + "s";
  }

  // ---------- main loop ----------
  let lastTs = performance.now();
  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    update(dt);
    if (width && height) render();
    requestAnimationFrame(loop);
  }

  function init() {
    resizeCanvas();
    state.player = makePlayer();
    hudBest.textContent = String(state.best);
    window.addEventListener("resize", resizeCanvas);
    if (window.ResizeObserver && stageWrap) {
      new ResizeObserver(resizeCanvas).observe(stageWrap);
    }
    requestAnimationFrame(loop);
  }

  init();
})();
