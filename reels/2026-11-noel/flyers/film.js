// IL4N Studio — Noël −20 % sur les flyers. Fonction pure du temps : window.seek(t) peint l'image t.
// Plan : docs/shotlist.md. Temps en beats (u) sur la grille de beats.json (128 bpm, drop au temps 8).
// Repris du reel validé (reel/film.js) : charte, helpers, transitions. Captures réelles du site au 17/11/2026.
import * as M from './lib/motion.js';
import { SUBS } from './subs.js';

const { W, H, E, prog, lerp, clamp, springU, SPRING, wobble, font, layout, glyph, text, fill, cover, crop, rrect, shake, mix, bump } = M;

// Charte (brief Noël) : or = accent principal, rouge Noël et vert en touches.
const C = { night: '#111018', night2: '#1b1825', paper: '#f4f0e8', white: '#fffdf8', ink: '#17131d', gold: '#d6a96a', muted: '#a49eaa', ink2: '#6d6870', red: '#b0482f', green: '#3f8a62', grey: '#c9c4c0' };
const D = 'Display', A = 'Accent';
const X0 = 72;

const HITS = [
  [0, 'Noël', 'impact'],
  [0.75, 'approche', 'pop', { pitch: 'E5' }],
  [2.0, 'Votre flyer', 'pop', { pitch: 'G5' }],
  [3.0, 'lui ?', 'boing', { pitch: 'B5', to: 'E6' }],
  [4.85, 'whip vers la pile', 'whoosh', { len: 0.4, from: 500, to: 2400 }],
  [5.25, 'pile de flyers', 'thud'],
  [6.0, 'flyer', 'click'],
  [6.6, 'flyer', 'click'],
  [7.4, 'montée', 'riser', { len: 0.6 }],
  [8, 'DROP : Start', 'impact'],
  [9, 'Pro', 'thud'],
  [10, 'Prestige', 'thud'],
  [13.7, 'whip vers les prix', 'whoosh', { len: 0.4, from: 2600, to: 600, pan: 0.3 }],
  [13.75, 'pastille −20 %', 'boing', { pitch: 'E5', to: 'B5' }],
  [15.25, '21 → 16', 'tick'],
  [16.5, '35 → 28', 'tick'],
  [17.75, '49 → 39', 'tick'],
  [19, '10 jours', 'bell', { pitch: 'E6' }],
  [20.7, 'téléphone', 'whoosh', { len: 0.4, from: 600, to: 2000 }],
  [21.4, 'téléphone posé', 'thud'],
  [23.5, 'fin 25/11', 'blip', { pitch: 'B5' }],
  [27.75, 'volet', 'whoosh', { len: 0.3, from: 400, to: 1800 }],
  [28.5, 'carte de fin', 'impact'],
  [29, 'logo', 'bell', { pitch: 'E6' }],
  [29.8, 'bonnet', 'pop', { pitch: 'B5' }],
];

// ---------------------------------------------------------------- helpers (repris de reel/)
const box = (ctx, x, y, w, h, r, color) => { rrect(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); };
function shadow(ctx, blur, y, a = 0.45) { ctx.shadowColor = `rgba(0,0,0,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = y; }
function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }
function springLine(ctx, str, x, base, f, color, u, u0, { stagger = 0.035, drop = 120, cfg = SPRING.bouncy, track = 0, groups = null } = {}) {
  const L = layout(ctx, str, f, track);
  L.glyphs.forEach((g, j) => {
    const start = groups ? groups(j) : u0 + j * stagger;
    const k = springU(u, start, cfg);
    if (k <= 0.001) return;
    glyph(ctx, g.ch, x + g.cx, base + (1 - k) * drop, f, color, clamp(k, 0, 1.3), clamp(k, 0, 1.3));
  });
  return L;
}
function arrowNE(ctx, x, y, s, color, lw) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x + s, y); ctx.moveTo(x + s * 0.25, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + s * 0.75); ctx.stroke(); ctx.restore();
}
function phone(ctx, x, y, w, h, draw) {
  ctx.save(); shadow(ctx, 80, 40, 0.55); box(ctx, x, y, w, h, w * 0.14, '#08070c'); noShadow(ctx);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; rrect(ctx, x + 1, y + 1, w - 2, h - 2, w * 0.14); ctx.stroke();
  const b = w * 0.035, sx = x + b, sy = y + b, sw = w - 2 * b, sh = h - 2 * b;
  ctx.save(); rrect(ctx, sx, sy, sw, sh, w * 0.11); ctx.clip(); draw(ctx, sx, sy, sw, sh); ctx.restore();
  box(ctx, x + w / 2 - w * 0.14, sy + w * 0.03, w * 0.28, w * 0.075, w * 0.04, '#000');
  ctx.restore();
}
function kicker(ctx, str, y, color, a = 1, x = X0) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(x, y - 13, 56, 3);
  text(ctx, str, x + 76, y, font(30, 700, D), color, 'left', 5); ctx.restore();
}

// ---------------------------------------------------------------- décors de Noël (dessinés en code)
// flocon à 6 branches
function flake(ctx, x, y, r, rot, a, color = C.white) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, r * 0.12); ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r);
    ctx.moveTo(0, -r * 0.55); ctx.lineTo(-r * 0.22, -r * 0.75); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.22, -r * 0.75); ctx.stroke();
  }
  ctx.restore();
}
// neige : flocons déterministes (graine fixe), chute lente
const RNG = M.mulberry32 ? M.mulberry32(1125) : (() => { let s = 1125; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const FLAKES = Array.from({ length: 16 }, () => ({ x: RNG() * W, y: RNG() * H, r: 10 + RNG() * 22, v: 40 + RNG() * 70, s: RNG() * 6, sp: (RNG() - 0.5) * 0.6 }));
function snow(ctx, t, a = 0.5, color = C.white) {
  FLAKES.forEach((f) => {
    const y = ((f.y + t * f.v) % (H + 80)) - 40, x = f.x + Math.sin(t * 0.8 + f.s) * 26;
    flake(ctx, x, y, f.r, f.s + t * f.sp, a * (0.35 + f.r / 60), color);
  });
}
// guirlande de points or / rouge / vert, comme sur le site
function garland(ctx, y, t, a = 1, x0 = -20, x1 = W + 20) {
  const cols = [C.gold, C.red, C.green];
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = 'rgba(244,240,232,0.25)'; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, y + Math.sin(x / 90) * 10); ctx.stroke();
  let i = 0;
  for (let x = x0 + 20; x < x1; x += 46, i++) {
    const blink = 0.65 + 0.35 * Math.sin(t * 3 + i * 1.7);
    ctx.globalAlpha = a * blink; ctx.beginPath(); ctx.arc(x, y + Math.sin(x / 90) * 10 + 9, 9, 0, M.TAU); ctx.fillStyle = cols[i % 3]; ctx.fill();
  }
  ctx.restore();
}
// bonnet de Père Noël (posé sur un point, inclinaison rot)
function bonnet(ctx, x, y, s, rot, k = 1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s * k, s * k);
  ctx.beginPath(); ctx.moveTo(-50, 0); ctx.quadraticCurveTo(-30, -70, 20, -88); ctx.quadraticCurveTo(48, -96, 60, -60); ctx.quadraticCurveTo(30, -60, 50, 0); ctx.closePath();
  ctx.fillStyle = C.red; ctx.fill();
  box(ctx, -60, -14, 120, 30, 15, C.white);
  ctx.beginPath(); ctx.arc(62, -58, 15, 0, M.TAU); ctx.fillStyle = C.white; ctx.fill();
  ctx.restore();
}
// pastille ronde « −20 % »
function pastille(ctx, cx, cy, r, k, label = '−20 %', sub = 'NOËL · FLYERS') {
  if (k <= 0) return;
  const s = clamp(k, 0, 1.25);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.2 + (1 - Math.min(1, k)) * -0.8); ctx.scale(s, s);
  shadow(ctx, 40, 18, 0.4);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, M.TAU); ctx.fillStyle = C.red; ctx.fill(); noShadow(ctx);
  ctx.strokeStyle = C.gold; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, M.TAU); ctx.stroke();
  text(ctx, label, 0, r * 0.12, font(r * 0.5, 900, D), C.white, 'center', -2);
  text(ctx, sub, 0, r * 0.42, font(r * 0.13, 800, D), '#ffe9b8', 'center', 2);
  ctx.restore();
}

// ---------------------------------------------------------------- S1 accroche (u 0..5)
function sHook(ctx, u, t) {
  fill(ctx, C.night);
  const g = ctx.createRadialGradient(760, 700, 0, 760, 700, 780);
  g.addColorStop(0, 'rgba(214,169,106,0.16)'); g.addColorStop(1, 'rgba(214,169,106,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  snow(ctx, t, 0.45);
  garland(ctx, 300, t, clamp(springU(u, 0, SPRING.gentle)));
  kicker(ctx, 'OFFRE FLASH DE NOËL', 520, C.gold, clamp(E.outCubic(prog(u, -0.3, 0.6))));
  // « Noël » claque sur le beat 0 (déjà en mouvement à l'image 0), « approche. » suit
  const f1 = font(150, 900, D);
  springLine(ctx, 'Noël', X0 - 6, 730, f1, C.white, u, -0.35, { stagger: 0.05, drop: 170, track: -6 });
  springLine(ctx, 'approche.', X0 - 6, 880, font(130, 900, D), C.white, u, 0.6, { stagger: 0.03, drop: 140, track: -5 });
  // « Votre flyer, lui ? » : « lui ? » en italique dorée
  const f3 = font(78, 700, D);
  springLine(ctx, 'Votre flyer,', X0, 1030, f3, C.muted, u, 1.9, { stagger: 0.03, drop: 90 });
  const L3 = layout(ctx, 'Votre flyer, ', f3, 0);
  const k = springU(u, 2.9, SPRING.wobbly);
  if (k > 0) {
    const sq = 0.1 * wobble(u - 3.2, 2.4, 4);
    ctx.save(); ctx.translate(X0 + L3.width, 1030); ctx.scale(clamp(k) * (1 + sq), clamp(k) * (1 - sq));
    text(ctx, 'lui ?', 0, 0, font(120, 400, A), C.gold); ctx.restore();
  }
}

// ---------------------------------------------------------------- S2 problème : la pile grise (u 5..8)
const PILE = Array.from({ length: 7 }, (_, i) => ({ x: 120 + ((i * 397) % 600), y: 470 + ((i * 263) % 520), rot: ((i * 73) % 40 - 20) / 100, u0: 5.2 + i * 0.32 }));
function blandFlyer(ctx, x, y, w, h, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); shadow(ctx, 30, 14, 0.35);
  box(ctx, -w / 2, -h / 2, w, h, 10, '#d8d4cf'); noShadow(ctx);
  box(ctx, -w / 2 + 26, -h / 2 + 30, w - 52, 46, 6, '#b9b4ae');
  box(ctx, -w / 2 + 26, -h / 2 + 96, w - 120, 16, 6, '#c6c1bb'); box(ctx, -w / 2 + 26, -h / 2 + 124, w - 80, 16, 6, '#c6c1bb');
  box(ctx, -w / 2 + 26, -h / 2 + 170, w - 52, h - 250, 8, '#cbc6c0');
  box(ctx, -w / 2 + 26, h / 2 - 56, w - 160, 18, 6, '#b9b4ae');
  ctx.restore();
}
function sProblem(ctx, u, t) {
  fill(ctx, C.night2);
  PILE.forEach((p) => {
    const k = springU(u, p.u0, SPRING.snappy); if (k <= 0) return;
    blandFlyer(ctx, p.x + 60, p.y - (1 - k) * 900, 300, 420, p.rot * (1 + (1 - k) * 3));
  });
  // voile qui « éteint » la pile
  const dim = E.inOutCubic(prog(u, 6.6, 7.6));
  ctx.fillStyle = `rgba(17,16,24,${0.15 + dim * 0.45})`; ctx.fillRect(0, 0, W, H);
  const kt = springU(u, 5.6, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(kt * 1.4);
  text(ctx, 'Un flyer de plus', X0, 1130 - (1 - kt) * 40, font(64, 800, D), C.white);
  text(ctx, 'qui passe inaperçu…', X0, 1218 - (1 - kt) * 30, font(76, 400, A), C.gold);
  ctx.restore();
}

// ---------------------------------------------------------------- S3 les 3 vraies cartes (u 8..14)
const CARDS = [
  { img: 'c1', cx: 270, cy: 880, rot: -0.1, u0: 8 },
  { img: 'c3', cx: 810, cy: 900, rot: 0.09, u0: 10 },
  { img: 'c2', cx: 540, cy: 840, rot: -0.01, u0: 9 },
];
const CW = 450, CH = 905;
function sCards(ctx, u, t, IMG) {
  fill(ctx, C.paper);
  snow(ctx, t, 0.25, C.gold);
  ctx.save(); shake(ctx, u, 8, 20, 5, 0.12);
  CARDS.forEach((cd) => {
    const k = springU(u, cd.u0 - 0.2, SPRING.bouncy); if (k <= 0) return;
    const y = cd.cy - (1 - k) * 1400, rot = cd.rot + (1 - k) * cd.rot * 4;
    ctx.save(); ctx.translate(cd.cx, y); ctx.rotate(rot); shadow(ctx, 50, 24, 0.25);
    box(ctx, -CW / 2, -CH / 2, CW, CH, 22, C.white); noShadow(ctx);
    const im = IMG[cd.img]; if (im) { ctx.save(); rrect(ctx, -CW / 2, -CH / 2, CW, CH, 22); ctx.clip(); ctx.drawImage(im, -CW / 2, -CH / 2, CW, CH); ctx.restore(); }
    ctx.restore();
  });
  ctx.restore();
  kicker(ctx, 'LES 3 FORMULES · CAPTURE DU SITE', 330, '#9a663e', clamp(springU(u, 8.2, SPRING.gentle)));
}

// ---------------------------------------------------------------- S4 prix barrés (u 14..21)
const PRIX = [['Flyer Start', '21 €', '16 €', 15.25], ['Flyer Pro', '35 €', '28 €', 16.5], ['Flyer Prestige', '49 €', '39 €', 17.75]];
function sPrices(ctx, u, t) {
  fill(ctx, C.night);
  snow(ctx, t, 0.35);
  pastille(ctx, 800, 520, 160, springU(u, 13.75, SPRING.wobbly));
  kicker(ctx, 'PRIX DE NOËL · AFFICHÉS SUR LE SITE', 360, C.gold, clamp(springU(u, 13.8, SPRING.gentle)));
  PRIX.forEach(([nom, old, neu, u0], i) => {
    const y = 780 + i * 190, k = springU(u, u0 - 0.35, SPRING.snappy); if (k <= 0) return;
    ctx.save(); ctx.globalAlpha = clamp(k * 1.5); ctx.translate((1 - k) * -120, 0);
    text(ctx, nom, X0, y - 70, font(40, 700, D), C.muted);
    const fo = font(84, 800, D); text(ctx, old, X0, y + 20, fo, '#8b8590');
    ctx.font = fo; const ow = ctx.measureText(old).width;
    const sp = E.outCubic(prog(u, u0, u0 + 0.35));            // le trait barre l'ancien prix
    if (sp > 0) { ctx.strokeStyle = C.red; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X0 - 6, y - 8); ctx.lineTo(X0 - 6 + (ow + 12) * sp, y - 8 - 14 * sp); ctx.stroke(); }
    const kn = springU(u, u0 + 0.25, SPRING.wobbly);
    if (kn > 0) { ctx.save(); ctx.translate(X0 + ow + 70, y + 26); ctx.scale(clamp(kn, 0, 1.2), clamp(kn, 0, 1.2)); text(ctx, neu, 0, 0, font(150, 900, D), C.gold, 'left', -4); ctx.restore(); }
    ctx.restore();
  });
  // « 10 jours » : la durée réelle de l'offre flash
  const kj = springU(u, 19, SPRING.bouncy);
  if (kj > 0) {
    ctx.save(); ctx.globalAlpha = clamp(kj * 1.4);
    box(ctx, X0, 1250 - (1 - kj) * 40, 520, 92, 46, C.gold);
    text(ctx, 'Offre flash : 10 jours', X0 + 34, 1311 - (1 - kj) * 40, font(42, 800, D), C.ink);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- S5 le vrai site, plan stable lisible (u 21..28)
const R5 = { x: X0, y: 440, w: W - 2 * X0, h: 640 };
function sSite(ctx, u, t, IMG, rise) {
  fill(ctx, C.night2);
  snow(ctx, t, 0.3);
  const lk = springU(u, 21.4, SPRING.gentle);
  kicker(ctx, 'LE VRAI SITE · CAPTURE DU 17/11', 340, C.gold, clamp(lk));
  // la capture : bandeau de Noël + vrai compte à rebours, sans zoom (plan fixe ~2 s)
  const y = R5.y + (1 - rise) * 1500;
  ctx.save(); shadow(ctx, 80, 36, 0.55); box(ctx, R5.x, y, R5.w, R5.h, 34, C.night); noShadow(ctx);
  ctx.save(); rrect(ctx, R5.x, y, R5.w, R5.h, 34); ctx.clip();
  const im = IMG.top; if (im) { const sh = im.width * R5.h / R5.w; crop(ctx, im, [0, 0, im.width, sh], R5.x, y, R5.w, R5.h); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; rrect(ctx, R5.x, y, R5.w, R5.h, 34); ctx.stroke();
  ctx.restore();
  // fin réelle de l'offre, puis la suite (décembre) : pas de « dernière chance »
  const kf = springU(u, 23.4, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(kf * 1.4);
  text(ctx, 'Fin : 25/11 à 23 h 59', X0, 1262 - (1 - kf) * 30, font(56, 800, D), C.white);
  ctx.restore();
  const kd = springU(u, 25, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(kd * 1.4);
  text(ctx, 'puis offre de décembre, du 1er au 31/12', X0, 1318, font(34, 600, D), C.muted);
  ctx.restore();
}

// ---------------------------------------------------------------- S6 carte de fin (u 28..36), boucle vers S1
const PILL = { x: X0, y: 1090, w: W - 2 * X0 - 40, h: 132 };
function sEnd(ctx, u, t) {
  fill(ctx, C.night);
  const g = ctx.createRadialGradient(760, 700, 0, 760, 700, 780);
  g.addColorStop(0, 'rgba(214,169,106,0.16)'); g.addColorStop(1, 'rgba(214,169,106,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  snow(ctx, t, 0.45);
  garland(ctx, 300, t, 1);
  const f = font(220, 900, D);
  const L = springLine(ctx, 'il4n', X0 - 8, 700, f, C.white, u, 28.6, { stagger: 0.06, drop: 140, track: -10 });
  const kd = springU(u, 29, SPRING.wobbly);
  if (kd > 0) { ctx.beginPath(); ctx.arc(X0 - 8 + L.width + 32, 683, 21 * kd, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill(); }
  bonnet(ctx, X0 + 34, 540, 0.95, -0.35, springU(u, 29.8, SPRING.wobbly));     // le bonnet du site, sur le « i »
  const t1 = springU(u, 29.4, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(t1 * 1.4);
  text(ctx, 'Flyers −20 % pour Noël.', X0, 840 - (1 - t1) * 40, font(70, 400, A), C.gold);
  text(ctx, 'Maquette gratuite · vous validez avant de payer', X0, 910 - (1 - t1) * 30, font(34, 600, D), C.muted);
  ctx.restore();
  const br = 1 + 0.035 * bump(u, 31, 0.6);
  ctx.save(); ctx.translate(PILL.x + PILL.w / 2, PILL.y + PILL.h / 2); ctx.scale(br, br); ctx.translate(-(PILL.x + PILL.w / 2), -(PILL.y + PILL.h / 2));
  box(ctx, PILL.x, PILL.y, PILL.w, PILL.h, PILL.h / 2, C.gold);
  ctx.globalAlpha = clamp(springU(u, 28.8, SPRING.gentle) * 1.5);
  text(ctx, 'Écrivez-moi en privé', PILL.x + 56, PILL.y + PILL.h / 2 + 19, font(54, 800, D), C.ink);
  arrowNE(ctx, PILL.x + PILL.w - 92, PILL.y + PILL.h / 2 - 20, 38, C.ink, 7);
  ctx.restore();
  const t3 = springU(u, 30.2, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(t3);
  text(ctx, '@il4n_studio · il4nstudio.netlify.app', X0 + 4, 1300, font(34, 600, D), C.muted, 'left', 1);
  ctx.restore();
  // boucle : sur le dernier temps, le titre de l'accroche revient au même endroit
  const lp = E.inOutCubic(prog(u, 35.2, 36));
  if (lp > 0) { ctx.fillStyle = `rgba(17,16,24,${lp})`; ctx.fillRect(0, 0, W, H); }
}

// ---------------------------------------------------------------- sous-titres (Whisper, 2-4 mots, mot clé en or)
function subtitles(ctx, t) {
  const s = SUBS.find((g) => t >= g.a && t < g.b); if (!s) return;
  const k = springU((t - s.a) * 4, 0, SPRING.snappy);
  const f = font(68, 800, D);
  ctx.font = f;
  const parts = s.words.map((w) => ({ w, wd: ctx.measureText(w + ' ').width }));
  const total = parts.reduce((a, p) => a + p.wd, 0);
  let x = (W - total) / 2; const y = 1400;
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(0.9 + 0.1 * clamp(k), 0.9 + 0.1 * clamp(k)); ctx.translate(-W / 2, -y);
  ctx.globalAlpha = clamp(k * 1.5);
  ctx.lineJoin = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(17,16,24,0.85)';
  parts.forEach((p, i) => { ctx.font = f; ctx.strokeText(p.w, x, y); ctx.fillStyle = i === s.key ? C.gold : C.white; ctx.fillText(p.w, x, y); x += p.wd; });
  ctx.restore();
}

// ---------------------------------------------------------------- montage
M.film({
  fonts: [font(100, 900, D), font(100, 800, D), font(100, 700, D), font(100, 600, D), font(100, 400, A)],
  images: {
    c1: 'assets/shots/carte_flyer_1.png', c2: 'assets/shots/carte_flyer_2.png', c3: 'assets/shots/carte_flyer_3.png',
    top: 'assets/shots/m_top.png',
  },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 4.85) sHook(ctx, u, t);
    else if (u < 8) {
      // whip vertical : l'accroche sort par le haut, la pile entre par le bas
      const k = springU(u, 4.85, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(0, -k * 1500); sHook(ctx, u, t); ctx.restore(); }
      ctx.save(); ctx.translate(0, (1 - Math.min(1, k)) * 1500); sProblem(ctx, u, t); ctx.restore();
    } else if (u < 13.7) sCards(ctx, u, t, IMG);
    else if (u < 20.7) {
      // whip horizontal : cartes à gauche, prix à droite
      const k = springU(u, 13.7, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(-k * W, 0); sCards(ctx, u, t, IMG); ctx.restore(); }
      ctx.save(); ctx.translate((1 - Math.min(1, k)) * W, 0); sPrices(ctx, u, t); ctx.restore();
    } else if (u < 27.75) {
      const k = springU(u, 20.7, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(0, -k * 1500); sPrices(ctx, u, t); ctx.restore(); }
      sSite(ctx, u, t, IMG, Math.min(1, k));
    } else {
      // volet nuit qui descend sur la carte de fin
      const k = E.inOutCubic(prog(u, 27.75, 28.3));
      if (k < 1) sSite(ctx, u, t, IMG, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H * k); ctx.clip(); sEnd(ctx, u, t); ctx.restore();
    }
    subtitles(ctx, t);
  },
});
