// « Les 4 personnages » — vidéo d'accueil à épingler (série Toi contre toi). Présente chaque personnage en un plan :
// son nom, son trait, son geste. Image 0 : l'Ego tombe de sa chaise en voulant faire un selfie (action immédiate).
// Décors : plaques 3D Blender du bureau. Mode propre (?v=clean) + fiche MONTAGE pour le montage Remotion.
import { W, H, timeline, topBand, POSES, COLORS, clamp, prog, ease, pop, lerp, noise, hash, VARIANT, seriesTag, camera, dust, impactRing, kinetic, TEXTLOG } from '../lib/kit.js';
import { glow, bubble, sweat } from '../lib/world.js';
import { drawMember, CAST } from '../lib/cast.js';
import { cinema } from '../lib/light.js';
import { transition } from '../lib/trans.js';

export { W, H };
export const FPS = 60;
export const BPM = 124;
export const MUSIC = null;
const { B, S } = timeline(BPM, [['ouverture', 4], ['ego', 6], ['obsession', 6], ['chance', 6], ['discipline', 6], ['outro', 6], ['boucle', 2]]);
export const DURATION = S.end;
const RED = COLORS.red, SERIES = 'TOI CONTRE TOI · LES 4';
const log = (s) => TEXTLOG.frame.push(s);
const CLEAN = VARIANT === 'clean';

export const SCRIPT = {
  premiere: 'chute',
  accroche: VARIANT === 'b' ? ['QUI ATTEND', 'QUI ?'] : ['GTA 6 ARRIVE.', 'ET TOI, TU ATTENDS ?'],
  structure: ['ouverture', 'conflit', 'effort', 'progression', 'obstacle', 'retournement', 'chute'],
  dialogues: ['JE L’AI PRÉCOMMANDÉ !', 'ENCORE UNE BANDE-ANNONCE !', 'ÇA SORT QUAND ?', 'TOUJOURS PAS LÀ.'],
  conseils: [],
  details: ['couronne', 'lampe à selfies', '10 onglets', 'ticket de loto', 'calendrier'],
  chute: ['ET TOI,', 'TU ATTENDS QUOI ?'],
};

// ------------------------------------------------------------------ plaques Blender du bureau
const PLATES = ['large_nuit', 'ego', 'obsession', 'chance', 'discipline'];
const IMG = {}; let A = {};
export async function init() {
  A = await fetch('plates/business/anchors.json').then((r) => r.json());
  await Promise.all(PLATES.map(async (n) => { const im = new Image(); im.src = `plates/business/${n}.jpg`; await im.decode(); IMG[n] = im; }));
}
let CAM = { x: 540, y: 960, z: 1 };
const toScreen = (x, y) => ({ x: (x - CAM.x) * CAM.z + CAM.x, y: (y - CAM.y) * CAM.z + CAM.y });
function plate(ctx, name, { z = 1, x = 540, y = 960 } = {}) {
  const half = W / (2 * z), halfH = H / (2 * z);
  x = clamp(x, half, W - half); y = clamp(y, halfH, H - halfH);
  CAM = { x, y, z }; camera(ctx, { zoom: z, x, y });
  ctx.drawImage(IMG[name], 0, 0, W, H);
  ctx.fillStyle = 'rgba(2,3,8,0.28)'; ctx.fillRect(0, 0, W, H);
  return A[name];
}
const scOf = (a) => (1.9 * a.ego.ppm) / 424;
const typing = (t, speed = 9, lean = 10) => ({ ...POSES.sit, lean, head: 14, armB: [72 + Math.sin(t * speed) * 7, 62], armF: [80 + Math.cos(t * speed * 1.1) * 7, 56] });
const selfie = { ...POSES.sit, lean: -10, head: -12, armF: [150, 30], armB: [40, 70] };
const lounge = { ...POSES.sit, lean: -34, head: 6, armB: [20, 30], armF: [40, 60] };
function member(ctx, a, who, pose, opt = {}) { const s = a[who].seat; return drawMember(ctx, who, s[0], s[1], pose, { scale: scOf(a), showLabel: false, ...opt }); }
const headTop = (a, who) => [a[who].seat[0], a[who].seat[1] - scOf(a) * 330];
function screen(ctx, r, draw) { const [x0, y0, x1, y1] = r; ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip(); ctx.fillStyle = '#060a14'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); draw(x0, y0, x1 - x0, y1 - y0); ctx.restore(); }
const font = (h, k) => `900 ${Math.round(h * k)}px Display`;
function scrText(ctx, x, y, w, h, text, color, k = 0.3) { ctx.fillStyle = color; ctx.font = font(h, k); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + w / 2, y + h / 2); }
function scrTabs(ctx, x, y, w, h, t) { for (let i = 0; i < 10; i++) { const c = i % 4, r = Math.floor(i / 4), cw = w / 4.4, ch = h / 3.4; ctx.fillStyle = `hsl(${270 + i * 9},60%,${40 + 20 * hash(i + Math.floor(t * 6))}%)`; ctx.fillRect(x + w * 0.04 + c * cw * 1.08, y + h * 0.06 + r * ch * 1.1, cw, ch); } }
function scrCalendar(ctx, x, y, w, h, days) { for (let i = 0; i < 28; i++) { const c = i % 7, r = Math.floor(i / 7), cw = w / 7.6, ch = h / 4.8, cx = x + w * 0.04 + c * cw * 1.05, cy = y + h * 0.08 + r * ch * 1.15; ctx.fillStyle = i < days ? 'rgba(227,52,44,0.9)' : 'rgba(255,255,255,0.08)'; ctx.fillRect(cx, cy, cw, ch); } }

// ------------------------------------------------------------------ textes (moteur ; Remotion les refait en mode propre)
function card(ctx, who, tag, u) {
  if (CLEAN) return;
  const c = CAST[who]; topBand(ctx);
  kinetic(ctx, [[c.name, c.labelColor]], 430, 96, u, 0.05, { stagger: 0.08, rise: 40 });
  kinetic(ctx, [[tag, '#f1f1f1']], 525, 52, u, 0.12, { stagger: 0.06 });
}
const HOOK = VARIANT === 'b' ? [[['QUI ATTEND', '#f1f1f1']], [['QUI ?', RED]]] : [[['GTA 6 ARRIVE.', '#f1f1f1']], [['ET TOI, ', '#f1f1f1'], ['TU ATTENDS ?', RED]]];

// ------------------------------------------------------------------ 1. ouverture : l'Ego bascule de sa chaise (image 0)
function ouverture(ctx, tl) {
  const z = lerp(2.2, 1.55, ease.out(prog(tl, 0, 0.7))), quake = tl > 0.25 && tl < 0.8 ? 18 * Math.exp(-(tl - 0.25) * 6) : 0;
  ctx.save(); ctx.translate(noise(tl * 70, 3) * quake, noise(tl * 70, 8) * quake);
  const aw = A.large_nuit;
  const a = plate(ctx, 'large_nuit', { z, x: lerp(aw.ego.seat[0] + 60, 540, ease.inOut(prog(tl, 0.6, 1.9))), y: 1030 });
  screen(ctx, a.ego.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, '0 VUE', '#e3342c', 0.3));
  screen(ctx, a.obsession.monitor, (x, y, w, h) => scrTabs(ctx, x, y, w, h, tl));
  screen(ctx, a.chance.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, 'LOTO', '#7fdc9a', 0.3));
  screen(ctx, a.discipline.monitor, (x, y, w, h) => scrCalendar(ctx, x, y, w, h, 9));
  const fall = tl < 0 ? 0 : ease.in(prog(tl, 0, 0.28)), s = a.ego.seat;
  const egoPose = tl < 0 ? { ...selfie, lean: -10 + Math.sin(tl * 3) * 3, armF: [150 + Math.sin(tl * 5) * 8, 30] } : { ...POSES.sit, lean: lerp(-10, -88, fall), head: lerp(-12, 20, fall), armF: [lerp(150, 170, fall), 30], armB: [lerp(40, 160, fall), 30] };
  drawMember(ctx, 'ego', s[0] - 30 * fall * scOf(a) * 3, s[1] + 40 * fall * scOf(a) * 3, egoPose, { scale: scOf(a), t: tl, mouth: tl < 0 ? 'smirk' : 'open', mood: tl < 0 ? null : 'sad', showLabel: false });
  if (tl > 0.25) { dust(ctx, s[0] - 40, s[1] + 60, tl, 0.25, { n: 12, spread: 200 }); impactRing(ctx, s[0] - 40, s[1] + 40, tl, 0.25, { r: 140, color: '#e9c75a' }); }
  member(ctx, a, 'obsession', typing(tl, 22), { t: tl, mouth: 'grit', mood: 'angry' });
  member(ctx, a, 'chance', lounge, { t: tl, eyesClosed: true });
  member(ctx, a, 'discipline', typing(tl, 6, 4), { t: tl, mouth: 'grit', mood: 'determined' });
  ctx.restore();
  if (CLEAN) return;
  seriesTag(ctx, SERIES, pop(tl, 1.0));
  topBand(ctx);
  kinetic(ctx, HOOK[0], 400, 92, tl, -0.12, { stagger: 0.1 });
  kinetic(ctx, HOOK[1], 505, 100, tl, 2 * B, { stagger: 0.1, rise: 60 });
}

// ------------------------------------------------------------------ 2-5. un plan par personnage
const TAGS = { ego: 'IL A DÉJÀ TOUT PRÉCOMMANDÉ.', obsession: 'IL RAFRAÎCHIT LA PAGE.', chance: 'ELLE ESPÈRE UNE PROMO.', discipline: 'IL CONSTRUIT EN ATTENDANT.' };
function portrait(who) {
  return (ctx, u) => {
    const len = 6 * B, pr = u / len;
    ctx.save();
    const a = plate(ctx, who, { z: 1.08 + 0.12 * pr, x: 540 + 30 * Math.sin(u * 1.2), y: 1050 });
    const r = a[who].monitor, h = headTop(a, who), d = a[who].desk, ppm = a[who].ppm;
    if (who === 'ego') {
      screen(ctx, r, (x, y, w, hh) => scrText(ctx, x, y, w, hh, `${Math.round(3 * clamp(u / 2))} VUES`, '#e9c75a', 0.3));
      member(ctx, a, 'ego', { ...selfie, armF: [150 + Math.sin(u * 4) * 6, 30], head: -12 + Math.sin(u * 3) * 4 }, { t: u, mouth: 'smirk' });
      if (Math.floor(u * 3) % 2 === 0) glow(ctx, h[0] + 60, h[1] + 80, 150, '255,255,255', 0.8);
      if (u > 0.35) bubble(ctx, 'JE L’AI PRÉCOMMANDÉ !', h[0] + 30, h[1] - 50, u, 0.35, { log });
    } else if (who === 'obsession') {
      screen(ctx, r, (x, y, w, hh) => scrTabs(ctx, x, y, w, hh, u));
      const p = typing(u, 28, 18);
      member(ctx, a, 'obsession', p, { t: u, mouth: 'grit', mood: 'angry' });
      sweat(ctx, a.obsession.seat[0], a.obsession.seat[1], p, u * 2, { scale: scOf(a) });
      if (u > 0.35) bubble(ctx, 'ENCORE UNE BANDE-ANNONCE !', h[0] + 30, h[1] - 50, u, 0.35, { log });
    } else if (who === 'chance') {
      screen(ctx, r, (x, y, w, hh) => scrText(ctx, x, y, w, hh, 'LOTO', '#7fdc9a', 0.32));
      member(ctx, a, 'chance', { ...lounge, head: 6 + Math.sin(u * 2) * 4 }, { t: u, eyesClosed: u < 1.2, mouth: u > 1.2 ? 'happy' : null });
      for (let z = 0; z < 3; z++) { if (u > 1.2) break; const ph = (u * 0.8 + z / 3) % 1; ctx.save(); ctx.globalAlpha = 1 - ph; ctx.font = `900 ${30 + z * 8}px Display`; ctx.fillStyle = '#7fdc9a'; ctx.fillText('z', h[0] + 40 + ph * 40, h[1] - ph * 90); ctx.restore(); }
      // un trèfle tombe du ciel… à côté
      const fy = d[1] - ppm * 2.2 + Math.min(1, u / 1.4) ** 2 * ppm * 2.2; ctx.fillStyle = '#4fbf6c'; for (let q = 0; q < 4; q++) { ctx.beginPath(); ctx.arc(d[0] + ppm * 0.9 + Math.cos(q * 1.57) * 10, fy + Math.sin(q * 1.57) * 10, 9, 0, 7); ctx.fill(); }
      if (u > 0.35) bubble(ctx, 'ÇA SORT QUAND ?', h[0] + 30, h[1] - 70, u, 0.35, { log });
    } else {
      screen(ctx, r, (x, y, w, hh) => scrCalendar(ctx, x, y, w, hh, 9 + Math.floor(prog(u, 0.2, 2.4) * 19)));
      member(ctx, a, 'discipline', typing(u, 6, 5), { t: u, mouth: 'grit', mood: 'determined' });
      if (u > 0.35) bubble(ctx, 'TOUJOURS PAS LÀ.', h[0] + 30, h[1] - 50, u, 0.35, { log });
    }
    ctx.restore();
    card(ctx, who, TAGS[who], u);
  };
}

// ------------------------------------------------------------------ 6. fin : « Et toi, tu es lequel ? »
function outro(ctx, tl) {
  ctx.save();
  const a = plate(ctx, 'large_nuit', { z: 1.6 - 0.15 * ease.inOut(prog(tl, 0, 2.9)), x: 540, y: 1030 });
  screen(ctx, a.ego.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, '0 VUE', '#e3342c', 0.3));
  screen(ctx, a.obsession.monitor, (x, y, w, h) => scrTabs(ctx, x, y, w, h, tl));
  screen(ctx, a.chance.monitor, (x, y, w, h) => scrText(ctx, x, y, w, h, 'LOTO', '#7fdc9a', 0.3));
  screen(ctx, a.discipline.monitor, (x, y, w, h) => scrCalendar(ctx, x, y, w, h, 28));
  ['ego', 'obsession', 'chance', 'discipline'].forEach((who, i) => {
    const k = ease.back(prog(tl, 0.1 + i * 0.15, 0.4 + i * 0.15));
    member(ctx, a, who, who === 'ego' ? selfie : who === 'chance' ? lounge : typing(tl, who === 'obsession' ? 22 : 6), { t: tl, mouth: 'happy', showLabel: !CLEAN && k > 0.5 });
  });
  ctx.restore();
  if (CLEAN) return;
  topBand(ctx);
  kinetic(ctx, [['ET TOI,', '#f1f1f1']], 420, 80, tl, 0.1);
  kinetic(ctx, [['TU ATTENDS ', '#f1f1f1'], ['QUOI ?', RED]], 525, 100, tl, 0.6, { rise: 60 });
  const k = pop(tl, 1.2, 0.25);
  if (k > 0) {
    ctx.save(); ctx.globalAlpha = clamp(k); ctx.translate(W / 2, 1480); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
    ctx.font = '900 44px Display'; ctx.letterSpacing = '3px'; const w = ctx.measureText('ABONNE-TOI').width + 90;
    ctx.fillStyle = RED; ctx.beginPath(); ctx.roundRect(-w / 2, -42, w, 84, 42); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ABONNE-TOI', 0, 2); ctx.restore();
    if (k >= 0.5) log('ABONNE-TOI');
  }
}
const BOUCLE = 2 * B;
const boucle = (ctx, tl) => ouverture(ctx, tl - BOUCLE);

const SCENES = [[S.ouverture, ouverture], [S.ego, portrait('ego')], [S.obsession, portrait('obsession')], [S.chance, portrait('chance')], [S.discipline, portrait('discipline')], [S.outro, outro], [S.boucle, boucle]];
const CUTS = [
  { t: S.ego, type: 'whip', dir: 1 }, { t: S.obsession, type: 'whip', dir: -1 }, { t: S.chance, type: 'whip', dir: 1 },
  { t: S.discipline, type: 'zoom', d: 0.3 }, { t: S.outro, type: 'glitch', d: 0.26 }, { t: S.boucle, type: 'zoom', d: 0.3 },
];
function renderAt(ctx, t) {
  TEXTLOG.frame = [];
  CAM = { x: 540, y: 960, z: 1 };
  let k = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i][0]) k = i;
  const [t0, fn] = SCENES[k];
  const since = t - t0, sh = k > 0 && k !== 6 ? 10 * Math.exp(-since * 9) : 0;
  ctx.save(); ctx.translate(noise(t * 50, 5) * sh, noise(t * 50, 9) * sh);
  fn(ctx, since);
  ctx.restore();
}
export function draw(ctx, t) {
  if (!CLEAN && transition(ctx, t, renderAt, CUTS)) return;
  renderAt(ctx, t);
}
export const samples = (t) => (t < S.ego || t >= S.boucle ? 2 : 1);
export const post = cinema(() => ({ threshold: 0.8, bloom: 1.0, fog: { density: 0.22, height: 0.35, color: '#1a1e30' }, warm: 1 }));
void toScreen;

// ------------------------------------------------------------------ fiche de montage Remotion
const W_ = '#f1f1f1';
const WHO = ['ego', 'obsession', 'chance', 'discipline'];
export const MONTAGE = {
  fps: FPS, duration: S.end, series: SERIES,
  hook: { a: [[['GTA 6 ARRIVE.', W_]], [['ET TOI, ', W_], ['TU ATTENDS ?', RED]]], b: [[['QUI ATTEND', W_]], [['QUI ?', RED]]], line2At: 2 * B, end: S.ego },
  bands: [[0, S.ego], [S.ego, S.outro], [S.outro, S.boucle]],
  titles: [],
  cards: WHO.map((w) => ({ who: w, tag: TAGS[w], start: S[w] + 0.04, end: S[w] + 6 * B })),
  tips: [],
  lines: [{ words: [['ET TOI,', W_]], start: S.outro + 0.1, end: S.boucle, size: 80, y: 420 }, { words: [['TU ATTENDS ', W_], ['QUOI ?', RED]], start: S.outro + 0.6, end: S.boucle, size: 100, y: 545, stagger: 0.1 }],
  cuts: CUTS.map((c) => ({ t: c.t, type: c.type, dir: c.dir })),
  subscribe: { start: S.outro + 1.2, end: S.boucle },
};

// ------------------------------------------------------------------ son : un motif sonore par personnage (identité sonore)
const CUT_SFX = CUTS.flatMap((c) => c.type === 'whip' ? [{ t: c.t, sfx: 'whip', gain: 0.55 }] : c.type === 'glitch' ? [{ t: c.t, sfx: 'glitch', gain: 0.4, len: c.d }] : [{ t: c.t, sfx: 'whoosh', gain: 0.45, len: 0.3 }, { t: c.t + 0.1, sfx: 'sub', gain: 0.45 }]);
export const HITS = [
  { t: 0, sfx: 'room', gain: 0.4, len: S.end },
  ...CUT_SFX,
  { t: 0, sfx: 'whoosh', gain: 0.4, len: 0.3 }, { t: 0.25, sfx: 'thud', gain: 0.5 }, { t: 0.25, sfx: 'impact', gain: 0.35 }, { t: 0.27, sfx: 'sub', gain: 0.5 }, { t: 2 * B, sfx: 'pop', gain: 0.3 },
  // l'Ego : déclencheur photo + « ding » doré
  ...Array.from({ length: 5 }, (_, i) => ({ t: S.ego + 0.3 + i * 0.33, sfx: 'click', gain: 0.25 })), { t: S.ego + 0.35, sfx: 'ding', gain: 0.3 },
  // l'Obsession : frappe frénétique + notifications
  { t: S.obsession, sfx: 'type', gain: 0.45, len: 6 * B }, ...Array.from({ length: 4 }, (_, i) => ({ t: S.obsession + 0.3 + i * 0.5, sfx: 'notif', gain: 0.14, len: 0.8 })),
  // la Chance : ronflement léger puis « boing » du trèfle
  { t: S.chance + 0.2, sfx: 'whoosh', gain: 0.2, len: 1 }, { t: S.chance + 1.4, sfx: 'boing', gain: 0.35 }, { t: S.chance + 0.35, sfx: 'pop', gain: 0.25 },
  // Discipline : frappe régulière + tic du calendrier
  { t: S.discipline, sfx: 'type', gain: 0.22, len: 6 * B }, ...Array.from({ length: 5 }, (_, i) => ({ t: S.discipline + 0.3 + i * 0.5, sfx: 'tick', gain: 0.3 })),
  // fin
  ...Array.from({ length: 4 }, (_, i) => ({ t: S.outro + 0.1 + i * 0.15, sfx: 'pop', gain: 0.25 })), { t: S.outro + 0.6, sfx: 'sub', gain: 0.5 }, { t: S.outro + 1.2, sfx: 'pop', gain: 0.3 },
];
