// IL4N Studio — Votre site à 261 € (−10 %) + abonnement à 90 €. Fonction pure du temps : window.seek(t) peint l'image t.
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
  [0, 'Je crée', 'impact'],
  [1, 'votre site', 'pop', { pitch: 'G5' }],
  [3.3, 'Et je le gère', 'boing', { pitch: 'D5', to: 'G5' }],
  [7.6, 'whip vers le téléphone', 'whoosh', { len: 0.45, from: 500, to: 2600 }],
  [8, 'DROP : vrai site', 'impact'],
  [13.7, 'whip vers 261', 'whoosh', { len: 0.4, from: 2600, to: 600, pan: 0.3 }],
  [14.25, 'pastille −10 %', 'boing', { pitch: 'D5', to: 'A5' }],
  [15.5, '290 barré', 'tick'],
  [16, '261 €', 'pop', { pitch: 'D6' }],
  [19.7, 'whip vers 90', 'whoosh', { len: 0.4, from: 600, to: 2400, pan: -0.3 }],
  [20.5, '100 barré', 'tick'],
  [21, '90 €', 'pop', { pitch: 'A5' }],
  [25.7, 'volet', 'whoosh', { len: 0.3, from: 400, to: 1800 }],
  [25.75, '261 + 90', 'click'],
  [27, '= 351 €', 'bell', { pitch: 'D6' }],
  [28.5, 'carte de fin', 'impact'],
  [29.25, 'logo', 'bell', { pitch: 'G5' }],
  [30, 'bonnet', 'pop', { pitch: 'D6' }],
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

// ---------------------------------------------------------------- S1 accroche (u 0..8)
function sHook(ctx, u, t) {
  fill(ctx, C.night);
  const g = ctx.createRadialGradient(760, 700, 0, 760, 700, 780);
  g.addColorStop(0, 'rgba(214,169,106,0.16)'); g.addColorStop(1, 'rgba(214,169,106,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  snow(ctx, t, 0.45);
  garland(ctx, 300, t, clamp(springU(u, 0, SPRING.gentle)));
  kicker(ctx, 'OFFRE DE NOËL · SITES INTERNET', 520, C.gold, clamp(E.outCubic(prog(u, -0.3, 0.6))));
  springLine(ctx, 'Je crée', X0 - 6, 720, font(140, 900, D), C.white, u, -0.35, { stagger: 0.05, drop: 170, track: -6 });
  springLine(ctx, 'votre site.', X0 - 6, 860, font(140, 900, D), C.white, u, 0.8, { stagger: 0.04, drop: 150, track: -6 });
  const k = springU(u, 3.2, SPRING.bouncy);
  if (k > 0) {
    ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
    text(ctx, 'Et je le gère', X0, 1010 + (1 - k) * 60, font(100, 400, A), C.gold);
    text(ctx, 'pour vous.', X0, 1110 + (1 - k) * 80, font(100, 400, A), C.gold);
    ctx.restore();
  }
  const ks = springU(u, 5, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(ks);
  text(ctx, 'Création · mise en ligne · gestion', X0, 1200, font(40, 500, D), C.muted);
  ctx.restore();
}

// ---------------------------------------------------------------- S2 le vrai site sur téléphone, plan stable (u 8..14)
const PH = { w: 500, h: 1070 };
function sPhone(ctx, u, t, IMG, rise) {
  fill(ctx, C.night2);
  snow(ctx, t, 0.3);
  ctx.save(); shake(ctx, u, 8, 16, 5, 0.12);
  const x = W - X0 - PH.w + 20, y = 300 + (1 - rise) * 1500;
  phone(ctx, x, y, PH.w, PH.h, (c, sx, sy, sw, sh) => {
    const im = IMG.mob; if (!im) return;
    crop(c, im, [0, 0, im.width, Math.min(im.height, im.width * sh / sw)], sx, sy, sw, sh);   // fixe, pas de zoom
  });
  ctx.restore();
  const lk = springU(u, 8.4, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(lk * 1.4);
  kicker(ctx, 'EXEMPLE :', 420, C.gold);
  text(ctx, 'mon propre', X0, 520, font(56, 800, D), C.white);
  text(ctx, 'site', X0, 590, font(56, 800, D), C.white);
  text(ctx, 'capture du 17/11', X0, 650, font(32, 600, D), C.muted);
  ctx.restore();
  const k2 = springU(u, 10.5, SPRING.bouncy);
  ctx.save(); ctx.globalAlpha = clamp(k2 * 1.4);
  text(ctx, 'Lisible', X0, 860 + (1 - k2) * 40, font(76, 400, A), C.gold);
  text(ctx, 'sur', X0, 940 + (1 - k2) * 40, font(76, 400, A), C.gold);
  text(ctx, 'téléphone.', X0, 1020 + (1 - k2) * 40, font(76, 400, A), C.gold);
  ctx.restore();
}

// ---------------------------------------------------------------- S3 / S4 prix réels du site (cartes capturées)
function priceScene(ctx, u, t, IMG, { img, u0, label, old, neu, sub, sub2, pill }) {
  fill(ctx, C.night);
  snow(ctx, t, 0.3);
  kicker(ctx, label, 340, C.gold, clamp(springU(u, u0 - 0.2, SPRING.gentle)));
  // la vraie carte du site, posée en fond à droite
  const kc = springU(u, u0 - 0.15, SPRING.snappy);
  const cw = 560, ch = cw * 1264 / 1156, cx = W - X0 - cw + 40, cy = 430;
  ctx.save(); ctx.globalAlpha = clamp(kc); ctx.translate((1 - kc) * 300, 0); ctx.translate(cx + cw / 2, cy + ch / 2); ctx.rotate(0.04); ctx.translate(-(cx + cw / 2), -(cy + ch / 2));
  shadow(ctx, 60, 30, 0.5); box(ctx, cx, cy, cw, ch, 26, C.night2); noShadow(ctx);
  const im = IMG[img]; if (im) { ctx.save(); rrect(ctx, cx, cy, cw, ch, 26); ctx.clip(); ctx.drawImage(im, cx, cy, cw, ch); ctx.restore(); }
  ctx.restore();
  if (pill) pastille(ctx, 270, 560, 140, springU(u, u0, SPRING.wobbly), pill, 'NOËL · SITES');
  // ancien prix barré, nouveau prix en or (typo)
  const ko = springU(u, u0 + 0.6, SPRING.snappy), y = 930;
  ctx.save(); ctx.globalAlpha = clamp(ko * 1.5);
  const fo = font(80, 800, D); text(ctx, old, X0, y, fo, '#8b8590'); ctx.font = fo; const ow = ctx.measureText(old).width;
  const sp = E.outCubic(prog(u, u0 + 1.25, u0 + 1.6));
  if (sp > 0) { ctx.strokeStyle = C.red; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X0 - 6, y - 28); ctx.lineTo(X0 - 6 + (ow + 12) * sp, y - 28 - 14 * sp); ctx.stroke(); }
  ctx.restore();
  const kn = springU(u, u0 + 1.75, SPRING.wobbly);
  if (kn > 0) { ctx.save(); ctx.translate(X0, y + 190); ctx.scale(clamp(kn, 0, 1.2), clamp(kn, 0, 1.2)); text(ctx, neu, 0, 0, font(190, 900, D), C.gold, 'left', -6); ctx.restore(); }
  const ks = springU(u, u0 + 2.2, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(ks * 1.4);
  text(ctx, sub, X0, y + 270, font(42, 700, D), C.white);
  if (sub2) text(ctx, sub2, X0, y + 322, font(34, 600, D), C.muted);
  ctx.restore();
}
const P261 = { img: 'crea', u0: 14, label: 'CRÉATION DU SITE', old: '290 €', neu: '261 €', sub: 'Offre de Noël −10 %', sub2: 'pour la création du site', pill: '−10 %' };
const P90 = { img: 'gest', u0: 20, label: 'OPTION TRANQUILLITÉ', old: '100 €', neu: '90 €', sub: 'la 1re année · gestion du site', sub2: 'puis 100 €/an', pill: null };

// ---------------------------------------------------------------- S5 351 € la 1re année (u 26..28.75)
function sTotal(ctx, u, t) {
  fill(ctx, C.paper);
  kicker(ctx, 'AVEC L’OPTION, LA 1RE ANNÉE', 400, '#9a663e', clamp(springU(u, 25.6, SPRING.gentle)));
  const a = springU(u, 25.75, SPRING.snappy), b = springU(u, 26.25, SPRING.snappy), c = springU(u, 26.9, SPRING.wobbly);
  ctx.save(); ctx.globalAlpha = clamp(a * 1.4); text(ctx, '261 € création', X0, 600 + (1 - a) * 40, font(64, 800, D), C.ink); ctx.restore();
  ctx.save(); ctx.globalAlpha = clamp(b * 1.4); text(ctx, '+ 90 € gestion', X0, 690 + (1 - b) * 40, font(64, 800, D), C.ink); ctx.restore();
  if (c > 0) {
    ctx.fillStyle = C.ink; ctx.fillRect(X0, 740, 560 * clamp(c), 5);
    ctx.save(); ctx.translate(X0, 960); ctx.scale(clamp(c, 0, 1.2), clamp(c, 0, 1.2)); text(ctx, '351 €', 0, 0, font(210, 900, D), C.red, 'left', -6); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp(c * 1.4);
    text(ctx, 'au lieu de 390 €', X0, 1050, font(52, 700, D), C.ink2);
    text(ctx, 'puis 100 €/an pour la gestion', X0, 1112, font(36, 600, D), C.ink2);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- S6 carte de fin (u 28.75..36), boucle vers S1
const PILL = { x: X0, y: 1090, w: W - 2 * X0 - 40, h: 132 };
function sEnd(ctx, u, t) {
  fill(ctx, C.night);
  const g = ctx.createRadialGradient(760, 700, 0, 760, 700, 780);
  g.addColorStop(0, 'rgba(214,169,106,0.16)'); g.addColorStop(1, 'rgba(214,169,106,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  snow(ctx, t, 0.45);
  garland(ctx, 300, t, 1);
  const L = springLine(ctx, 'il4n', X0 - 8, 700, font(220, 900, D), C.white, u, 28.3, { stagger: 0.05, drop: 140, track: -10 });
  const kd = springU(u, 29.25, SPRING.wobbly);
  if (kd > 0) { ctx.beginPath(); ctx.arc(X0 - 8 + L.width + 32, 683, 21 * kd, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill(); }
  bonnet(ctx, X0 + 34, 540, 0.95, -0.35, springU(u, 30, SPRING.wobbly));
  const t1 = springU(u, 29.6, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(t1 * 1.4);
  text(ctx, 'Votre site à 261 €.', X0, 840 - (1 - t1) * 40, font(70, 400, A), C.gold);
  text(ctx, 'Maquette gratuite · vous validez avant de payer', X0, 910 - (1 - t1) * 30, font(34, 600, D), C.muted);
  ctx.restore();
  const br = 1 + 0.035 * bump(u, 31.2, 0.6);
  ctx.save(); ctx.translate(PILL.x + PILL.w / 2, PILL.y + PILL.h / 2); ctx.scale(br, br); ctx.translate(-(PILL.x + PILL.w / 2), -(PILL.y + PILL.h / 2));
  box(ctx, PILL.x, PILL.y, PILL.w, PILL.h, PILL.h / 2, C.gold);
  ctx.globalAlpha = clamp(springU(u, 28.5, SPRING.gentle) * 1.5);
  text(ctx, 'Écrivez-moi en privé', PILL.x + 56, PILL.y + PILL.h / 2 + 19, font(54, 800, D), C.ink);
  arrowNE(ctx, PILL.x + PILL.w - 92, PILL.y + PILL.h / 2 - 20, 38, C.ink, 7);
  ctx.restore();
  const t3 = springU(u, 30.4, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(t3);
  text(ctx, '@il4n_studio · il4nstudio.netlify.app', X0 + 4, 1300, font(34, 600, D), C.muted, 'left', 1);
  ctx.restore();
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
  images: { mob: 'assets/shots/m_top.png', crea: 'assets/shots/carte_site_creation.png', gest: 'assets/shots/carte_site_gestion.png' },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 7.6) sHook(ctx, u, t);
    else if (u < 13.7) {
      const k = springU(u, 7.6, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(0, -k * 1500); sHook(ctx, u, t); ctx.restore(); }
      sPhone(ctx, u, t, IMG, Math.min(1, k));
    } else if (u < 19.7) {
      const k = springU(u, 13.7, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(-k * W, 0); sPhone(ctx, u, t, IMG, 1); ctx.restore(); }
      ctx.save(); ctx.translate((1 - Math.min(1, k)) * W, 0); priceScene(ctx, u, t, IMG, P261); ctx.restore();
    } else if (u < 25.7) {
      const k = springU(u, 19.7, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(k * W, 0); priceScene(ctx, u, t, IMG, P261); ctx.restore(); }
      ctx.save(); ctx.translate(-(1 - Math.min(1, k)) * W, 0); priceScene(ctx, u, t, IMG, P90); ctx.restore();
    } else if (u < 28.4) {
      // volet papier qui monte
      const k = E.inOutCubic(prog(u, 25.7, 26.1));
      if (k < 1) priceScene(ctx, u, t, IMG, P90);
      ctx.save(); ctx.beginPath(); ctx.rect(0, H * (1 - k), W, H * k); ctx.clip(); sTotal(ctx, u, t); ctx.restore();
    } else {
      const k = E.inOutCubic(prog(u, 28.4, 28.9));
      if (k < 1) sTotal(ctx, u, t);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H * k); ctx.clip(); sEnd(ctx, u, t); ctx.restore();
    }
    subtitles(ctx, t);
  },
});
