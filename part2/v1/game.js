// Кристальна облога. Стани: menu -> wave -> shop -> wave ... -> over
// Механіка така ж, як у v0. Змінено вигляд і додано підказку керування.

// Налаштування
const W = 800, H = 520;
const PLAYER_HP = 6;
const SHOT_COOLDOWN = 0.5;
const BULLET_SPEED = 520;
const PRICES = { wall: 3, turret: 5, speed: 3, heal: 2 };
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Елементи сторінки
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ov');
const hintEl = document.getElementById('hint');
const hudWave = document.getElementById('h-wave');
const hudHp = document.getElementById('h-hp');
const hudCry = document.getElementById('h-cry');
const hudSh = document.getElementById('h-sh');
const hudTu = document.getElementById('h-tu');

const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.scale(dpr, dpr);

// Допоміжні функції
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Стан гри
let S;
let keys = {};
let lastTime = 0;
let clock = 0;

function reset() {
  S = {
    state: 'menu',
    wave: 0,
    hp: PLAYER_HP,
    crystals: 0,
    speedBonus: 0,
    shield: 0,
    turrets: [],
    bullets: [],
    enemies: [],
    pickups: [],
    beams: [],
    parts: [],
    player: { x: W / 2, y: H / 2 },
    cooldown: 0,
    hurt: 0,
    hint: 0,
    mouse: { x: 0, y: 0, down: false }
  };
}

function showPanel(html) {
  overlay.innerHTML = '<div class="panel">' + html + '</div>';
  overlay.hidden = false;
  const first = overlay.querySelector('button:not([disabled])');
  if (first && S.state !== 'shop') first.focus();
}

// Початок хвилі
function startWave() {
  S.wave++;
  S.enemies = []; S.pickups = []; S.bullets = []; S.parts = [];
  S.turrets.forEach(t => t.cooldown = 0);
  if (S.wave === 1) S.hint = 10;

  let left = 5 + 3 * S.wave;
  const enemyHp = 2 + Math.floor(S.wave / 2);

  while (left > 0) {
    const groupSize = Math.min(Math.floor(rand(2, 5)), left);
    left -= groupSize;
    const side = Math.floor(rand(0, 4));
    let cx = side === 2 ? 60 : side === 3 ? W - 60 : rand(60, W - 60);
    let cy = side === 0 ? 60 : side === 1 ? H - 60 : rand(60, H - 60);
    cx = clamp(cx, 40, W - 40);
    cy = clamp(cy, 40, H - 40);
    for (let i = 0; i < groupSize; i++) {
      S.enemies.push({ x: cx + rand(-30, 30), y: cy + rand(-30, 30), hp: enemyHp, cooldown: 0, flash: 0 });
      S.pickups.push({ x: clamp(cx + rand(-55, 55), 15, W - 15), y: clamp(cy + rand(-55, 55), 15, H - 15), phase: rand(0, 6) });
    }
  }
  S.state = 'wave';
  overlay.hidden = true;
}

// Магазин
function openShop() {
  S.state = 'shop';
  const items = [
    { name: 'Стіна',     price: PRICES.wall,   text: 'блокує один удар',        buy: () => S.shield++ },
    { name: 'Турель',    price: PRICES.turret, text: 'сама стріляє, до трьох',  buy: () => S.turrets.push({ x: rand(80, W - 80), y: rand(80, H - 80), cooldown: 0 }) },
    { name: 'Швидкість', price: PRICES.speed,  text: 'біжиш швидше',            buy: () => S.speedBonus += 35 },
    { name: 'Лікування', price: PRICES.heal,   text: '+2 життя',                buy: () => S.hp = Math.min(PLAYER_HP, S.hp + 2) }
  ];

  let rows = '';
  items.forEach((item, i) => {
    const full = item.name === 'Турель' && S.turrets.length >= 3;
    const off = (S.crystals < item.price || full) ? 'disabled' : '';
    rows += '<li><div><span class="name">' + item.name + '</span><span class="eff">' + item.text + '</span></div>' +
            '<button class="buy" data-i="' + i + '" ' + off + '><span class="gem">◆</span> ' + item.price + '</button></li>';
  });

  showPanel(
    '<h2>Хвиля ' + S.wave + ' пройдена</h2>' +
    '<p class="sub">Кристалів у запасі: <b>' + S.crystals + '</b></p>' +
    '<ul class="shop">' + rows + '</ul>' +
    '<button class="btn" id="next">Наступна хвиля</button>'
  );

  overlay.querySelectorAll('[data-i]').forEach(btn => {
    btn.onclick = () => {
      const item = items[btn.dataset.i];
      S.crystals -= item.price;
      item.buy();
      openShop();
    };
  });
  document.getElementById('next').onclick = startWave;
}

function gameOver() {
  S.state = 'over';
  showPanel(
    '<h2>Кінець гри</h2>' +
    '<p class="sub">Пройдено хвиль: <b>' + (S.wave - 1) + '</b></p>' +
    '<button class="btn" id="again">Ще раз</button>'
  );
  document.getElementById('again').onclick = openMenu;
}

function openMenu() {
  reset();
  showPanel(
    '<h2>Кристальна облога</h2>' +
    '<p>Збирай кристали біля ворогів, купуй захист у магазині між хвилями й пережий якомога більше хвиль.</p>' +
    '<div class="controls">' +
      '<p>Рух: <kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> або <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></p>' +
      '<p>Стрільба: <kbd>Пробіл</kbd> або клік мишкою</p>' +
    '</div>' +
    '<button class="btn" id="start">Старт</button>'
  );
  document.getElementById('start').onclick = startWave;
}

function nearest(from, list, maxDist) {
  let best = null, bestD = maxDist;
  list.forEach(o => { const d = dist(o, from); if (d < bestD) { bestD = d; best = o; } });
  return best;
}

function burst(x, y, n, speed) {
  if (REDUCE_MOTION) return;
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), v = rand(speed * 0.4, speed);
    S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4, max: 0.4 });
  }
}

// Оновлення (кожен кадр)
function update(dt) {
  if (S.state !== 'wave') return;
  const p = S.player;

  const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  const dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1;
  const speed = 180 + S.speedBonus;
  p.x = clamp(p.x + dx / len * speed * dt, 14, W - 14);
  p.y = clamp(p.y + dy / len * speed * dt, 14, H - 14);

  S.cooldown = Math.max(0, S.cooldown - dt);
  S.hurt = Math.max(0, S.hurt - dt);
  S.hint = Math.max(0, S.hint - dt);

  // Постріл гравця
  if ((keys.Space || S.mouse.down) && S.cooldown === 0 && S.enemies.length) {
    const target = nearest(p, S.enemies, 1e9);
    const tx = S.mouse.down ? S.mouse.x : target.x;
    const ty = S.mouse.down ? S.mouse.y : target.y;
    const d = Math.hypot(tx - p.x, ty - p.y) || 1;
    S.bullets.push({ x: p.x, y: p.y, vx: (tx - p.x) / d * BULLET_SPEED, vy: (ty - p.y) / d * BULLET_SPEED, life: 1.2 });
    S.cooldown = SHOT_COOLDOWN;
  }

  // Кулі
  S.bullets.forEach(b => {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    S.enemies.forEach(e => {
      if (b.life > 0 && dist(e, b) < 17) { e.hp--; e.flash = 0.12; b.life = 0; }
    });
  });
  S.bullets = S.bullets.filter(b => b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H);

  // Турелі
  S.turrets.forEach(t => {
    t.cooldown = Math.max(0, t.cooldown - dt);
    if (t.cooldown === 0) {
      const target = nearest(t, S.enemies, 170);
      if (target) {
        target.hp--; target.flash = 0.12; t.cooldown = 1;
        S.beams.push({ from: t, to: { x: target.x, y: target.y }, life: 0.12 });
      }
    }
  });
  S.beams.forEach(b => b.life -= dt);
  S.beams = S.beams.filter(b => b.life > 0);

  // Загибель ворогів і нагорода
  const alive = [];
  S.enemies.forEach(e => {
    if (e.hp <= 0) { S.crystals += 2; burst(e.x, e.y, 7, 120); }
    else alive.push(e);
  });
  S.enemies = alive;

  // Вороги
  S.enemies.forEach(e => {
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.flash = Math.max(0, e.flash - dt);
    const d = dist(e, p) || 1;
    const v = (70 + 6 * S.wave) * dt;
    if (d > 22) {
      e.x += (p.x - e.x) / d * v;
      e.y += (p.y - e.y) / d * v;
    } else if (e.cooldown === 0) {
      e.cooldown = 1.2;
      if (S.shield > 0) S.shield--;
      else { S.hp--; S.hurt = 0.3; }
    }
  });

  // Збір кристалів
  S.pickups = S.pickups.filter(c => {
    if (dist(c, p) < 24) { S.crystals++; burst(c.x, c.y, 4, 70); return false; }
    return true;
  });

  S.parts.forEach(q => { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; });
  S.parts = S.parts.filter(q => q.life > 0);

  if (S.hp <= 0) { gameOver(); return; }
  if (S.enemies.length === 0) openShop();
}

// Малювання
function diamond(x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.3);
  ctx.lineTo(x + r * 0.85, y);
  ctx.lineTo(x, y + r * 1.3);
  ctx.lineTo(x - r * 0.85, y);
  ctx.closePath();
}

function hexagon(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawGround() {
  const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, '#12303a');
  g.addColorStop(1, '#0a1a21');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(143, 200, 220, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 40; x < W; x += 40) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  for (let y = 40; y < H; y += 40) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawGround();

  // Радіус дії турелей
  S.turrets.forEach(t => {
    ctx.strokeStyle = 'rgba(217, 179, 108, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(t.x, t.y, 170, 0, Math.PI * 2); ctx.stroke();
  });

  // Кристали
  S.pickups.forEach(c => {
    const pulse = REDUCE_MOTION ? 0 : Math.sin(clock * 3 + c.phase) * 0.7;
    ctx.save();
    ctx.shadowColor = 'rgba(190, 235, 250, 0.9)';
    ctx.shadowBlur = 10 + pulse * 4;
    diamond(c.x, c.y, 7.5 + pulse * 0.4);
    ctx.fillStyle = '#d6f1fb';
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(10, 26, 33, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 9.7); ctx.lineTo(c.x, c.y + 9.7);
    ctx.moveTo(c.x - 6.4, c.y); ctx.lineTo(c.x + 6.4, c.y);
    ctx.stroke();
  });

  // Турелі
  S.turrets.forEach(t => {
    diamond(t.x, t.y, 9);
    ctx.fillStyle = '#d9b36c';
    ctx.fill();
    ctx.strokeStyle = '#0a1a21';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  S.beams.forEach(b => {
    ctx.strokeStyle = 'rgba(217, 179, 108, ' + (b.life / 0.12) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.from.x, b.from.y); ctx.lineTo(b.to.x, b.to.y); ctx.stroke();
  });

  // Кулі зі слідом
  S.bullets.forEach(b => {
    ctx.strokeStyle = 'rgba(242, 239, 230, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = '#f2efe6';
    ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
  });

  // Вороги
  S.enemies.forEach(e => {
    hexagon(e.x, e.y, 15);
    ctx.fillStyle = e.flash > 0 ? '#f2efe6' : '#26323b';
    ctx.fill();
    ctx.strokeStyle = '#7f95a3';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#e2674a';
    ctx.fillRect(e.x - 7, e.y - 1.5, 14, 3);
  });

  // Частинки
  S.parts.forEach(q => {
    ctx.fillStyle = 'rgba(214, 241, 251, ' + (q.life / q.max) + ')';
    ctx.fillRect(q.x - 1.5, q.y - 1.5, 3, 3);
  });

  // Гравець
  const p = S.player;
  ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = S.hurt > 0 ? '#e2674a' : '#f2efe6';
  ctx.fill();
  ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#0a1a21';
  ctx.fill();
  if (S.shield > 0) {
    ctx.strokeStyle = '#d6f1fb';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, 19, 0, Math.PI * 2); ctx.stroke();
  }

  // Червона рамка, коли гравця б'ють
  if (S.hurt > 0) {
    const a = S.hurt / 0.3 * 0.35;
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65);
    v.addColorStop(0, 'rgba(226, 103, 74, 0)');
    v.addColorStop(1, 'rgba(226, 103, 74, ' + a + ')');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
}

// Верхня панель
let hudCache = '';
function updateHud() {
  const sig = [S.wave, S.hp, S.crystals, S.shield, S.turrets.length, S.hint > 0].join('|');
  if (sig === hudCache) return;
  hudCache = sig;
  hudWave.textContent = S.wave;
  hudCry.textContent = S.crystals;
  hudSh.textContent = S.shield;
  hudTu.textContent = S.turrets.length;
  let pips = '';
  for (let i = 0; i < PLAYER_HP; i++) pips += '<i class="' + (i < S.hp ? 'on' : '') + '"></i>';
  hudHp.innerHTML = pips;
  hudHp.setAttribute('aria-label', 'Життя: ' + S.hp + ' з ' + PLAYER_HP);
  hintEl.hidden = !(S.state === 'wave' && S.hint > 0);
}

// Головний цикл
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
  lastTime = now;
  clock += dt;
  update(dt);
  draw();
  updateHud();
  requestAnimationFrame(loop);
}

// Керування
addEventListener('keydown', e => {
  keys[e.code] = true;
  const game = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code);
  if (game && S.state === 'wave') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });

function updateMouse(e) {
  const r = canvas.getBoundingClientRect();
  S.mouse.x = (e.clientX - r.left) * W / r.width;
  S.mouse.y = (e.clientY - r.top) * H / r.height;
}
canvas.addEventListener('pointerdown', e => { updateMouse(e); S.mouse.down = true; });
canvas.addEventListener('pointermove', updateMouse);
addEventListener('pointerup', () => { S.mouse.down = false; });

// Старт
openMenu();
requestAnimationFrame(loop);
