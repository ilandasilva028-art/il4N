// Vision « Le système » — film original et pédagogique (style mentality).
// Message : la discipline n'est pas une question de volonté mais de système. 4 règles concrètes.
import { W, H, timeline, bg, floor, caption, topBand, compose, grainVignette, bed, door, box, flag, drawStick, POSES, label, COLORS, clamp, prog, ease, pop, hash, lerp, noise } from '../lib/kit.js';
import { walk, run, climb, lerpPose, breathe } from '../lib/stick.js';

export { W, H };
export const BPM = 124;
const { B, S } = timeline(BPM, [['hook', 8], ['r1', 10], ['r2', 10], ['r3', 8], ['r4', 10], ['montage', 6], ['fin', 10]]);
export const DURATION = S.end;
export const MUSIC = { bpm: BPM, mood: 'sombre', dropAt: S.r1 };
const RED = COLORS.red;

// En-tête de règle : pastille rouge « RÈGLE n » + titre sur 1-2 lignes.
function rule(ctx, tl, n, l1, l2) {
  topBand(ctx);
  const k = pop(tl, 0, 0.3);
  ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(W / 2, 320); ctx.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k);
  ctx.fillStyle = RED; ctx.beginPath(); ctx.roundRect(-120, -36, 240, 56, 28); ctx.fill();
  ctx.font = '900 30px Display'; ctx.letterSpacing = '6px'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(`RÈGLE ${n}`, 3, 2);
  ctx.restore();
  caption(ctx, l1, 420, 52, pop(tl, 0.15), 1);
  if (l2) caption(ctx, l2, 492, 52, pop(tl, 0.35), 1);
}

// 0. Accroche : la jauge de motivation clignote, le héros attend assis.
function hook(ctx, tl) {
  bg(ctx, '#060606');
  // poussée de caméra + poussière qui tombe : l'ouverture bouge dès l'image 0
  const bph = (tl % B) / B;
  const zc = 1 + 0.16 * ease.out(prog(tl, 0, 8 * B)) + 0.05 * Math.exp(-bph * 7);
  ctx.save(); ctx.translate(540, 1000); ctx.scale(zc, zc); ctx.rotate(Math.sin(tl * 1.7) * 0.012); ctx.translate(-540, -1000);
  for (let i = 0; i < 40; i++) { const x = hash(i) * W, y = ((hash(i + 40) * 1400 + tl * (80 + hash(i + 80) * 160)) % 1400) + 250; ctx.fillStyle = `rgba(255,255,255,${0.12 + 0.2 * hash(i + 7)})`; ctx.fillRect(x, y, 5, 5); }
  floor(ctx, 1300);
  const beat = Math.floor(tl / B);
  const target = [0.9, 0.15, 0.7, 0.05, 0.55, 0.0, 0.35, 0.0][beat % 8];
  const prev = [0.0, 0.9, 0.15, 0.7, 0.05, 0.55, 0.0, 0.35][beat % 8];
  const lvl = lerp(prev, target, ease.out(clamp((tl - beat * B) / (B * 0.4))));
  // jauge
  ctx.strokeStyle = '#8c8c8e'; ctx.lineWidth = 10; ctx.strokeRect(390, 770, 300, 110);
  ctx.fillStyle = '#8c8c8e'; ctx.fillRect(690, 805, 18, 40);
  ctx.fillStyle = lvl < 0.25 ? RED : '#e9e9eb'; ctx.fillRect(402, 782, 276 * lvl, 86);
  label(ctx, 'MOTIVATION', 540, 750, { size: 30, color: '#bdbdbf' });
  drawStick(ctx, 540, 1240, breathe(POSES.sit, tl * 2.5, 1), { scale: 1.0, mouth: 'sad' });
  label(ctx, 'TOI, QUI ATTENDS', 540, 980, { size: 26, color: '#8c8c8e', track: 3 });
  ctx.restore();
  caption(ctx, [['TU N’AS PAS UN PROBLÈME', '#f1f1f1']], 360, 56, pop(tl, -0.05, 0.3), 1);
  caption(ctx, [['DE MOTIVATION.', '#9a9a9c']], 430, 56, pop(tl, 0.35), 1);
  caption(ctx, [['TU AS UN PROBLÈME', '#f1f1f1']], 540, 56, pop(tl, 4 * B), 1);
  caption(ctx, [['DE ', '#f1f1f1'], ['SYSTÈME.', RED]], 630, 80, pop(tl, 4.5 * B), 0.8 + 0.2 * pop(tl, 4.5 * B));
}

// 1. Ne compte pas sur l'envie : la motivation ondule, l'habitude monte en escalier.
function r1(ctx, tl) {
  bg(ctx, '#050505');
  rule(ctx, tl, 1, [['NE COMPTE PAS SUR ', '#f1f1f1'], ['L’ENVIE.', RED]], [['ELLE MONTE ET DESCEND.', '#9a9a9c']]);
  const x0 = 110, x1 = 960, yb = 1330;
  ctx.strokeStyle = '#4a4a4d'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x0, 700); ctx.lineTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke();
  label(ctx, 'TEMPS →', x1 - 80, yb + 50, { size: 24, color: '#6f6f72' });
  const rev = ease.inOut(prog(tl, 0.4, 9 * B));
  const xe = lerp(x0, x1, rev);
  // motivation : vague
  ctx.strokeStyle = '#9a9a9c'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath();
  for (let x = x0; x <= xe; x += 6) { const u = (x - x0) / (x1 - x0); const y = 1050 - 230 * Math.sin(u * 14) * (0.6 + 0.4 * Math.sin(u * 5)); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  // habitude : escalier qui ne redescend jamais
  ctx.strokeStyle = RED; ctx.lineWidth = 14; ctx.beginPath();
  const steps = 10; let lastY = yb - 40; ctx.moveTo(x0, lastY);
  for (let i = 0; i < steps; i++) {
    const sx = x0 + ((x1 - x0) * i) / steps, ex = x0 + ((x1 - x0) * (i + 1)) / steps, y = yb - 40 - i * 52;
    if (sx > xe) break;
    ctx.lineTo(sx, y); ctx.lineTo(Math.min(ex, xe), y); lastY = y;
  }
  ctx.stroke();
  // le héros marche sur l'escalier rouge, au bout du tracé
  drawStick(ctx, Math.max(x0 + 30, xe - 10), lastY - 7 - 95, walk(tl * 1.7, 0.8), { scale: 0.6 });
  if (rev > 0.5) { label(ctx, 'MOTIVATION', 300, 760, { size: 26, color: '#9a9a9c', alpha: prog(rev, 0.5, 0.7) }); }
  if (rev > 0.8) { label(ctx, 'HABITUDE', 830, lastY - 230, { size: 28, color: RED, alpha: prog(rev, 0.8, 0.95) }); }
}

// 2. Rends-le ridiculement facile : le mur « 1 H DE SPORT » bloque, la marche « 5 POMPES » passe.
function r2(ctx, tl) {
  bg(ctx, '#060606'); floor(ctx, 1300);
  rule(ctx, tl, 2, [['RENDS-LE ', '#f1f1f1'], ['RIDICULEMENT', RED]], [['FACILE.', '#f1f1f1']]);
  const wallOut = ease.in(prog(tl, 2.4, 2.9));
  if (wallOut < 1) {
    ctx.save(); ctx.globalAlpha = 1 - wallOut; ctx.translate(0, wallOut * 400);
    box(ctx, 600, 640, 220, 660, '#3d3d40'); label(ctx, '1 H', 710, 930, { size: 64 }); label(ctx, 'DE SPORT', 710, 990, { size: 30, color: '#d0d0d2' });
    ctx.restore();
  }
  if (tl < 2.4) {
    const a = prog(tl, 0, 1.2), b2 = prog(tl, 1.2, 2.0);
    const x = tl < 1.2 ? lerp(180, 470, ease.in(a)) : lerp(470, 330, ease.out(b2));
    const p = tl < 1.2 ? run(tl * 1.8) : lerpPose(POSES.push, POSES.fall, ease.out(b2));
    drawStick(ctx, x, 1300 - 160 + (tl > 1.2 ? 60 * ease.out(b2) : 0), p, { scale: 1.0 });
    if (tl > 1.25 && tl < 1.9) label(ctx, 'TROP DUR', 470, 820, { size: 34, color: RED });
  } else {
    // marches de 5 pompes qui apparaissent une à une, le héros monte
    const n = Math.min(6, 1 + Math.floor((tl - 2.6) / 0.38));
    for (let i = 0; i < n; i++) { const k = pop(tl, 2.6 + i * 0.38, 0.2); ctx.save(); ctx.globalAlpha = clamp(k); box(ctx, 300 + i * 105, 1300 - 70 * (i + 1), 105, 70 * (i + 1), i === 0 ? '#5a5a5d' : '#3d3d40'); ctx.restore(); }
    label(ctx, '5 POMPES', 352, 1210, { size: 20, color: '#f1f1f1', track: 2 });
    const hop = clamp((tl - 2.75) / 0.38, 0, 6), i = Math.min(5, Math.floor(hop)), f = hop - i;
    const x = 300 + 52 + i * 105 + 105 * ease.inOut(Math.min(1, f));
    const yTop = (j) => 1300 - 70 * (j + 1);
    const y = lerp(yTop(i), yTop(Math.min(5, i + 1)), f) - Math.sin(Math.PI * Math.min(1, f)) * 60;
    drawStick(ctx, tl < 2.75 ? 250 : Math.min(x, 300 + 52 + 5 * 105), (tl < 2.75 ? 1300 : y) - 150, tl < 2.75 ? POSES.stand : run(f * 0.5), { scale: 0.95 });
    caption(ctx, [['TROP PETIT ', '#f1f1f1'], ['POUR ÉCHOUER.', RED]], 1440, 50, pop(tl, 3.3), 1);
  }
}

// 3. Décide la veille : sac prêt le soir, le matin on ne négocie pas.
function r3(ctx, tl) {
  const night = tl < 4 * B;
  bg(ctx, night ? '#03030a' : '#070707'); floor(ctx, 1300);
  rule(ctx, tl, 3, [['DÉCIDE ', '#f1f1f1'], ['LA VEILLE.', RED]], [['PAS SUR LE MOMENT.', '#9a9a9c']]);
  door(ctx, 760, 1300, night ? 0 : ease.inOut(prog(tl, 2.2, 2.7)), null, !night);
  if (night) {
    ctx.fillStyle = '#d9d9db'; ctx.beginPath(); ctx.arc(250, 700, 50, 0, 7); ctx.fill(); ctx.fillStyle = '#03030a'; ctx.beginPath(); ctx.arc(272, 688, 46, 0, 7); ctx.fill();
    label(ctx, '22 H — LA VEILLE', 540, 640, { size: 34, color: '#bdbdbf' });
    const k = ease.out(prog(tl, 0.2, 1.0));
    box(ctx, lerp(380, 600, k), 1210, 120, 90, '#5a5a5d'); label(ctx, 'SAC PRÊT', lerp(440, 660, k), 1190, { size: 22 });
    drawStick(ctx, lerp(300, 520, k), 1140, lerpPose(walk(tl * 1.6), POSES.crouch, prog(tl, 0.9, 1.3)), { scale: 1.0 });
  } else {
    const k = prog(tl, 4 * B, 4 * B + 0.3);
    ctx.save(); ctx.font = '900 120px Display'; ctx.textAlign = 'center'; ctx.fillStyle = '#f1f1f1'; ctx.globalAlpha = 1 - prog(tl, 2.3, 2.6); ctx.fillText('6 H 00', W / 2, 760); ctx.restore();
    box(ctx, 600, 1210, 120, 90, '#5a5a5d');
    // bulle « ENVIE ? » barrée en rouge
    const bk = pop(tl, 1.9);
    ctx.save(); ctx.globalAlpha = clamp(bk) * (1 - prog(tl, 3.0, 3.3)); ctx.fillStyle = '#2b2b2e'; ctx.beginPath(); ctx.roundRect(170, 860, 260, 100, 50); ctx.fill();
    label(ctx, 'ENVIE ?', 300, 925, { size: 34, color: '#bdbdbf' });
    if (tl > 2.15) { ctx.strokeStyle = RED; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(180, 940); ctx.lineTo(180 + 240 * ease.out(prog(tl, 2.15, 2.35)), 880); ctx.stroke(); }
    ctx.restore();
    const wk = prog(tl, 2.3, 3.8);
    drawStick(ctx, lerp(340, 880, ease.inOut(wk)), 1140, wk > 0 && wk < 1 ? walk(tl * 1.8) : POSES.stand, { scale: 1.0, alpha: 1 - prog(tl, 3.5, 3.85) });
    void k;
  }
}

// 4. Ne rate jamais deux fois : le calendrier se remplit, un raté, la chaîne repart.
function r4(ctx, tl) {
  bg(ctx, '#050505');
  rule(ctx, tl, 4, [['NE RATE JAMAIS ', '#f1f1f1'], ['DEUX FOIS.', RED]], null);
  const cols = 7, rows = 4, cs = 112, gx = (W - cols * cs) / 2 + 6, gy = 600;
  const filled = Math.floor(prog(tl, 0.5, 3.6) * 28);
  for (let i = 0; i < 28; i++) {
    const x = gx + (i % cols) * cs, y = gy + Math.floor(i / cols) * cs;
    ctx.fillStyle = '#18181a'; ctx.fillRect(x, y, cs - 12, cs - 12);
    ctx.strokeStyle = '#2f2f32'; ctx.lineWidth = 3; ctx.strokeRect(x, y, cs - 12, cs - 12);
    if (i < filled) {
      const cx = x + (cs - 12) / 2, cy = y + (cs - 12) / 2;
      if (i === 11) { ctx.strokeStyle = RED; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 26, cy - 26); ctx.lineTo(cx + 26, cy + 26); ctx.moveTo(cx + 26, cy - 26); ctx.lineTo(cx - 26, cy + 26); ctx.stroke(); }
      else { ctx.strokeStyle = i === 12 ? '#ffffff' : '#d9d9db'; ctx.lineWidth = i === 12 ? 16 : 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 28, cy + 2); ctx.lineTo(cx - 8, cy + 24); ctx.lineTo(cx + 30, cy - 24); ctx.stroke(); }
    }
  }
  label(ctx, 'JOUR 12 : RATÉ', gx + 4 * cs + 40, gy - 30, { size: 24, color: RED, alpha: filled > 11 ? 1 : 0 });
  caption(ctx, [['RATER 1 FOIS = ', '#f1f1f1'], ['UN ACCIDENT.', '#9a9a9c']], 1180, 42, pop(tl, 2.0), 1);
  caption(ctx, [['RATER 2 FOIS = ', '#f1f1f1'], ['UNE HABITUDE.', RED]], 1260, 42, pop(tl, 2.8), 1);
}

// 5. Montage serré : des actions minuscules.
const SHOTS = [
  ['5 POMPES', (ctx, k) => drawStick(ctx, 540, 1170 + 30 * Math.sin(k * Math.PI * 4), POSES.crouch, { scale: 1.0 })],
  ['1 PAGE', (ctx, k) => { drawStick(ctx, 480, 1100, POSES.sit, { scale: 1.0 }); ctx.fillStyle = '#f1f1f1'; ctx.fillRect(560, 1000, 90, 64); ctx.fillStyle = '#18181a'; ctx.fillRect(603, 1000, 4, 64); }],
  ['10 MIN DE MARCHE', (ctx, k) => drawStick(ctx, 380 + k * 300, 1090, walk(k * 1.2), { scale: 1.0 })],
  ['1 VERRE D’EAU', (ctx, k) => { drawStick(ctx, 520, 1090, lerpPose(POSES.stand, POSES.think, ease.out(clamp(k * 3))), { scale: 1.0 }); ctx.fillStyle = '#9fc3ff'; ctx.fillRect(590, 870, 40, 60); }],
  ['ÉCRAN COUPÉ À 22 H', (ctx, k) => { drawStick(ctx, 540, 1090, POSES.stand, { scale: 1.0 }); ctx.fillStyle = k < 0.3 ? '#cfe0ff' : '#2b2b2e'; ctx.fillRect(610, 950, 50, 90); }],
  ['AU LIT À 23 H', (ctx, k) => { bed(ctx, 280, 1220); drawStick(ctx, 520, 1150, POSES.lie, { scale: 0.85 }); }],
];
function montage(ctx, tl) {
  const i = Math.min(SHOTS.length - 1, Math.floor(tl / B)), k = (tl - i * B) / B;
  bg(ctx, i % 2 ? '#070707' : '#0b0b0c'); floor(ctx, 1250);
  const z = 1.14 - 0.14 * ease.out(k);
  ctx.save(); ctx.translate(W / 2, 1000); ctx.scale(z, z); ctx.translate(-W / 2, -1000); SHOTS[i][1](ctx, k); ctx.restore();
  caption(ctx, [[SHOTS[i][0], '#f1f1f1']], 470, 76, 1, 1.15 - 0.15 * ease.out(clamp(k * 3)));
  label(ctx, 'CHAQUE JOUR', W / 2, 550, { size: 30, color: RED, track: 8 });
  if (k < 0.18) { ctx.fillStyle = `rgba(255,255,255,${(0.28 * (1 - k / 0.18)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}

// 6. Chute : un escalier fait de toutes petites marches, le héros en haut.
function fin(ctx, tl) {
  bg(ctx, '#050505');
  const z = lerp(1.6, 1.0, ease.inOut(prog(tl, 0, 2.2)));
  ctx.save(); ctx.translate(820, 1080); ctx.scale(z, z); ctx.translate(-820, -1080);
  const N = 24;
  for (let i = 0; i < N; i++) { const x = 100 + i * 30, y = 1720 - i * 26; ctx.fillStyle = i % 2 ? '#2e2e31' : '#3a3a3d'; ctx.fillRect(x, y, 30, 1920 - y); }
  const topX = 100 + (N - 1) * 30 + 15, topY = 1720 - (N - 1) * 26;
  flag(ctx, topX + 40, topY, tl, prog(tl, 0.5, 1.5));
  drawStick(ctx, topX - 10, topY - 128, lerpPose(POSES.stand, POSES.victory, ease.out(prog(tl, 0.4, 0.9))), { scale: 0.8 });
  ctx.restore();
  topBand(ctx);
  caption(ctx, [['PETIT. FACILE. TOUS LES JOURS.', '#f1f1f1']], 400, 46, pop(tl, 1.2), 1);
  caption(ctx, [['C’EST ÇA, LA', '#f1f1f1']], 490, 60, pop(tl, 2.0), 1);
  caption(ctx, [['DISCIPLINE.', RED]], 590, 92, pop(tl, 2.3), 0.7 + 0.3 * pop(tl, 2.3));
}

const SCENES = [[S.hook, hook], [S.r1, r1], [S.r2, r2], [S.r3, r3], [S.r4, r4], [S.montage, montage], [S.fin, fin]];
export function draw(ctx, t) {
  if (t >= S.end - B) { hook(ctx, 0); return; }
  compose(ctx, t, SCENES, { B, pulseFrom: S.r1 });
}
export const samples = (t) => (t >= S.montage && t < S.fin ? 3 : 1);
export const post = grainVignette;
export const HITS = [
  { t: 0, sfx: 'impact', gain: 0.8 }, ...Array.from({ length: 7 }, (_, i) => ({ t: (i + 1) * B, sfx: 'tick', gain: 0.45 })),
  { t: 4 * B, sfx: 'pop', gain: 0.8 }, { t: S.r1 - 1.5 * B, sfx: 'riser', gain: 0.5, len: 1 },
  ...['r1', 'r2', 'r3', 'r4'].map((k) => ({ t: S[k] - 0.02, sfx: 'whoosh', gain: 0.45, len: 0.18 })),
  ...['r1', 'r2', 'r3', 'r4', 'montage', 'fin'].map((k) => ({ t: S[k], sfx: 'impact', gain: 0.75 })),
  ...['r1', 'r2', 'r3', 'r4'].map((k) => ({ t: S[k] + 0.05, sfx: 'pop', gain: 0.6 })),
  { t: S.r2 + 1.2, sfx: 'impact', gain: 0.8 }, ...Array.from({ length: 6 }, (_, i) => ({ t: S.r2 + 2.6 + i * 0.38, sfx: 'tick', gain: 0.6 })),
  { t: S.r3 + 4 * B, sfx: 'ding', gain: 0.5 }, { t: S.r3 + 2.15, sfx: 'pop', gain: 0.7 },
  { t: S.r4 + 0.5 + (11 / 28) * 3.1, sfx: 'impact', gain: 0.8 }, { t: S.r4 + 2.0, sfx: 'pop', gain: 0.6 }, { t: S.r4 + 2.8, sfx: 'pop', gain: 0.7 },
  ...SHOTS.map((_, i) => ({ t: S.montage + i * B, sfx: 'impact', gain: 0.65 })),
  { t: S.fin + 1.2, sfx: 'pop', gain: 0.6 }, { t: S.fin + 2.3, sfx: 'impact', gain: 1 }, { t: S.end - B, sfx: 'whoosh', gain: 0.6 },
];
void hash; void noise; void climb;
