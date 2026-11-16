// Vision « Le téléphone » — film original (style mentality). Tu penses scroller, il te scrolle.
import { W, H, timeline, bg, floor, caption, topBand, definition, bigWord, compose, grainVignette, phone, bed, door, drawStick, POSES, label, COLORS, clamp, prog, ease, pop, hash, lerp } from '../lib/kit.js';
import { walk, lerpPose, breathe } from '../lib/stick.js';

export { W, H };
export const BPM = 128;
const { B, S } = timeline(BPM, [['hook', 10], ['ecran', 8], ['def', 6], ['montage', 8], ['mot', 4], ['fin', 12]]);
export const DURATION = S.end;
export const MUSIC = { bpm: BPM, mood: 'sombre', dropAt: S.ecran, breakAt: S.mot, backAt: S.fin };

// 1. Le héros rapetisse à mesure qu'il scrolle.
function hook(ctx, tl) {
  bg(ctx, '#060606');
  // notifications qui montent en continu derrière le héros
  for (let i = 0; i < 14; i++) {
    const sp = 260 + hash(i) * 260, y = 1500 - ((tl * sp + hash(i + 9) * 1400) % 1400), x = 120 + hash(i + 3) * 840;
    ctx.globalAlpha = 0.25 + 0.5 * hash(i + 5);
    ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.roundRect(x - 90, y, 180, 54, 27); ctx.fill();
    ctx.fillStyle = i % 3 === 0 ? COLORS.red : '#55555a'; ctx.beginPath(); ctx.arc(x - 58, y + 27, 16, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  floor(ctx, 1300);
  // rétrécissement par à-coups, un par temps (ressort)
  const step = Math.min(10, Math.floor(tl / B)), within = (tl - step * B) / B;
  const k = Math.min(1, (step + ease.back(clamp(within * 2.5))) / 10);
  const sc = lerp(1.1, 0.5, k);
  const p = breathe(POSES.phone, tl * 3, 0.6);
  drawStick(ctx, 540, 1300 - 160 * sc, p, { scale: sc });
  phone(ctx, 540 + 70 * sc, 1300 - 250 * sc, 0.45 * sc, 0.7 + 0.3 * Math.sin(tl * 10));
  const hours = Math.min(7, 1 + Math.floor(k * 7));
  const hp = 1 + 0.25 * Math.exp(-within * 6);
  ctx.save(); ctx.translate(W / 2, 790); ctx.scale(hp, hp); ctx.font = '900 88px Display'; ctx.textAlign = 'center'; ctx.letterSpacing = '5px'; ctx.fillStyle = '#f1f1f1';
  ctx.fillText(`${hours} H`, 0, 30); ctx.restore();
  label(ctx, 'TEMPS D’ÉCRAN AUJOURD’HUI', W / 2, 880, { size: 26, color: '#9a9a9c', track: 4 });
  topBand(ctx);
  caption(ctx, [['TU PENSES ', '#f1f1f1'], ['SCROLLER.', '#f1f1f1']], 380, 70, pop(tl, -0.05, 0.3), 0.6 + 0.4 * pop(tl, -0.05, 0.3));
  caption(ctx, [['IL TE ', '#f1f1f1'], ['SCROLLE.', COLORS.red]], 468, 70, pop(tl, 2 * B, 0.3), 1);
}

// 2. L'écran géant aspire le héros.
function ecran(ctx, tl) {
  bg(ctx, '#040405');
  const z = 1 + tl * 0.05;
  ctx.save(); ctx.translate(W / 2, 960); ctx.scale(z, z); ctx.translate(-W / 2, -960);
  ctx.save(); ctx.shadowColor = '#9fc3ff'; ctx.shadowBlur = 90;
  ctx.fillStyle = '#1e1e21'; ctx.beginPath(); ctx.roundRect(190, 360, 700, 1240, 70); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#0c0c0e'; ctx.beginPath(); ctx.roundRect(225, 400, 630, 1160, 46); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(225, 400, 630, 1160, 46); ctx.clip();
  const scroll = tl * 900;
  for (let i = -1; i < 9; i++) {
    const y = 420 + ((i * 260 - scroll) % 2340 + 2340) % 2340 - 260;
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(255, y, 570, 220);
    ctx.fillStyle = '#4a4a4f'; ctx.fillRect(285, y + 30, 300, 26); ctx.fillRect(285, y + 76, 420, 18);
    ctx.fillStyle = hash(i + Math.floor((i * 260 - scroll) / 2340)) > 0.6 ? COLORS.red : '#3a3a3e'; ctx.beginPath(); ctx.arc(770, y + 50, 26, 0, 7); ctx.fill();
  }
  ctx.restore();
  // le héros est tiré dans l'écran
  const k = ease.in(prog(tl, 0.3, 8 * B));
  const hx = 540, hy = lerp(1720, 980, k), sc = lerp(0.62, 0.05, k);
  drawStick(ctx, hx, hy, lerpPose(POSES.stand, POSES.fall, clamp(k * 1.4)), { scale: sc, alpha: 1 - prog(tl, 7 * B, 8 * B) });
  ctx.restore();
  caption(ctx, [['3 H 47 ', COLORS.red], ['DE SCROLL.', '#f1f1f1']], 300, 60, pop(tl, 2 * B), 1);
}

// 3. Définition.
const DEF = ['Distraction', 'nom · /dis.trak.sjɔ̃/', 'Ce qui te vole ta journée', 'en te faisant croire', 'que tu te reposes.'];
const def = (ctx, tl) => definition(ctx, tl, DEF);

// 4. Montage serré : la journée entière passe dans l'écran.
const SHOTS = [
  ['7 H 00', (ctx, k) => { bed(ctx, 280, 1220); drawStick(ctx, 520, 1150, POSES.lie, { scale: 0.85 }); phone(ctx, 480, 1050, 0.4, 1); }],
  ['10 H 30', (ctx, k) => { drawStick(ctx, 540, 1090, POSES.phone, { scale: 1.0 }); phone(ctx, 610, 930, 0.45, 1); }],
  ['13 H 00', (ctx, k) => { ctx.fillStyle = '#3a3a3d'; ctx.fillRect(250, 1000, 580, 26); drawStick(ctx, 420, 1100, POSES.sit, { scale: 0.95 }); phone(ctx, 500, 960, 0.4, 1); }],
  ['16 H 00', (ctx, k) => { drawStick(ctx, 540, 1090, breathe(POSES.phone, k * 6), { scale: 1.0 }); phone(ctx, 610, 930, 0.45, 1); }],
  ['20 H 00', (ctx, k) => { drawStick(ctx, 420, 1100, POSES.sit, { scale: 0.95 }); phone(ctx, 500, 960, 0.4, 1); }],
  ['23 H 30', (ctx, k) => { bed(ctx, 280, 1220); drawStick(ctx, 520, 1150, POSES.lie, { scale: 0.85 }); phone(ctx, 480, 1050, 0.4, 1); }],
  ['1 H 00', (ctx, k) => { bed(ctx, 280, 1220); drawStick(ctx, 520, 1150, POSES.lie, { scale: 0.85, color: COLORS.gray }); phone(ctx, 480, 1050, 0.4, 1); }],
  ['STOP.', (ctx, k) => { drawStick(ctx, 540, 1090, lerpPose(POSES.phone, POSES.stand, ease.out(clamp(k * 3))), { scale: 1.0 }); phone(ctx, 610 + k * 40, 930 + ease.in(k) * 320, 0.45, 1 - k); }],
];
function montage(ctx, tl) {
  const i = Math.min(SHOTS.length - 1, Math.floor(tl / B)), k = (tl - i * B) / B;
  bg(ctx, i % 2 ? '#070707' : '#0b0b0c'); floor(ctx, 1250);
  const z = 1.14 - 0.14 * ease.out(k);
  ctx.save(); ctx.translate(W / 2, 1000); ctx.scale(z, z); ctx.translate(-W / 2, -1000); SHOTS[i][1](ctx, k); ctx.restore();
  caption(ctx, [[SHOTS[i][0], i === 7 ? COLORS.red : '#f1f1f1']], 470, 84, 1, 1.15 - 0.15 * ease.out(clamp(k * 3)));
  if (i < 7) label(ctx, 'SCROLL', W / 2, 560, { size: 34, color: '#8c8c8e', track: 8 });
  if (k < 0.18) { ctx.fillStyle = `rgba(255,255,255,${(0.28 * (1 - k / 0.18)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}

// 5. Mot géant.
const mot = (ctx, tl) => bigWord(ctx, tl, 'TEMPS.', [['IL NE ', '#bdbdbf'], ['REVIENT PAS.', COLORS.red]]);

// 6. Il pose le téléphone, reprend sa taille et part vers la lumière.
function fin(ctx, tl) {
  bg(ctx, '#050505'); floor(ctx, 1300);
  const open = ease.inOut(prog(tl, 1.2, 2.4));
  door(ctx, 760, 1300, open, null, true);
  if (open > 0) { const g = ctx.createLinearGradient(760, 0, 300, 0); g.addColorStop(0, `rgba(255,255,255,${0.16 * open})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(760, 880); ctx.lineTo(760, 1300); ctx.lineTo(150, 1300); ctx.fill(); }
  phone(ctx, 330, 1280, 0.35, 0.15 * (1 - prog(tl, 0, 1)));
  const grow = ease.out(prog(tl, 0.2, 1.4));
  const sc = lerp(0.5, 1.0, grow);
  const walkK = prog(tl, 2.2, 4.6);
  const x = lerp(400, 850, ease.inOut(walkK));
  const pose = walkK > 0 && walkK < 1 ? walk(tl * 1.7) : POSES.stand;
  drawStick(ctx, x, 1300 - 160 * sc, pose, { scale: sc, alpha: 1 - prog(tl, 4.4, 4.9) });
  caption(ctx, [['TON TEMPS, ', '#f1f1f1']], 430, 74, pop(tl, 2.6), 1);
  caption(ctx, [['C’EST TA ', '#f1f1f1'], ['VIE.', COLORS.red]], 530, 96, pop(tl, 3.1), 0.7 + 0.3 * pop(tl, 3.1));
}

const SCENES = [[S.hook, hook], [S.ecran, ecran], [S.def, def], [S.montage, montage], [S.mot, mot], [S.fin, fin]];
export function draw(ctx, t) {
  if (t >= S.end - B) { hook(ctx, 0); return; } // boucle sur l'ouverture
  compose(ctx, t, SCENES, { B, pulseFrom: S.ecran, noPulse: [[S.mot, S.fin]] });
}
export const samples = (t) => (t >= S.montage && t < S.mot ? 3 : 1);
export const post = grainVignette;
export const HITS = [
  { t: 0, sfx: 'impact', gain: 0.8 }, { t: 2 * B, sfx: 'pop', gain: 0.7 }, ...Array.from({ length: 9 }, (_, i) => ({ t: (i + 1) * B, sfx: 'tick', gain: 0.5 })),
  { t: S.ecran, sfx: 'whoosh', gain: 0.9 }, { t: S.ecran + 2 * B, sfx: 'pop', gain: 0.6 }, { t: S.ecran + 7 * B, sfx: 'riser', gain: 0.5, len: 1 },
  { t: S.def, sfx: 'impact', gain: 0.8 },
  ...SHOTS.map((_, i) => ({ t: S.montage + i * B, sfx: i % 2 ? 'impact' : 'whoosh', gain: 0.7, len: 0.25 })),
  { t: S.mot, sfx: 'impact', gain: 1 }, { t: S.fin, sfx: 'whoosh', gain: 0.7 }, { t: S.fin + 1.2, sfx: 'tick', gain: 0.7 },
  { t: S.fin + 2.6, sfx: 'pop', gain: 0.7 }, { t: S.fin + 3.1, sfx: 'impact', gain: 0.9 }, { t: S.end - B, sfx: 'whoosh', gain: 0.6 },
];
