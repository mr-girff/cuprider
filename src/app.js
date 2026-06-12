/* CupRider — Main App + Canvas Game Engine */

let featuredTracks = {};
let legendaryTracks = {};
let allTracks = {};
let currentGame = null;

/* ── LOADING STATE ── */

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.add('hidden');
}

/* ── STATS COUNTER ANIMATION ── */

function animateStats() {
  const targets = [
    { el: document.getElementById('stat-rides'), target: 12847, prefix: '' },
    { el: document.getElementById('stat-goals'), target: 94211, prefix: '⚽ ' },
    { el: document.getElementById('stat-crashes'), target: 38419, prefix: '' }
  ];
  const duration = 2000;
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
    for (const { el, target, prefix } of targets) {
      if (el) el.textContent = prefix + Math.floor(ease * target).toLocaleString();
    }
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ── DATA LOADING ── */

async function loadData() {
  try {
    const [fRes, lRes] = await Promise.all([
      fetch('/data/featured-tracks.json'),
      fetch('/data/legendary-crashes.json')
    ]);
    if (!fRes.ok) throw new Error(`Featured tracks fetch failed: ${fRes.status}`);
    if (!lRes.ok) throw new Error(`Legendary crashes fetch failed: ${lRes.status}`);
    featuredTracks = await fRes.json();
    legendaryTracks = await lRes.json();
  } catch (err) {
    console.error('CupRider data load error:', err);
    document.getElementById('ticker-grid').innerHTML = '<p style="grid-column:1/-1;color:var(--negative);padding:2rem;text-align:center">⚠️ Failed to load tracks. Please try refreshing.</p>';
    document.getElementById('crash-grid').innerHTML = '';
    hideLoading();
    return;
  }
  allTracks = { ...featuredTracks, ...legendaryTracks };
  renderGrid('ticker-grid', featuredTracks);
  renderGrid('crash-grid', legendaryTracks);
  setupSearch();
  setDailyChallenge();
  hideLoading();
  animateStats();
}

/* ── RENDER CARDS ── */

function generateSVGChart(dataPoints, isPositive) {
  const values = dataPoints.map(d => d.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 280, h = 70;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h * 0.85 - h * 0.05).toFixed(1)}`).join(' ');
  const color = isPositive ? '#5DCAA5' : '#E24B4A';
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function badgeClass(difficulty) {
  return 'badge badge-' + difficulty.toLowerCase();
}

function renderGrid(containerId, data) {
  const grid = document.getElementById(containerId);
  grid.innerHTML = '';
  for (const [key, track] of Object.entries(data)) {
    const perf = track.performance;
    const isPositive = typeof perf === 'string' ? !perf.startsWith('-') : perf >= 0;
    const card = document.createElement('div');
    card.className = 'ticker-card';
    card.dataset.ticker = key;
    card.onclick = () => startGame(key);
    card.innerHTML = `
      <div class="ticker-header">
        <span class="ticker-name"><span class="ticker-flag">${track.flag || '⚽'}</span>${track.symbol}</span>
        <span class="${badgeClass(track.difficulty)}">${track.difficulty}</span>
      </div>
      <div class="ticker-chart">${generateSVGChart(track.dataPoints, isPositive)}</div>
      <div class="ticker-subtitle">${track.subtitle}</div>
    `;
    grid.appendChild(card);
  }
}

/* ── SEARCH ── */

function setupSearch() {
  const input = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q) { dropdown.classList.add('hidden'); return; }
    const matches = Object.entries(allTracks).filter(([k, v]) =>
      k.toLowerCase().includes(q) || v.name.toLowerCase().includes(q) || (v.subtitle || '').toLowerCase().includes(q)
    ).slice(0, 8);

    if (!matches.length) { dropdown.classList.add('hidden'); return; }
    dropdown.classList.remove('hidden');
    dropdown.innerHTML = matches.map(([k, v]) => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.dataset.trackKey = k;
      item.innerHTML = `${v.flag || '⚽'} <strong>${v.symbol}</strong> — ${v.name}`;
      return item.outerHTML;
    }).join('');

    dropdown.querySelectorAll('.search-item').forEach(el => {
      el.addEventListener('click', () => startGame(el.dataset.trackKey));
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-section')) dropdown.classList.add('hidden');
  });
}

function handleSearch(e) {
  e.preventDefault();
  const q = document.getElementById('search-input').value.trim().toUpperCase();
  if (allTracks[q]) startGame(q);
  else {
    const first = Object.keys(allTracks).find(k => k.includes(q));
    if (first) startGame(first);
    else alert('Track not found! Try ARG, MESSI, BRA, WC2022...');
  }
}

/* ── SOUND ENGINE (Web Audio API, no files) ── */

let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playBeep(freq, duration, type = 'square', volume = 0.1) {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) { /* audio not supported */ }
}

function playJump() { playBeep(440, 0.1, 'sine', 0.08); }
function playGoal() {
  playBeep(523, 0.15, 'sine', 0.12);
  setTimeout(() => playBeep(659, 0.15, 'sine', 0.1), 150);
  setTimeout(() => playBeep(784, 0.2, 'sine', 0.12), 300);
}
function playCrash() { playBeep(150, 0.3, 'sawtooth', 0.15); }
function playFinish() {
  playBeep(523, 0.1, 'sine', 0.1);
  setTimeout(() => playBeep(659, 0.1, 'sine', 0.1), 100);
  setTimeout(() => playBeep(784, 0.1, 'sine', 0.1), 200);
  setTimeout(() => playBeep(1047, 0.3, 'sine', 0.12), 300);
}

/* ── DAILY CHALLENGE ROTATION ── */

function setDailyChallenge() {
  const keys = Object.keys(allTracks);
  if (!keys.length) return;
  // Deterministic pick based on date (YYYY-MM-DD hash)
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const hash = dateStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const dailyKey = keys[hash % keys.length];
  const track = allTracks[dailyKey];
  if (!track) return;

  document.getElementById('daily-ticker').textContent = `${track.flag || '⚽'} ${track.symbol} · ${track.subtitle}`;
  document.getElementById('daily-meta').textContent = `${track.difficulty} difficulty · ${track.category}`;
  const cta = document.getElementById('daily-cta');
  cta.onclick = () => startGame(dailyKey);
}

/* ── GAME CONTROLS HINT ── */

function showControlsHint(canvas) {
  const hint = document.createElement('div');
  hint.className = 'controls-hint';
  const isMobile = 'ontouchstart' in window;
  hint.innerHTML = isMobile
    ? 'Tap to jump'
    : '<span>↑ / Space / W — Jump</span><span class="hint-sep">·</span><span>↓ / S — Brake</span>';
  hint.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    background:rgba(17,17,20,0.9);border:1px solid rgba(46,204,113,0.3);
    border-radius:12px;padding:12px 24px;color:#e8e8ed;font-family:DM Sans,sans-serif;
    font-size:0.9rem;font-weight:600;z-index:15;text-align:center;
    transition:opacity 0.4s;pointer-events:none;
    display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;
  `;
  canvas.parentElement.appendChild(hint);
  setTimeout(() => { hint.style.opacity = '0'; setTimeout(() => hint.remove(), 400); }, 2500);
}

/* ── GAME ENGINE (Canvas 2D + Simple Physics) ── */

class CupRiderGame {
  constructor(canvas, trackData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.track = trackData;
    this.running = false;
    this.score = 0;
    this.speed = 3;
    this.cameraX = 0;
    this.goalCount = 0;

    this.heights = trackData.dataPoints.map(d => d.close);
    const min = Math.min(...this.heights);
    const max = Math.max(...this.heights);
    const range = max - min || 1;
    this.normalizedHeights = this.heights.map(v => 0.15 + ((v - min) / range) * 0.65);

    this.segmentWidth = 30;
    this.totalWidth = this.normalizedHeights.length * this.segmentWidth;

    this.rider = {
      x: 100,
      groundIndex: 0,
      y: 0,
      vy: 0,
      angle: 0,
      onGround: true,
      crashed: false
    };

    this.particles = [];
    this.goalThresholds = [];
    for (let i = 1; i < this.normalizedHeights.length; i++) {
      const diff = Math.abs(this.normalizedHeights[i] - this.normalizedHeights[i - 1]);
      if (diff > 0.08 && Math.random() > 0.6) {
        this.goalThresholds.push(i * this.segmentWidth);
      }
    }
    this.triggeredGoals = new Set();

    this.keys = { up: false, down: false };
    this.touchActive = false;

    this.handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') this.keys.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') this.keys.down = true;
    };
    this.handleKeyUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') this.keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') this.keys.down = false;
    };
    this.handleTouchStart = () => { this.keys.up = true; this.touchActive = true; };
    this.handleTouchEnd = () => { this.keys.up = false; this.touchActive = false; };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    canvas.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    canvas.addEventListener('mousedown', this.handleTouchStart);
    canvas.addEventListener('mouseup', this.handleTouchEnd);
  }

  resize() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight - 60;
  }

  getGroundY(worldX) {
    const idx = worldX / this.segmentWidth;
    const i = Math.floor(idx);
    const t = idx - i;
    if (i < 0) return this.canvas.height * (1 - this.normalizedHeights[0]);
    if (i >= this.normalizedHeights.length - 1) return this.canvas.height * (1 - this.normalizedHeights[this.normalizedHeights.length - 1]);
    const a = this.normalizedHeights[i];
    const b = this.normalizedHeights[i + 1];
    return this.canvas.height * (1 - (a + (b - a) * t));
  }

  getGroundAngle(worldX) {
    const y1 = this.getGroundY(worldX - 2);
    const y2 = this.getGroundY(worldX + 2);
    return Math.atan2(y2 - y1, 4);
  }

  start() {
    this.running = true;
    this.resize();
    this.rider.y = this.getGroundY(this.rider.x + this.cameraX);
    this.loop();
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.render();
    requestAnimationFrame(() => this.loop());
  }

  update() {
    if (this.rider.crashed) return;

    this.speed = Math.max(2, Math.min(8, this.speed + (this.keys.down ? -0.1 : 0.02)));
    this.cameraX += this.speed;
    this.score += Math.floor(this.speed * 2);

    const worldX = this.rider.x + this.cameraX;
    const groundY = this.getGroundY(worldX);
    const groundAngle = this.getGroundAngle(worldX);

    if (this.keys.up && this.rider.onGround) {
      this.rider.vy = -12;
      this.rider.onGround = false;
      playJump();
    }

    if (!this.rider.onGround) {
      this.rider.vy += 0.6;
      this.rider.y += this.rider.vy;

      if (this.rider.y >= groundY) {
        this.rider.y = groundY;
        const landingAngle = Math.abs(this.rider.angle - groundAngle);
        if (landingAngle > 1.2 || (this.rider.vy > 18)) {
          this.crash();
          return;
        }
        this.rider.vy = 0;
        this.rider.onGround = true;
        this.spawnParticles(worldX, groundY, '#4CAF50', 5);
      }
    } else {
      this.rider.y = groundY;
      const steepness = Math.abs(groundAngle);
      if (steepness > 1.1 && this.speed > 5) {
        this.crash();
        return;
      }
    }

    this.rider.angle = this.rider.onGround ? groundAngle : this.rider.angle + (this.keys.up ? -0.04 : 0.02);

    for (const gx of this.goalThresholds) {
      if (!this.triggeredGoals.has(gx) && worldX > gx) {
        this.triggeredGoals.add(gx);
        this.goalCount++;
        this.score += 5000;
        this.showGoalEffect();
        playGoal();
        this.spawnParticles(this.rider.x, this.rider.y, '#FFD700', 15);
      }
    }

    if (this.cameraX + this.rider.x >= this.totalWidth) {
      this.finish();
      return;
    }

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= 0.03;
      return p.life > 0;
    });

    document.getElementById('game-score').textContent = this.score.toLocaleString();
    document.getElementById('game-speed').textContent = (this.speed * 15).toFixed(0) + ' km/h';
    document.getElementById('game-height').textContent = (100 - this.rider.y / this.canvas.height * 100).toFixed(0) + 'm';
  }

  render() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#0a0a0d';
    ctx.fillRect(0, 0, W, H);

    const grad = ctx.createLinearGradient(0, H * 0.3, 0, H);
    grad.addColorStop(0, 'rgba(27,94,32,0.0)');
    grad.addColorStop(1, 'rgba(27,94,32,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    for (let sx = -10; sx <= W + 10; sx += 2) {
      const worldX = sx + this.cameraX;
      const gy = this.getGroundY(worldX);
      if (sx === -10) ctx.moveTo(sx, gy);
      else ctx.lineTo(sx, gy);
    }
    ctx.lineTo(W + 10, H + 10);
    ctx.lineTo(-10, H + 10);
    ctx.closePath();

    const tGrad = ctx.createLinearGradient(0, 0, 0, H);
    tGrad.addColorStop(0, 'rgba(46,204,113,0.35)');
    tGrad.addColorStop(1, 'rgba(27,94,32,0.08)');
    ctx.fillStyle = tGrad;
    ctx.fill();

    ctx.strokeStyle = '#5DCAA5';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#4CAF50';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let sx = -10; sx <= W + 10; sx += 2) {
      const worldX = sx + this.cameraX;
      const gy = this.getGroundY(worldX);
      if (sx === -10) ctx.moveTo(sx, gy);
      else ctx.lineTo(sx, gy);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - this.cameraX + this.rider.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.rider.x, this.rider.y);
    ctx.rotate(this.rider.angle);

    ctx.shadowColor = '#4CAF50';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -18, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2ECC71';
    ctx.fillRect(-6, -10, 12, 14);

    ctx.fillStyle = '#333';
    ctx.fillRect(-10, 4, 8, 4);
    ctx.fillRect(2, 4, 8, 4);

    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(14, -5, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(14, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    const progress = Math.min(1, (this.cameraX + this.rider.x) / this.totalWidth);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(20, H - 20, W - 40, 4);
    ctx.fillStyle = '#5DCAA5';
    ctx.fillRect(20, H - 20, (W - 40) * progress, 4);
    ctx.fillStyle = '#fff';
    ctx.font = '10px DM Sans';
    ctx.fillText(`${(progress * 100).toFixed(0)}%`, 20 + (W - 40) * progress - 10, H - 24);
  }

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x, y, color,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 8,
        size: 2 + Math.random() * 3,
        life: 1
      });
    }
  }

  showGoalEffect() {
    const el = document.getElementById('goal-effect');
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    setTimeout(() => el.classList.add('hidden'), 1200);
  }

  crash() {
    this.rider.crashed = true;
    this.running = false;
    playCrash();
    this.spawnParticles(this.rider.x + this.cameraX, this.rider.y, '#E24B4A', 20);
    this.spawnParticles(this.rider.x + this.cameraX, this.rider.y, '#FFD700', 10);
    this.render();

    document.getElementById('game-over-title').textContent = '💥 CRASH!';
    document.getElementById('game-over-score').textContent = `Score: ${this.score.toLocaleString()} · Goals: ${this.goalCount}`;
    document.getElementById('game-over-overlay').classList.remove('hidden');
  }

  finish() {
    this.running = false;
    playFinish();
    this.score += 10000;
    document.getElementById('game-over-title').textContent = '🏆 TRACK COMPLETE!';
    document.getElementById('game-over-score').textContent = `Score: ${this.score.toLocaleString()} · Goals: ${this.goalCount}`;
    document.getElementById('game-over-overlay').classList.remove('hidden');
  }

  destroy() {
    this.running = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
    this.canvas.removeEventListener('mousedown', this.handleTouchStart);
    this.canvas.removeEventListener('mouseup', this.handleTouchEnd);
  }
}

/* ── GAME MANAGEMENT ── */

function startGame(trackKey) {
  const track = allTracks[trackKey];
  if (!track) return;

  if (currentGame) currentGame.destroy();

  document.getElementById('game-track-name').textContent = `${track.flag || '⚽'} ${track.symbol}`;
  document.getElementById('game-track-sub').textContent = track.subtitle;
  document.getElementById('game-over-overlay').classList.add('hidden');
  document.getElementById('goal-effect').classList.add('hidden');
  document.getElementById('game-modal').classList.remove('hidden');

  const canvas = document.getElementById('game-canvas');
  currentGame = new CupRiderGame(canvas, track);
  window._currentTrackKey = trackKey;

  setTimeout(() => {
    currentGame.start();
    showControlsHint(canvas);
  }, 200);
}

function closeGame() {
  document.getElementById('game-modal').classList.add('hidden');
  if (currentGame) { currentGame.destroy(); currentGame = null; }
}

function restartGame() {
  if (window._currentTrackKey) startGame(window._currentTrackKey);
}

const _resizeHandler = () => {
  if (currentGame && currentGame.running) currentGame.resize();
};
window.addEventListener('resize', _resizeHandler);

/* ── INIT ── */
window.startGame = startGame;
window.closeGame = closeGame;
window.restartGame = restartGame;
window.handleSearch = handleSearch;

// Init audio on first user interaction (browser autoplay policy)
document.addEventListener('click', () => initAudio(), { once: true });

loadData();
