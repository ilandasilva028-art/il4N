// « Toi contre toi » — film original dans le style des edits « mentality / discipline » :
// bonshommes épais blancs sur fond noir, un seul accent rouge, étiquettes en capitales espacées,
// carte « définition » à empattements, mot géant flou, montage serré calé sur un tempo de 150 BPM.
// Scénario, scènes, textes et musique originaux (aucun élément repris d'une vidéo existante).
import { drawStick, POSES, walk, run, climb, breathe, lerpPose, label, COLORS } from '../lib/stick.js';

export const W = 1080, H = 1920;
export const BPM = 124;
const B = 60 / BPM;                         // 0,4 s
const S = { climb: 0, def: 16 * B, word: 22 * B, road: 26 * B, montage: 40 * B, stairs: 48 * B, end: 60 * B };
export const DURATION = S.end;
export const MUSIC = { bpm: BPM, mood: 'sombre', dropAt: S.def, breakAt: S.word, backAt: S.road };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const ease = { out: (x) => 1 - (1 - x) ** 3, inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2), back: (x) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2 };
function hash(i) { let a = (i * 374761393) | 0; a = Math.imul(a ^ (a >>> 13), 1274126177); return ((a ^ (a >>> 16)) >>> 0) / 4294967296; }
const noise = (x, s = 1) => { const i = Math.floor(x), f = x - i, k = f * f * (3 - 2 * f); return (hash(i + s * 997) * (1 - k) + hash(i + 1 + s * 997) * k) * 2 - 1; };

// ------------------------------------------------------------------ décors
function bg(ctx, c = '#050505') { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
function bricks(ctx, x0, y0, w, h, oy = 0) {
  ctx.fillStyle = '#1d1d1f'; ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = '#121213'; ctx.lineWidth = 5;
  const bh = 62, bw = 150;
  const start = Math.floor((y0 + oy) / bh) - 1;
  for (let r = start; r * bh - oy < y0 + h; r++) {
    const y = r * bh - oy;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
    const off = (r & 1) * (bw / 2);
    for (let x = x0 - bw + off; x < x0 + w; x += bw) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + bh); ctx.stroke(); }
  }
}
function ledge(ctx, x, y, w) { ctx.fillStyle = '#5c5c5e'; ctx.fillRect(x, y, w, 22); ctx.fillStyle = '#3a3a3c'; ctx.fillRect(x, y + 22, w, 10); }
function ladder(ctx, x, y1, y2) {
  ctx.strokeStyle = '#9a9a9c'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 70, y1); ctx.lineTo(x - 70, y2); ctx.moveTo(x + 70, y1); ctx.lineTo(x + 70, y2); ctx.stroke();
  ctx.lineWidth = 9;
  for (let y = Math.ceil(y2 / 95) * 95; y < y1; y += 95) { ctx.beginPath(); ctx.moveTo(x - 70, y); ctx.lineTo(x + 70, y); ctx.stroke(); }
}
function city(ctx, ox, base, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha;
  for (let i = -2; i < 14; i++) {
    const x = i * 170 - (ox % 170) - 170 * Math.floor(ox / 170) * 0;
    const k = i + Math.floor(ox / 170);
    const h = 260 + hash(k) * 520, w = 140 + hash(k + 50) * 40;
    ctx.fillStyle = '#141416'; ctx.fillRect(x, base - h, w, h);
    ctx.fillStyle = '#2a2a2d';
    for (let wy = base - h + 30; wy < base - 40; wy += 70) for (let wx = x + 20; wx < x + w - 30; wx += 46) if (hash(k * 31 + wy + wx) > 0.72) ctx.fillRect(wx, wy, 20, 30);
  }
  ctx.restore();
}
function road(ctx, y, scroll) {
  ctx.fillStyle = '#232325'; ctx.fillRect(0, y, W, 260);
  ctx.fillStyle = '#3c3c3f'; ctx.fillRect(0, y, W, 10);
  ctx.fillStyle = '#6f6f72';
  for (let x = -(scroll % 200); x < W; x += 200) ctx.fillRect(x, y + 128, 110, 14);
}
function flag(ctx, x, y, t, glow) {
  ctx.fillStyle = '#b5b5b7'; ctx.fillRect(x - 5, y - 330, 10, 330);
  ctx.save();
  if (glow) { ctx.shadowColor = COLORS.red; ctx.shadowBlur = 40 * glow; }
  ctx.fillStyle = COLORS.red; ctx.beginPath(); ctx.moveTo(x + 5, y - 325);
  for (let i = 0; i <= 10; i++) { const fx = x + 5 + i * 14; ctx.lineTo(fx, y - 325 + Math.sin(t * 7 - i * 0.6) * 6 * (i / 10)); }
  for (let i = 10; i >= 0; i--) { const fx = x + 5 + i * 14; ctx.lineTo(fx, y - 245 + Math.sin(t * 7 - i * 0.6) * 6 * (i / 10)); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function caption(ctx, parts, y, size = 64, alpha = 1, k = 1) {
  // parts : [[texte, couleur], ...] sur une ligne, centrée.
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.font = `900 ${size}px Display`; ctx.letterSpacing = '3px'; ctx.textBaseline = 'alphabetic';
  const total = parts.reduce((a, [s]) => a + ctx.measureText(s).width, 0);
  let x = W / 2 - total / 2;
  ctx.translate(W / 2, y); ctx.scale(k, k); ctx.translate(-W / 2, -y);
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 18;
  for (const [s, c] of parts) { ctx.fillStyle = c; ctx.fillText(s, x, y); x += ctx.measureText(s).width; }
  ctx.restore();
}
const pop = (t, t0, d = 0.25) => ease.back(prog(t, t0, t0 + d));

// ------------------------------------------------------------------ 1. l'ascension (0 - 6,4 s)
const LEDGES = [{ y: 1200, side: -1, txt: 'EXCUSES' }, { y: 250, side: 1, txt: 'PEUR' }, { y: -450, side: -1, txt: 'FLEMME' }];
const climbY = (tl) => 1640 - tl * 330 + Math.sin(tl * 2 * Math.PI * 1.25) * 12;
function sceneClimb(ctx, tl) {
  const fy = climbY(tl);
  const cam = fy - 1180;
  bg(ctx);
  ctx.save(); ctx.translate(0, -cam);
  bricks(ctx, 0, cam - 10, W, H + 20, 0);
  ladder(ctx, 540, 2200, -1600);
  for (const L of LEDGES) {
    const passT = (1640 - L.y + 60) / 330; // instant où le héros dépasse ce rebord
    const lx = L.side < 0 ? 40 : W - 360;
    ledge(ctx, lx, L.y, 320);
    const gone = tl - passT;
    const cx = lx + 160;
    if (gone < 0) {
      drawStick(ctx, cx, L.y - 6, breathe(POSES.sit, tl * 3 + L.y, 1), { color: COLORS.gray, face: -L.side, scale: 0.9 });
      label(ctx, L.txt, cx, L.y + 80, { size: 30, color: '#d9d9db' });
    } else {
      // l'obstacle vire au rouge et tombe du rebord
      const g = gone, dy = 900 * g * g, rot = g * 3 * L.side;
      ctx.save(); ctx.translate(cx, L.y - 6 + dy); ctx.rotate(rot);
      drawStick(ctx, 0, 0, lerpPose(POSES.sit, POSES.fall, clamp(g * 4)), { color: COLORS.red, face: -L.side, scale: 0.9 });
      ctx.restore();
      label(ctx, L.txt, cx, L.y + 80 + dy * 0.4, { size: 30, color: COLORS.red, alpha: clamp(1 - g * 2.5) });
    }
  }
  const hp = climb(tl * 1.25);
  drawStick(ctx, 540, fy, hp, { color: COLORS.white, face: 1, scale: 1.05 });
  label(ctx, 'TOI', 540, fy - 360, { size: 34 });
  ctx.restore();
  const band = ctx.createLinearGradient(0, 250, 0, 640);
  band.addColorStop(0, 'rgba(0,0,0,0.85)'); band.addColorStop(0.7, 'rgba(0,0,0,0.6)'); band.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = band; ctx.fillRect(0, 250, W, 390);
  // accroche en haut (zone sûre) : apparaît sur le temps 0
  const k = pop(tl, -0.05, 0.3);
  caption(ctx, [['CE QUI TE ', '#f1f1f1'], ['RETIENT', COLORS.red]], 380, 68, clamp(k), 0.6 + 0.4 * k);
  caption(ctx, [['N’EST PAS LÀ-HAUT.', '#f1f1f1']], 465, 68, clamp(pop(tl, 0.4, 0.3)), 1);
}

// ------------------------------------------------------------------ 2. la définition (6,4 - 8,8 s)
const DEF = ['Discipline', 'nom · /di.si.plin/', 'Faire ce qui doit être fait,', 'surtout quand tu n’en as', 'aucune envie.'];
function sceneDef(ctx, tl) {
  bg(ctx, '#030303');
  const z = 1 + tl * 0.025;
  ctx.save(); ctx.translate(W / 2, 820); ctx.scale(z, z); ctx.translate(-W / 2, -820);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const chars = Math.floor(tl * 60) + 28;
  let used = 0;
  const lines = [[DEF[0], 196, 650, '#f4f4f4'], [DEF[1], 60, 750, '#9d9d9f'], [DEF[2], 78, 890, '#e6e6e6'], [DEF[3], 78, 990, '#e6e6e6'], [DEF[4], 78, 1090, '#e6e6e6']];
  for (const [s, size, y, col] of lines) {
    const n = clamp(chars - used, 0, s.length); used += s.length;
    ctx.font = `${size}px Serif`; ctx.fillStyle = col;
    ctx.fillText(s.slice(0, n), 80, y);
    if (n > 0 && n < s.length && Math.floor(tl * 4) % 2 === 0) { const w = ctx.measureText(s.slice(0, n)).width; ctx.fillRect(84 + w, y - size * 0.8, 4, size * 0.9); }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ 3. le mot (8,8 - 10,4 s)
function sceneWord(ctx, tl) {
  bg(ctx, '#020202');
  const k = ease.out(prog(tl, 0, 0.5));
  const blur = 22 * (1 - k) + 3 * Math.max(0, Math.sin(tl * 9)) * (1 - prog(tl, 0.8, 1.6));
  const sh = 14 * Math.exp(-tl * 6);
  ctx.save();
  ctx.translate(W / 2 + noise(tl * 40) * sh, 900 + noise(tl * 40, 3) * sh);
  ctx.scale(1.25 - 0.25 * k + tl * 0.03, 1.25 - 0.25 * k + tl * 0.03);
  ctx.font = '330px Serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.shadowColor = 'rgba(255,255,255,0.65)'; ctx.shadowBlur = 60;
  ctx.fillStyle = '#f7f7f7'; ctx.fillText('TOI.', 0, 0);
  ctx.restore();
  ctx.filter = 'none';
  caption(ctx, [['CONTRE ', '#bdbdbf'], ['TOI.', COLORS.red]], 1180, 58, clamp(prog(tl, 0.8, 1.0)), 1);
}

// ------------------------------------------------------------------ 4. la route (10,4 - 16 s)
function sceneRoad(ctx, tl) {
  const speed = 300;
  const dx = 260 + tl * speed;           // position monde du héros
  const cam = dx - 700;
  bg(ctx, '#060607');
  city(ctx, cam * 0.35, 1250, 1);
  road(ctx, 1250, cam);
  // MOTIVATION : marche, ralentit, s'assoit puis reste derrière
  const stopAt = 2.0, sitAt = 2.7;
  const mx = tl < stopAt ? dx - 340 : dx - 340 - (tl - stopAt) * speed * (tl < sitAt ? 0.6 : 1) - (tl > sitAt ? (sitAt - stopAt) * speed * -0.4 : 0);
  const mPose = tl < stopAt ? walk(tl * 1.6) : tl < sitAt ? lerpPose(walk(tl * 1.6, 0.5), POSES.sad, prog(tl, stopAt, sitAt)) : lerpPose(POSES.sad, POSES.sit, prog(tl, sitAt, sitAt + 0.3));
  const mY = 1250 - 168 + (tl > sitAt ? 70 * prog(tl, sitAt, sitAt + 0.3) : 0);
  const msx = mx - cam;
  drawStick(ctx, msx, mY, mPose, { color: COLORS.gray, face: 1, scale: 1.0, mouth: tl > stopAt ? 'sad' : null });
  label(ctx, 'MOTIVATION', msx, mY - 350, { size: 26, color: '#a3a3a5', track: 3 });
  // DISCIPLINE : ne s'arrête jamais
  drawStick(ctx, 700, 1250 - 168 + Math.abs(Math.sin(tl * Math.PI * 1.6)) * -8, walk(tl * 1.6), { color: COLORS.white, face: 1, scale: 1.0 });
  label(ctx, 'DISCIPLINE', 700, 1250 - 168 - 350, { size: 26, track: 3 });
  // compteur de jours
  const day = Math.max(1, Math.round(1 + 364 * prog(tl, 0.3, 5.4) ** 2.4));
  ctx.save(); ctx.font = '900 92px Display'; ctx.textAlign = 'center'; ctx.letterSpacing = '6px';
  ctx.fillStyle = '#f1f1f1'; ctx.fillText(`JOUR ${day}`, W / 2, 400); ctx.restore();
  if (tl > 0.9 && tl < 3.1) caption(ctx, [['LA MOTIVATION ', '#f1f1f1'], ['S’ARRÊTE.', '#9a9a9c']], 520, 52, clamp(pop(tl, 0.9)), 1);
  if (tl >= 3.1) caption(ctx, [['LA DISCIPLINE ', '#f1f1f1'], ['CONTINUE.', COLORS.red]], 520, 52, 1, 0.8 + 0.2 * pop(tl, 3.1));
}

// ------------------------------------------------------------------ 5. montage serré (16 - 19,2 s)
const SHOTS = [
  ['5 H DU MATIN', (ctx, k) => { ctx.fillStyle = '#2b2b2e'; ctx.fillRect(250, 1180, 580, 70); ctx.fillRect(250, 1100, 40, 150); drawStick(ctx, 520, 1160, lerpPose(POSES.fall, POSES.sit, k), { scale: 0.9 }); }],
  ['PAS ENVIE', (ctx, k) => { ctx.fillStyle = '#3d3d40'; ctx.fillRect(560 + k * 40, 830, 360, 420); drawStick(ctx, 420 + k * 40, 1082, POSES.push, { scale: 1.05 }); }],
  ['FATIGUÉ', (ctx, k) => { for (let i = 0; i < 7; i++) { ctx.fillStyle = '#2f2f31'; ctx.fillRect(((i * 240 - k * 600) % 1300 + 1300) % 1300 - 100, 900 + i * 50, 180, 8); } drawStick(ctx, 540, 1082, run(k * 1.4), { scale: 1.05 }); }],
  ['SEUL', (ctx, k) => { const g = ctx.createRadialGradient(540, 1250, 20, 540, 1100, 520); g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(470, 420); ctx.lineTo(610, 420); ctx.lineTo(880, 1260); ctx.lineTo(200, 1260); ctx.fill(); drawStick(ctx, 540, 1082, breathe(POSES.stand, k * 4), { scale: 1.05 }); }],
  ['ENCORE', (ctx, k) => { ctx.strokeStyle = '#8c8c8e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(760, 600); ctx.lineTo(760 + k * 30, 760); ctx.stroke(); ctx.fillStyle = COLORS.red; ctx.save(); ctx.translate(760 + k * 30, 760); ctx.rotate(-k * 0.12); ctx.fillRect(-70, 0, 140, 330); ctx.restore(); drawStick(ctx, 470, 1082, lerpPose(POSES.stand, POSES.punch, ease.out(clamp(k * 2.5))), { scale: 1.05 }); }],
  ['TOMBE', (ctx, k) => { drawStick(ctx, 540, 1082 + k * 80, lerpPose(POSES.stand, POSES.fall, ease.out(clamp(k * 2))), { scale: 1.05, color: COLORS.red }); }],
  ['SE RELÈVE', (ctx, k) => { drawStick(ctx, 540, 1100 - k * 18, lerpPose(POSES.kneel, POSES.stand, ease.inOut(k)), { scale: 1.05 }); }],
  ['RECOMMENCE', (ctx, k) => { drawStick(ctx, 380 + k * 300, 1082, walk(k * 1.2), { scale: 1.05 }); }],
];
function sceneMontage(ctx, tl) {
  const i = Math.min(SHOTS.length - 1, Math.floor(tl / B));
  const k = (tl - i * B) / B;
  bg(ctx, i % 2 ? '#070707' : '#0c0c0d');
  ctx.fillStyle = '#18181a'; ctx.fillRect(0, 1250, W, 670);
  const z = 1.14 - 0.14 * ease.out(k);
  ctx.save(); ctx.translate(W / 2, 1000); ctx.scale(z, z); ctx.translate(-W / 2, -1000);
  SHOTS[i][1](ctx, k);
  ctx.restore();
  caption(ctx, [[SHOTS[i][0], i === 5 ? COLORS.red : '#f1f1f1']], 480, 76, 1, 1.15 - 0.15 * ease.out(clamp(k * 3)));
  if (k < 0.18) { ctx.fillStyle = `rgba(255,255,255,${(0.28 * (1 - k / 0.18)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}

// ------------------------------------------------------------------ 6. l'escalier (19,2 - 24 s)
const STEPS = ['JOUR 1', 'JOUR 30', 'JOUR 90', 'JOUR 180', 'JOUR 365'];
const stepPos = (i) => ({ x: 130 + i * 175, y: 1450 - i * 125 });
const REACH = (5 - 1) * 2 * B; // arrivée en haut
function sceneStairs(ctx, tl) {
  bg(ctx, '#050505');
  const zoom = 1.08 - 0.1 * ease.inOut(prog(tl, REACH, REACH + 1.6));
  ctx.save(); ctx.translate(W / 2, 1050); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -1050);
  STEPS.forEach((s, i) => {
    const p = stepPos(i);
    ctx.fillStyle = i === STEPS.length - 1 ? '#4a4a4d' : '#2e2e31'; ctx.fillRect(p.x - 80, p.y, 180, 1920 - p.y);
    ctx.fillStyle = '#5c5c5f'; ctx.fillRect(p.x - 80, p.y, 180, 14);
    label(ctx, s, p.x + 10, p.y + 70, { size: 24, color: '#bdbdbf', track: 3 });
  });
  const top = stepPos(STEPS.length - 1);
  const reached = tl > REACH;
  flag(ctx, top.x + 50, top.y, tl, reached ? clamp((tl - REACH) * 2) : 0);
  // le héros saute de marche en marche, une marche tous les deux temps
  const hop = tl / (2 * B);
  const i = Math.min(STEPS.length - 1, Math.floor(hop));
  const f = Math.min(1, hop - i);
  const a = stepPos(i), b = stepPos(Math.min(STEPS.length - 1, i + 1));
  const moving = hop < STEPS.length - 1;
  const x = moving ? a.x + (b.x - a.x) * ease.inOut(f) : top.x - 20;
  const y = (moving ? a.y + (b.y - a.y) * f - Math.sin(Math.PI * f) * 110 : top.y) - 128;
  const pose = moving ? lerpPose(run(f), POSES.stand, Math.abs(Math.cos(Math.PI * f)) * 0.3) : lerpPose(POSES.stand, POSES.victory, ease.out(prog(tl, REACH, REACH + 0.4)));
  drawStick(ctx, x, y, pose, { scale: 0.82 });
  ctx.restore();
  caption(ctx, [['TON SEUL ADVERSAIRE :', '#f1f1f1']], 430, 56, clamp(pop(tl, REACH + 0.3)), 1);
  caption(ctx, [['TOI, ', '#f1f1f1'], ['HIER.', COLORS.red]], 540, 96, clamp(pop(tl, REACH + 0.8)), 0.7 + 0.3 * pop(tl, REACH + 0.8));
}

// ------------------------------------------------------------------ assemblage
const SCENES = [[S.climb, sceneClimb], [S.def, sceneDef], [S.word, sceneWord], [S.road, sceneRoad], [S.montage, sceneMontage], [S.stairs, sceneStairs]];
export function draw(ctx, t) {
  if (t >= S.end - B) { sceneClimb(ctx, 0); return; } // boucle : la fin retombe sur l'image d'ouverture
  let k = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) k = i;
  const [t0, fn] = SCENES[k];
  // pulsation sur le temps après le drop + secousse sur les coupes de scène
  const beatPh = (t % B) / B;
  const pulse = t >= S.def && !(t >= S.word && t < S.road) ? 0.012 * Math.exp(-beatPh * 6) : 0;
  const since = t - t0, sh = k > 0 ? 16 * Math.exp(-since * 9) : 0;
  ctx.save();
  ctx.translate(W / 2 + noise(t * 50, 5) * sh, H / 2 + noise(t * 50, 9) * sh);
  ctx.scale(1 + pulse, 1 + pulse);
  ctx.translate(-W / 2, -H / 2);
  fn(ctx, since);
  ctx.restore();
  if (k > 0 && since < 0.08) { ctx.fillStyle = `rgba(255,255,255,${(0.35 * (1 - since / 0.08)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}
export const samples = (t) => (t >= S.montage && t < S.stairs ? 3 : 1);

// grain + vignette (après le flou de bougé)
let grain = null;
export function post(ctx, t) {
  if (!grain) {
    grain = document.createElement('canvas'); grain.width = grain.height = 256;
    const g = grain.getContext('2d'); const im = g.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.floor(hash(i) * 255); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0);
  }
  const f = Math.floor(t * 30);
  ctx.globalAlpha = 0.045; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grain, 'repeat');
  ctx.translate(-hash(f) * 256, -hash(f + 7) * 256); ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

// Un son par accent visuel.
export const HITS = (() => {
  const h = [{ t: 0, sfx: 'impact', gain: 0.8 }];
  LEDGES.forEach((L) => h.push({ t: S.climb + (1640 - L.y + 60) / 330, sfx: 'impact', gain: 0.55 }));
  h.push({ t: S.def, sfx: 'whoosh', gain: 0.8 }, { t: S.word, sfx: 'impact', gain: 1 }, { t: S.road, sfx: 'whoosh', gain: 0.8 });
  h.push({ t: S.road + 0.9, sfx: 'pop', gain: 0.6 }, { t: S.road + 3.1, sfx: 'impact', gain: 0.7 });
  for (let i = 0; i < SHOTS.length; i++) h.push({ t: S.montage + i * B, sfx: i % 2 ? 'impact' : 'whoosh', gain: 0.7, len: 0.25 });
  for (let i = 1; i < STEPS.length; i++) h.push({ t: S.stairs + i * 2 * B, sfx: 'tick', gain: 0.7 });
  h.push({ t: S.stairs + REACH, sfx: 'ding', gain: 0.6 }, { t: S.stairs + REACH + 0.8, sfx: 'impact', gain: 0.9 }, { t: S.end - B, sfx: 'whoosh', gain: 0.7 });
  return h;
})();
