// Décors, lumière, atmosphère, foules et transitions (niveau « production »).
// Tout reste une fonction pure du temps. Les couches statiques sont dessinées une seule fois dans des
// canvas en cache (et pré-floutées pour la profondeur de champ) : le rendu reste rapide.
import { drawStick, POSES, COLORS, label } from './stick.js';
import { gait } from './anim.js';

export const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
function hash(i) { let a = (i * 374761393) | 0; a = Math.imul(a ^ (a >>> 13), 1274126177); return ((a ^ (a >>> 16)) >>> 0) / 4294967296; }

// ------------------------------------------------------------------ cache + profondeur de champ
const CACHE = new Map();
export function cached(key, w, h, paint) {
  if (CACHE.has(key)) return CACHE.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  CACHE.set(key, c);
  return c;
}
export function blurred(key, src, px) {
  return cached(`${key}|blur${px}`, src.width, src.height, (g) => { g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); });
}

// Ligne d'horizon de ville (couche répétable), fenêtres allumées aléatoires.
export function skyline(seed, { w = 2160, h = 900, base = '#141418', win = '#3a3a40', lit = 0.25, minH = 200, maxH = 760, bw = [110, 220] } = {}) {
  return cached(`sky${seed}${base}${win}${lit}${h}`, w, h, (g) => {
    let x = 0, i = 0;
    while (x < w) {
      const bwid = bw[0] + hash(seed * 97 + i) * (bw[1] - bw[0]), bh = minH + hash(seed * 31 + i) * (maxH - minH);
      g.fillStyle = base; g.fillRect(x, h - bh, bwid, bh);
      if (hash(seed + i * 7) > 0.6) g.fillRect(x + bwid * 0.4, h - bh - 60, 8, 60); // antenne
      for (let wy = h - bh + 26; wy < h - 30; wy += 46) for (let wx = x + 16; wx < x + bwid - 24; wx += 34)
        if (hash(seed * 13 + i * 101 + wx * 3 + wy) < lit) { g.fillStyle = win; g.fillRect(wx, wy, 14, 22); }
      x += bwid + 6 + hash(seed + i) * 20; i++;
    }
  });
}
// Couches en parallaxe : [{ canvas, depth, y, alpha }] ; camX = position caméra dans le monde.
export function parallax(ctx, layers, camX, camY = 0) {
  for (const L of layers) {
    const off = -((camX * L.depth) % L.canvas.width + L.canvas.width) % L.canvas.width;
    ctx.save(); ctx.globalAlpha = L.alpha ?? 1;
    for (let x = off; x < W; x += L.canvas.width) ctx.drawImage(L.canvas, x, (L.y ?? 0) - camY * L.depth);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ lumière et atmosphère
export function skyGrad(ctx, top = '#07080d', bottom = '#151622', y0 = 0, y1 = H) {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, y0, W, y1 - y0);
}
export function glow(ctx, x, y, r, color = '255,255,255', a = 0.35) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// Cône de lumière (projecteur, réverbère, fenêtre) avec halo au sol.
export function lightCone(ctx, x, yTop, yBottom, wBottom, { color = '255,255,255', a = 0.16, wTop = 40, skew = 0 } = {}) {
  const g = ctx.createLinearGradient(0, yTop, 0, yBottom);
  g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},${a * 0.25})`);
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(x - wTop / 2, yTop); ctx.lineTo(x + wTop / 2, yTop); ctx.lineTo(x + skew + wBottom / 2, yBottom); ctx.lineTo(x + skew - wBottom / 2, yBottom); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.translate(x + skew, yBottom); ctx.scale(1, 0.18); glow(ctx, 0, 0, wBottom * 0.6, color, a * 1.6); ctx.restore();
}
export function fog(ctx, y, h, a = 0.25, color = '30,30,38') {
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(0.5, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, y, W, h);
}
// Pluie : traits inclinés en 2 profondeurs + éclaboussures au sol.
export function rain(ctx, t, { n = 140, angle = 0.18, speed = 2200, ground = 1300, a = 0.35 } = {}) {
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const near = i % 3 === 0, sp = speed * (near ? 1.3 : 0.8), len = near ? 70 : 38;
    const y = ((hash(i) * 2400 + t * sp) % 2400) - 300, x = (hash(i + 500) * (W + 400) - 200 + y * angle) % (W + 200);
    ctx.strokeStyle = `rgba(190,200,220,${near ? a : a * 0.5})`; ctx.lineWidth = near ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * angle, y - len); ctx.stroke();
    if (y > ground - 10 && y < ground + 30 && near) { ctx.fillStyle = `rgba(190,200,220,${a * 0.6})`; ctx.fillRect(x - 8, ground - 2, 16, 3); }
  }
  ctx.restore();
}
// Reflet au sol mouillé : rejoue un dessin à l'envers, écrasé et transparent.
export function reflect(ctx, ground, drawFn, a = 0.18) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, ground * 2); ctx.scale(1, -1);
  ctx.beginPath(); ctx.rect(0, ground, W, H - ground); ctx.clip();
  drawFn(ctx); ctx.restore();
}

// ------------------------------------------------------------------ décors complets
export function bedroom(ctx, t, { night = true, alarm = null } = {}) {
  const wall = cached('bedroomWall', W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 1300); gr.addColorStop(0, '#0c0d12'); gr.addColorStop(1, '#16171e'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 60) { g.fillStyle = 'rgba(255,255,255,0.015)'; g.fillRect(x, 0, 30, 1300); }
    g.fillStyle = '#121216'; g.fillRect(0, 1300, W, 620);
    for (let y = 1300; y < H; y += 46) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(0, y, W, 3); }
    // fenêtre + ville
    g.fillStyle = '#0a0f1e'; g.fillRect(620, 520, 330, 470);
    g.drawImage(skyline(4, { w: 330, h: 300, base: '#10131c', win: '#4a4f66', lit: 0.3, minH: 80, maxH: 280, bw: [40, 80] }), 620, 690);
    g.fillStyle = '#d9d9db'; g.beginPath(); g.arc(860, 600, 30, 0, 7); g.fill();
    g.strokeStyle = '#2a2a30'; g.lineWidth = 18; g.strokeRect(620, 520, 330, 470); g.lineWidth = 10; g.beginPath(); g.moveTo(785, 520); g.lineTo(785, 990); g.moveTo(620, 755); g.lineTo(950, 755); g.stroke();
    // lit + table de nuit
    g.fillStyle = '#22232a'; g.fillRect(80, 1160, 470, 140); g.fillStyle = '#2e3038'; g.fillRect(80, 1130, 470, 50); g.fillStyle = '#3c3e48'; g.fillRect(100, 1100, 140, 46);
    g.fillStyle = '#1a1b20'; g.fillRect(80, 1040, 26, 260);
    g.fillStyle = '#26272e'; g.fillRect(580, 1180, 120, 120);
  });
  ctx.drawImage(wall, 0, 0);
  // lumière froide de la fenêtre au sol
  ctx.fillStyle = 'rgba(140,160,220,0.07)'; ctx.beginPath(); ctx.moveTo(620, 990); ctx.lineTo(950, 990); ctx.lineTo(1020, 1460); ctx.lineTo(560, 1460); ctx.fill();
  // réveil à LED rouge
  if (alarm) {
    const on = alarm.blink ? Math.floor(t * 4) % 2 === 0 : true;
    ctx.fillStyle = '#0b0b0d'; ctx.fillRect(598, 1130, 86, 50);
    if (on) { glow(ctx, 641, 1155, 90, '227,52,44', 0.35); ctx.font = '700 30px Display'; ctx.textAlign = 'center'; ctx.fillStyle = COLORS.red; ctx.fillText(alarm.text, 641, 1166); }
  }
}

export function gym(ctx, t) {
  const bgc = cached('gym', W, H, (g) => {
    g.fillStyle = '#0d0d10'; g.fillRect(0, 0, W, H);
    for (let r = 0; r * 60 < 1300; r++) for (let x = -(r % 2) * 70; x < W; x += 140) { g.fillStyle = (r + x) % 3 ? '#16161a' : '#18181c'; g.fillRect(x + 3, r * 60 + 3, 134, 54); }
    g.fillStyle = '#101013'; g.fillRect(0, 1300, W, 620);
    g.fillStyle = '#1c1c21'; g.fillRect(0, 1300, W, 14);
    // râtelier d'haltères
    g.fillStyle = '#2a2a30'; g.fillRect(700, 1060, 300, 16); g.fillRect(720, 1076, 14, 224); g.fillRect(966, 1076, 14, 224);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#3a3a42'; g.beginPath(); g.arc(750 + i * 52, 1040, 20 + i * 2, 0, 7); g.fill(); }
    g.fillStyle = '#d0d0d4'; g.font = '900 64px Display'; g.globalAlpha = 0.06; g.fillText('NO EXCUSES', 80, 640); g.globalAlpha = 1;
  });
  ctx.drawImage(bgc, 0, 0);
  for (const x of [270, 810]) lightCone(ctx, x, 250, 1300, 520, { a: 0.07 + 0.01 * Math.sin(t * 50 + x) });
}

export function stage(ctx, t, { on = 1 } = {}) {
  skyGrad(ctx, '#040406', '#0b0b10');
  ctx.fillStyle = '#121216'; ctx.fillRect(0, 1300, W, 620);
  ctx.fillStyle = '#1d1d23'; ctx.fillRect(0, 1300, W, 18);
  for (const [x, sk] of [[180, 220], [540, 0], [900, -220]]) lightCone(ctx, x, 200, 1300, 360, { a: 0.12 * on, wTop: 30, skew: sk + Math.sin(t * 0.7 + x) * 20 });
  glow(ctx, 540, 1290, 380, '255,255,255', 0.18 * on);
}

export function street(ctx, camX, t, { wet = true } = {}) {
  skyGrad(ctx, '#05060a', '#141623', 0, 1300);
  const far = skyline(1, { h: 900, base: '#0f1016', win: '#262833', lit: 0.18 });
  const mid = skyline(2, { h: 1000, base: '#15161c', win: '#5a5c6a', lit: 0.22, minH: 280, maxH: 880, bw: [160, 300] });
  parallax(ctx, [{ canvas: blurred('farSky', far, 4), depth: 0.15, y: 420 }, { canvas: blurred('midSky', mid, 1.5), depth: 0.4, y: 330 }], camX);
  fog(ctx, 950, 400, 0.35);
  ctx.fillStyle = '#18191f'; ctx.fillRect(0, 1300, W, 620);
  ctx.fillStyle = wet ? '#23252e' : '#202126'; ctx.fillRect(0, 1300, W, 12);
  // réverbères (premier plan, parallaxe 1)
  for (let k = Math.floor((camX - 200) / 560); k < Math.floor((camX + W + 200) / 560) + 1; k++) {
    const x = k * 560 - camX + 120;
    ctx.fillStyle = '#2c2d34'; ctx.fillRect(x - 7, 760, 14, 540); ctx.fillRect(x - 7, 760, 70, 10);
    glow(ctx, x + 60, 775, 120, '255,220,170', 0.35);
    lightCone(ctx, x + 60, 778, 1300, 380, { color: '255,220,170', a: 0.08, wTop: 26 });
  }
  // bande de trottoir
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let x = -((camX % 140) + 140) % 140; x < W; x += 140) ctx.fillRect(x, 1340, 70, 6);
}

// ------------------------------------------------------------------ personnages
// Foule variée : chaque membre a sa taille, sa teinte, son décalage de temps et un comportement.
export function makeCrowd(n, seed, { x0 = 100, spacing = 95, ground = 1300, scale = 0.8, jitter = 0.18 } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const r = (k) => hash(seed * 131 + i * 17 + k);
    const g = Math.round(85 + r(1) * 70);
    return { x: x0 + i * spacing + (r(2) - 0.5) * spacing * 0.4, ground, scale: scale * (1 - jitter / 2 + r(3) * jitter), color: `rgb(${g},${g},${g + 3})`, phase: r(4) * 6, face: r(5) > 0.5 ? 1 : -1 };
  });
}
export function drawCrowd(ctx, crowd, t, behavior = 'watch', { face = null, alpha = 1, blur = 0 } = {}) {
  ctx.save(); if (blur) ctx.filter = `blur(${blur}px)`;
  for (const m of crowd) {
    const tt = t + m.phase, f = face ?? m.face;
    let pose = POSES.stand, dy = 0;
    if (behavior === 'laugh') { const b = Math.abs(Math.sin(tt * 9)); pose = { ...POSES.stand, lean: -10 - 6 * b, head: -16, armB: [40, 70], armF: [30, 80] }; dy = -6 * b; }
    else if (behavior === 'point') { const b = Math.abs(Math.sin(tt * 8)); pose = { ...POSES.stand, lean: -6 - 4 * b, head: -8, armF: [92, 0], armB: [30, 60] }; dy = -4 * b; }
    else if (behavior === 'phone') pose = { ...POSES.phone, head: 28 + 3 * Math.sin(tt) };
    else if (behavior === 'clap') { const c = Math.abs(Math.sin(tt * 11)); pose = { ...POSES.stand, armB: [70 + 14 * c, 60 - 30 * c], armF: [70 + 14 * c, 60 - 30 * c] }; }
    else if (behavior === 'sit') pose = { ...POSES.sit, head: 18 };
    else pose = { ...POSES.stand, lean: Math.sin(tt * 1.3) * 2, head: Math.sin(tt * 0.9) * 6 };
    const hipY = m.ground - (BODY_LEG * m.scale) + dy - (behavior === 'sit' ? -60 * m.scale : 0);
    drawStick(ctx, m.x, hipY, pose, { color: m.color, scale: m.scale, face: f, ground: m.ground, alpha, eyes: !blur, t: tt, mouth: behavior === 'laugh' ? 'happy' : null });
    if (behavior === 'phone') glow(ctx, m.x + 40 * f * m.scale, hipY - 90 * m.scale, 60 * m.scale, '150,180,255', 0.35);
  }
  ctx.restore();
  if (behavior === 'laugh' && crowd.length) {
    const cx = crowd.reduce((a, m) => a + m.x, 0) / crowd.length;
    for (let k = 0; k < 3; k++) label(ctx, 'HA', cx - 160 + k * 160 + Math.sin(t * 7 + k) * 10, crowd[0].ground - 330 - Math.abs(Math.sin(t * 6 + k)) * 18, { size: 30, color: '#8c8c90' });
  }
}
const BODY_LEG = 158;

// Expressions (sourcils) : à dessiner juste après drawStick, avec les mêmes paramètres de tête.
export function headPos(x, y, pose, scale = 1, face = 1) {
  const D = Math.PI / 180, lean = pose.lean * D * face;
  const nx = Math.sin(lean) * 112, ny = -Math.cos(lean) * 112;
  const ha = (pose.lean + pose.head * 0.6) * D * face;
  return { x: x + (nx + Math.sin(ha) * 50) * scale, y: y + (ny - Math.cos(ha) * 50) * scale };
}
export function brows(ctx, x, y, pose, { scale = 1, face = 1, mood = 'determined' } = {}) {
  const h = headPos(x, y, pose, scale, face);
  const tilt = mood === 'determined' || mood === 'angry' ? 0.45 : mood === 'sad' ? -0.45 : 0;
  ctx.save(); ctx.strokeStyle = '#111'; ctx.lineWidth = 5 * scale; ctx.lineCap = 'round';
  for (const [dx, s] of [[6, 1], [24, -1]]) {
    const cx = h.x + dx * face * scale, cy = h.y - 22 * scale;
    ctx.beginPath(); ctx.moveTo(cx - 8 * scale, cy - tilt * 8 * s * face * scale); ctx.lineTo(cx + 8 * scale, cy + tilt * 8 * s * face * scale); ctx.stroke();
  }
  ctx.restore();
}
// Sueur (effort) : gouttes qui perlent et tombent.
export function sweat(ctx, x, y, pose, t, { scale = 1, face = 1 } = {}) {
  const h = headPos(x, y, pose, scale, face);
  for (let k = 0; k < 2; k++) {
    const ph = (t * 1.4 + k * 0.5) % 1;
    ctx.fillStyle = `rgba(160,200,255,${(1 - ph) * 0.9})`;
    ctx.beginPath(); ctx.ellipse(h.x - 40 * face * scale + k * 10, h.y - 10 * scale + ph * 60 * scale, 5 * scale, 8 * scale, 0, 0, 7); ctx.fill();
  }
}

// ------------------------------------------------------------------ transitions
// Panoramique filé : la scène A part, la B arrive (avec flou de bougé via les sous-images du harnais).
export function whip(ctx, t, tb, dur, drawA, drawB, dir = -1) {
  const k = clamp((t - (tb - dur / 2)) / dur);
  const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
  ctx.save(); ctx.translate(dir * W * e, 0); drawA(ctx); ctx.restore();
  ctx.save(); ctx.translate(dir * W * e - dir * W, 0); drawB(ctx); ctx.restore();
}
export { gait };
