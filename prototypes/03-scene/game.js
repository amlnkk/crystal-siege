// Кристальна облога. Стани: menu -> wave -> shop -> wave ... -> over
// Налаштування (тут можна міняти числа):
const W = 800, H = 520;
const PLAYER_HP = 6;
const SHOT_COOLDOWN = 0.5;
const BULLET_SPEED = 520;
const PRICES = { wall: 3, turret: 5, speed: 3, heal: 2 };

// Посилання на елементи сторінки:
const canvas  = document.getElementById('c');
const ctx     = canvas.getContext('2d');
const overlay = document.getElementById('ov');
const hud     = document.getElementById('hud');

// Допоміжні функції:
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Стан гри:
let S;
let keys = {};
let lastTime = 0;

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
    player: { x: W / 2, y: H / 2 },
    cooldown: 0,
    hurt: 0,
    mouse: { x: 0, y: 0, down: false }
  };
}

// Початок хвилі (псевдокод «спавн хвилі»):
function startWave() {
  S.wave++;
  S.enemies = []; S.pickups = []; S.bullets = [];
  S.turrets.forEach(t => t.cooldown = 0);

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
      S.enemies.push({ x: cx + rand(-30, 30), y: cy + rand(-30, 30), hp: enemyHp, cooldown: 0 });
      S.pickups.push({ x: clamp(cx + rand(-55, 55), 15, W - 15), y: clamp(cy + rand(-55, 55), 15, H - 15) });
    }
  }
  S.state = 'wave';
  overlay.style.display = 'none';
}

// Магазин між хвилями:
function openShop() {
  S.state = 'shop';
  const items = [
    { name: 'Стіна',     price: PRICES.wall,   text: 'блокує 1 удар', buy: () => S.shield++ },
    { name: 'Турель',    price: PRICES.turret, text: 'сама стріляє',  buy: () => S.turrets.push({ x: rand(80, W - 80), y: rand(80, H - 80), cooldown: 0 }) },
    { name: 'Швидкість', price: PRICES.speed,  text: 'біжиш швидше',  buy: () => S.speedBonus += 35 },
    { name: 'Лікування', price: PRICES.heal,   text: '+2 життя',      buy: () => S.hp = Math.min(PLAYER_HP, S.hp + 2) }
  ];

  let html = `<h2>Магазин. Хвиля ${S.wave} пройдена</h2><p>Кристалів: <b>${S.crystals}</b></p><div class="btns">`;
  items.forEach((item, i) => {
    const tooMany = (item.name === 'Турель' && S.turrets.length >= 3);
    const disabled = (S.crystals < item.price || tooMany) ? 'disabled' : '';
    html += `<button data-i="${i}" ${disabled}>${item.name} (${item.price})<br><small>${item.text}</small></button>`;
  });
  html += `</div><button class="go" id="next">Наступна хвиля</button>`;

  overlay.innerHTML = html;
  overlay.style.display = 'flex';

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

// Кінець гри і меню:
function gameOver() {
  S.state = 'over';
  overlay.innerHTML = `<h2>Кінець гри</h2><p>Пройдено хвиль: <b>${S.wave - 1}</b></p><button class="go" id="again">Ще раз</button>`;
  overlay.style.display = 'flex';
  document.getElementById('again').onclick = openMenu;
}

function openMenu() {
  reset();
  overlay.innerHTML = `<h2>Кристальна облога</h2><p>Збирай кристали біля ворогів, купуй захист у магазині між хвилями й пережий якомога більше хвиль.</p><button class="go" id="start">Старт</button>`;
  overlay.style.display = 'flex';
  document.getElementById('start').onclick = startWave;
}

// Оновлення гри (виконується кожен кадр):
function update(dt) {
  if (S.state !== 'wave') return;
  const p = S.player;

  const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  const dy = (keys.ArrowDown  || keys.KeyS ? 1 : 0) - (keys.ArrowUp   || keys.KeyW ? 1 : 0);
  const len = Math.hypot(dx, dy) || 1;
  const speed = 180 + S.speedBonus;
  p.x = clamp(p.x + dx / len * speed * dt, 14, W - 14);
  p.y = clamp(p.y + dy / len * speed * dt, 14, H - 14);

  S.cooldown = Math.max(0, S.cooldown - dt);
  S.hurt = Math.max(0, S.hurt - dt);

  if ((keys.Space || S.mouse.down) && S.cooldown === 0 && S.enemies.length) {
    let target = nearest(p, S.enemies, 1e9);
    const tx = S.mouse.down ? S.mouse.x : target.x;
    const ty = S.mouse.down ? S.mouse.y : target.y;
    const d = Math.hypot(tx - p.x, ty - p.y) || 1;
    S.bullets.push({ x: p.x, y: p.y, vx: (tx - p.x) / d * BULLET_SPEED, vy: (ty - p.y) / d * BULLET_SPEED, life: 1.2 });
    S.cooldown = SHOT_COOLDOWN;
  }

  S.bullets.forEach(b => {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    S.enemies.forEach(e => {
      if (b.life > 0 && dist(e, b) < 17) { e.hp--; b.life = 0; }
    });
  });
  S.bullets = S.bullets.filter(b => b.life > 0 && b.x > 0 && b.x < W && b.y > 0 && b.y < H);

  S.turrets.forEach(t => {
    t.cooldown = Math.max(0, t.cooldown - dt);
    if (t.cooldown === 0) {
      const target = nearest(t, S.enemies, 170);
      if (target) {
        target.hp--; t.cooldown = 1;
        S.beams.push({ from: t, to: { x: target.x, y: target.y }, life: 0.12 });
      }
    }
  });
  S.beams.forEach(b => b.life -= dt);
  S.beams = S.beams.filter(b => b.life > 0);

  const alive = [];
  S.enemies.forEach(e => { if (e.hp <= 0) S.crystals += 2; else alive.push(e); });
  S.enemies = alive;

  S.enemies.forEach(e => {
    e.cooldown = Math.max(0, e.cooldown - dt);
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

  S.pickups = S.pickups.filter(c => {
    if (dist(c, p) < 24) { S.crystals++; return false; }
    return true;
  });

  if (S.hp <= 0) { gameOver(); return; }
  if (S.enemies.length === 0) openShop();
}

function nearest(from, list, maxDist) {
  let best = null, bestD = maxDist;
  list.forEach(o => { const d = dist(o, from); if (d < bestD) { bestD = d; best = o; } });
  return best;
}

// Малювання:
function circle(x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function draw() {
  ctx.fillStyle = '#1c3a44'; ctx.fillRect(0, 0, W, H);

  S.pickups.forEach(c => circle(c.x, c.y, 9, '#bfeaff'));
  S.turrets.forEach(t => { ctx.fillStyle = '#f2b866'; ctx.fillRect(t.x - 11, t.y - 11, 22, 22); });
  S.beams.forEach(b => {
    ctx.strokeStyle = '#f2b866'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(b.from.x, b.from.y); ctx.lineTo(b.to.x, b.to.y); ctx.stroke();
  });
  S.bullets.forEach(b => circle(b.x, b.y, 5, '#fff6b0'));
  S.enemies.forEach(e => {
    circle(e.x, e.y, 15, '#9aa7bd');
    ctx.fillStyle = '#10131c';
    ctx.fillRect(e.x - 7, e.y - 4, 4, 8); ctx.fillRect(e.x + 3, e.y - 4, 4, 8);
  });

  circle(S.player.x, S.player.y, 14, S.hurt > 0 ? '#ff8a8a' : '#ffd36e');
  if (S.shield > 0) {
    ctx.strokeStyle = '#7fd4e8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(S.player.x, S.player.y, 20, 0, Math.PI * 2); ctx.stroke();
  }

  hud.innerHTML = `<span>Хвиля: <b>${S.wave}</b></span><span>Життя: <b>${S.hp}/${PLAYER_HP}</b></span>` +
                  `<span>Кристали: <b>${S.crystals}</b></span><span>Стіни: <b>${S.shield}</b></span>` +
                  `<span>Турелі: <b>${S.turrets.length}</b></span>`;
}

// Головний цикл:
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// Керування:
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });

function updateMouse(e) {
  const r = canvas.getBoundingClientRect();
  S.mouse.x = (e.clientX - r.left) * W / r.width;
  S.mouse.y = (e.clientY - r.top)  * H / r.height;
}
canvas.addEventListener('pointerdown', e => { updateMouse(e); S.mouse.down = true; });
canvas.addEventListener('pointermove', updateMouse);
addEventListener('pointerup', () => { S.mouse.down = false; });

// Старт:
openMenu();
requestAnimationFrame(loop);
