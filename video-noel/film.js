// IL4N — Vidéo de Noël. Fonction pure du temps : window.seek(t) peint l'image t.
// 124 bpm, 32 beats, 9:16. Promesse unique : vos supports de fêtes, prêts à temps, vous validez avant de payer.
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, clamp, springU, SPRING, wobble, font, layout, glyph, text, fill, rrect, mix, bump, hash01 } = M;
const C = { night: '#111018', night2: '#1b1825', paper: '#f4f0e8', white: '#fffdf8', ink: '#17131d', gold: '#d6a96a', gold2: '#9a663e', muted: '#a49eaa', ink2: '#6d6870', green: '#3f8a62' };
const D = 'Display', A = 'Accent';
const X0 = 84;

const HITS = [
  [0, 'Noël approche', 'impact'],
  [1.6, 'Votre com’ est prête ?', 'pop', { pitch: 'G5' }],
  [2.5, 'guirlande', 'bell', { pitch: 'D6' }],
  [4.2, 'whip', 'whoosh', { len: 0.4, from: 2400, to: 500 }],
  [4.85, 'ligne 1', 'thud'],
  [5.8, 'ligne 2', 'thud'],
  [6.75, 'ligne 3', 'thud'],
  [7.5, 'coche 3', 'tick'],
  [8, 'DROP : tarifs', 'impact'],
  [9.4, 'carte 1', 'thud'],
  [11.4, 'carte 2', 'thud'],
  [13.4, 'carte 3', 'thud'],
  [15.3, 'Tarifs affichés', 'bell', { pitch: 'G6' }],
  [15.75, 'volet', 'whoosh', { len: 0.3, from: 400, to: 1800 }],
  [16.3, 'Vous validez', 'pop', { pitch: 'D6' }],
  [18.6, 'puis vous payez', 'pop', { pitch: 'G6' }],
  [21, 'coche', 'bell', { pitch: 'B6' }],
  [23.5, 'prêt avant le rush', 'pop', { pitch: 'G6' }],
  [25.6, 'vers la pastille', 'whoosh', { len: 0.3, from: 1800, to: 400 }],
  [26, 'carte de fin', 'impact'],
  [26.6, 'logo', 'bell', { pitch: 'G6' }],
  [28.3, 'respiration', 'tick'],
];

// ---------------------------------------------------------------- helpers
const box = (ctx, x, y, w, h, r, c) => { rrect(ctx, x, y, w, h, r); ctx.fillStyle = c; ctx.fill(); };
function kicker(ctx, s, y, color, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color; ctx.fillRect(X0, y - 12, 56, 3);
  text(ctx, s, X0 + 76, y, font(30, 700, D), color, 'left', 5); ctx.restore();
}
function springLine(ctx, str, x, base, f, color, u, u0, { stagger = 0.03, drop = 130, cfg = SPRING.bouncy, track = 0 } = {}) {
  const L = layout(ctx, str, f, track);
  L.glyphs.forEach((g, j) => {
    const k = springU(u, u0 + j * stagger, cfg); if (k <= 0.001) return;
    glyph(ctx, g.ch, x + g.cx, base + (1 - k) * drop, f, color, clamp(k, 0, 1.3), clamp(k, 0, 1.3));
  });
  return L;
}
function check(ctx, cx, cy, r, p, bg, fg) {
  if (p <= 0) return;
  const s = E.outBack(clamp(p * 1.6), 2.2);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, M.TAU); ctx.fillStyle = bg; ctx.fill();
  const q = clamp((p - 0.3) / 0.7);
  ctx.strokeStyle = fg; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pts = [[-0.42, 0.02], [-0.12, 0.32], [0.45, -0.3]];
  ctx.beginPath(); ctx.moveTo(pts[0][0] * r, pts[0][1] * r);
  const a = clamp(q * 2), b = clamp(q * 2 - 1);
  ctx.lineTo(lerp(pts[0][0], pts[1][0], a) * r, lerp(pts[0][1], pts[1][1], a) * r);
  if (b > 0) ctx.lineTo(lerp(pts[1][0], pts[2][0], b) * r, lerp(pts[1][1], pts[2][1], b) * r);
  ctx.stroke(); ctx.restore();
}
function arrowNE(ctx, x, y, s, color, lw) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x + s, y); ctx.moveTo(x + s * 0.25, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + s * 0.75); ctx.stroke(); ctx.restore();
}
function halo(ctx, x, y, r, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(214,169,106,${a})`); g.addColorStop(1, 'rgba(214,169,106,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// neige : flocons dorés/blancs, position = fonction pure du temps (graine fixe)
function snow(ctx, t, alpha = 1, n = 46) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const sp = 70 + hash01(i, 11) * 120, sz = 3 + hash01(i, 12) * 6, x0 = hash01(i, 13) * W, ph = hash01(i, 14) * H;
    const y = ((t * sp + ph) % (H + 40)) - 20, x = x0 + Math.sin(t * (0.6 + hash01(i, 15)) + i) * 34;
    ctx.globalAlpha = alpha * (0.25 + hash01(i, 16) * 0.5);
    ctx.fillStyle = hash01(i, 17) > 0.6 ? C.gold : '#fffdf8';
    ctx.beginPath(); ctx.arc(x, y, sz, 0, M.TAU); ctx.fill();
  }
  ctx.restore();
}
// guirlande : fil + ampoules dorées qui scintillent (haut de l'écran)
function garland(ctx, t, u, k = 1) {
  if (k <= 0) return;
  const y0 = 150, n = 9;
  ctx.save(); ctx.globalAlpha = clamp(k);
  ctx.strokeStyle = 'rgba(214,169,106,0.45)'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) { const x = (i / 60) * W, y = y0 + Math.sin((i / 60) * Math.PI * 4) * 34 + (1 - k) * -200; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  for (let i = 0; i < n; i++) {
    const p = (i + 0.5) / n, x = p * W, y = y0 + Math.sin(p * Math.PI * 4) * 34 + (1 - k) * -200 + 26;
    const tw = 0.55 + 0.45 * Math.sin(t * 3.1 + i * 1.7);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 46); g.addColorStop(0, `rgba(255,214,140,${0.55 * tw})`); g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 46, y - 46, 92, 92);
    ctx.beginPath(); ctx.arc(x, y, 12, 0, M.TAU); ctx.fillStyle = mix(C.gold2, '#ffe2a8', tw); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- S1 accroche (u 0..4)
function sHook(ctx, u, t) {
  fill(ctx, C.night); halo(ctx, 800, 700, 820, 0.16);
  garland(ctx, t, u, springU(u, 2.3, SPRING.gentle));
  snow(ctx, t);
  kicker(ctx, 'IL4N STUDIO · SARRIANS', 520, C.gold, E.outCubic(prog(u, -0.2, 0.6)));
  springLine(ctx, 'Noël', X0 - 6, 760, font(230, 900, D), C.white, u, -0.3, { track: -8, drop: 190 });
  springLine(ctx, 'approche.', X0 - 6, 960, font(190, 900, D), C.white, u, 0.35, { track: -8, drop: 190 });
  springLine(ctx, 'Votre com’', X0, 1140, font(116, 400, A), C.gold, u, 1.6, { stagger: 0.03, drop: 100 });
  springLine(ctx, 'est prête ?', X0, 1270, font(116, 400, A), C.gold, u, 2.1, { stagger: 0.03, drop: 100 });
}

// ---------------------------------------------------------------- S2 à préparer (u 4..8)
const LIST = [['Votre menu de fêtes', 'avant les réservations'], ['Un flyer ou une affiche', 'pour le marché, la soirée'], ['Vos horaires de fin d’année', 'sur la vitrine et en ligne']];
function sList(ctx, u, t) {
  fill(ctx, C.paper);
  snow(ctx, t, 0.5, 24);
  kicker(ctx, 'À PRÉPARER MAINTENANT', 400, C.gold2, clamp(springU(u, 4.5, SPRING.gentle) * 1.4));
  LIST.forEach(([a, b], i) => {
    const u0 = 4.85 + i * 0.95, k = springU(u, u0 - 0.15, SPRING.snappy); if (k <= 0) return;
    const y = 560 + i * 280, dx = (1 - k) * 100;
    ctx.save(); ctx.globalAlpha = clamp(k * 1.5);
    box(ctx, X0 - dx, y, W - 2 * X0, 214, 48, C.white);
    check(ctx, X0 + 90 - dx, y + 107, 46, prog(u, u0 + 0.15, u0 + 0.75), C.gold, C.ink);
    text(ctx, a, X0 + 170 - dx, y + 98, font(52, 800, D), C.ink);
    text(ctx, b, X0 + 170 - dx, y + 160, font(42, 500, D), C.ink2);
    ctx.restore();
  });
}

// ---------------------------------------------------------------- S3 DROP : tarifs réels (u 8..16)
const CARDS = [
  ['Menu de fêtes', 'card_menu', 742 / 166, 9.2],
  ['Affiche marché de Noël', 'card_affiche', 745 / 154, 11.2],
  ['Visuels pour vos réseaux', 'card_visuel', 745 / 166, 13.2],
];
function sPrices(ctx, u, t, IMG) {
  fill(ctx, C.night); halo(ctx, 800, 700, 820, 0.14);
  garland(ctx, t, u, 1);
  snow(ctx, t, 0.9, 30);
  kicker(ctx, 'TARIFS AFFICHÉS SUR LE SITE', 440, C.gold, E.outCubic(prog(u, 8, 8.6)));
  springLine(ctx, 'Des prix clairs.', X0 - 4, 580, font(112, 900, D), C.white, u, 8.05, { track: -5, drop: 100, cfg: SPRING.snappy });
  CARDS.forEach(([label, key, ar, u0], i) => {
    const k = springU(u, u0 - 0.25, SPRING.bouncy); if (k <= 0) return;
    const w = W - 2 * X0, h = w / ar, y = 720 + i * 300 + (1 - k) * 900;
    const rot = (i % 2 ? 0.012 : -0.012) * (1 + (1 - k) * 3);
    ctx.save(); ctx.translate(W / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-W / 2, -(y + h / 2));
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
    box(ctx, X0, y, w, h, 26, C.white); ctx.shadowColor = 'transparent';
    if (IMG[key]) { ctx.save(); rrect(ctx, X0, y, w, h, 26); ctx.clip(); ctx.drawImage(IMG[key], X0, y, w, h); ctx.restore(); }
    ctx.restore();
  });
}

// ---------------------------------------------------------------- S4 vous validez (u 16..25.6)
function sValidate(ctx, u, t) {
  fill(ctx, C.paper);
  snow(ctx, t, 0.45, 22);
  kicker(ctx, 'LA RÈGLE CHEZ IL4N', 420, C.gold2, clamp(springU(u, 16.1, SPRING.gentle) * 1.4));
  springLine(ctx, 'Vous validez', X0 - 6, 700, font(150, 900, D), C.ink, u, 16.25, { track: -6, drop: 150 });
  springLine(ctx, 'avant de payer.', X0 - 4, 860, font(124, 400, A), C.gold2, u, 18.4, { stagger: 0.03, drop: 120 });
  // tampon « validé » façon coche
  const p = prog(u, 20.8, 21.6);
  if (p > 0) check(ctx, W / 2, 1160, 120, p, C.gold, C.ink);
  const k = springU(u, 22, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(k * 1.4);
  text(ctx, 'Création, retouches, puis facture.', W / 2, 1380 - (1 - k) * 30, font(42, 600, D), C.ink2, 'center');
  ctx.restore();
  const k2 = springU(u, 23.4, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(k2 * 1.4);
  text(ctx, 'Prêt avant le rush.', W / 2, 1480 - (1 - k2) * 30, font(84, 400, A), C.gold2, 'center');
  ctx.restore();
}

// ---------------------------------------------------------------- S5 carte de fin (u 26..32)
const PILL = { x: X0, y: 1250, w: W - 2 * X0, h: 140 };
function sEnd(ctx, u, t) {
  fill(ctx, C.night); halo(ctx, 800, 700, 820, 0.16);
  garland(ctx, t, u, 1);
  snow(ctx, t);
  const L = springLine(ctx, 'il4n', X0 - 6, 760, font(180, 900, D), C.white, u, 26.1, { stagger: 0.06, drop: 140, track: -8 });
  const kd = springU(u, 26.6, SPRING.wobbly);
  if (kd > 0) { ctx.beginPath(); ctx.arc(X0- 6 + L.width + 26, 748, 18 * kd, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill(); }
  const t1 = springU(u, 26.8, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(t1 * 1.4);
  text(ctx, 'Joyeuses fêtes,', X0, 920 - (1 - t1) * 40, font(100, 400, A), C.gold);
  text(ctx, 'et de beaux supports.', X0, 1020 - (1 - t1) * 40, font(88, 400, A), C.gold);
  text(ctx, 'Graphiste à Sarrians · Vaucluse', X0, 1100 - (1 - t1) * 30, font(38, 500, D), C.muted);
  ctx.restore();
  const br = 1 + 0.035 * bump(u, 28.3, 0.6) + 0.03 * bump(u, 30.3, 0.6);
  ctx.save(); ctx.translate(PILL.x + PILL.w / 2, PILL.y + PILL.h / 2); ctx.scale(br, br); ctx.translate(-(PILL.x + PILL.w / 2), -(PILL.y + PILL.h / 2));
  box(ctx, PILL.x, PILL.y, PILL.w, PILL.h, PILL.h / 2, C.gold);
  ctx.globalAlpha = clamp(springU(u, 26.3, SPRING.gentle) * 1.5);
  text(ctx, 'Écrivez-moi en privé', PILL.x + 60, PILL.y + PILL.h / 2 + 20, font(58, 800, D), C.ink);
  arrowNE(ctx, PILL.x + PILL.w - 100, PILL.y + PILL.h / 2 - 21, 40, C.ink, 7);
  ctx.restore();
}

// ---------------------------------------------------------------- montage
M.film({
  fonts: [font(100, 900, D), font(100, 800, D), font(100, 700, D), font(100, 600, D), font(100, 500, D), font(100, 400, A)],
  images: { card_menu: 'assets/card_menu.png', card_affiche: 'assets/card_affiche.png', card_visuel: 'assets/card_visuel.png' },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 4.2) { sHook(ctx, u, t); return; }
    if (u < 8) {
      const k = springU(u, 4.2, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(0, -k * H); sHook(ctx, u, t); ctx.restore(); }
      ctx.save(); ctx.translate(0, (1 - Math.min(1, k)) * H); sList(ctx, u, t); ctx.restore();
      return;
    }
    if (u < 15.75) { sPrices(ctx, u, t, IMG); return; }
    if (u < 25.6) {
      const k = E.inOutCubic(prog(u, 15.75, 16.2));
      if (k < 1) { ctx.save(); ctx.translate(0, -k * H); sPrices(ctx, u, t, IMG); ctx.restore(); }
      ctx.save(); ctx.translate(0, (1 - k) * H); sValidate(ctx, u, t); ctx.restore();
      return;
    }
    const m = E.inOutCubic(prog(u, 25.6, 26.1));
    sEnd(ctx, u, t);
    if (m < 1) {
      const lg = (a, b) => a * (b / a) ** m;
      const x = lerp(0, PILL.x, m), y = lerp(0, PILL.y, m), w = lg(W, PILL.w), h = lg(H, PILL.h), r = lerp(0, PILL.h / 2, m);
      ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip();
      ctx.fillStyle = mix(C.paper, C.gold, m); ctx.fillRect(0, 0, W, H);
      if (m < 0.35) { ctx.globalAlpha = 1 - m / 0.35; sValidate(ctx, u, t); }
      ctx.restore();
    }
  },
});
