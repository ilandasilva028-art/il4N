// IL4N — Pub « Menu de fêtes ». Fonction pure du temps : window.seek(t) peint l'image t.
// Plan : docs/shotlist.md. Temps en beats (u), 128 bpm, 32 beats.
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, clamp, springU, SPRING, wobble, font, layout, glyph, text, fill, cover, crop, rrect, shake, mix, bump } = M;

const C = { night: '#111018', night2: '#1b1825', paper: '#f4f0e8', white: '#fffdf8', ink: '#17131d', gold: '#d6a96a', gold2: '#9a663e', muted: '#a49eaa', ink2: '#6d6870' };
const D = 'Display', A = 'Accent';
const X0 = 76;

const HITS = [
  [0, 'Votre menu', 'impact'],
  [1, 'donne faim ?', 'pop', { pitch: 'D6' }],
  [1.6, 'carte après monte', 'whoosh', { len: 0.35, from: 400, to: 1800 }],
  [2.4, 'carte posée', 'thud'],
  [4.2, 'whip vertical', 'whoosh', { len: 0.4, from: 2400, to: 500 }],
  [4.75, 'carte avant posée', 'thud'],
  [5.5, 'Ou il ressemble', 'pop', { pitch: 'A5' }],
  [6.25, 'à ça ?', 'boing', { pitch: 'D5', to: 'A4' }],
  [7, 'montée', 'riser', { len: 0.9 }],
  [8, 'DROP : balayage', 'impact'],
  [8.6, 'Même menu.', 'pop', { pitch: 'D6' }],
  [9.4, 'Pas le même effet.', 'pop', { pitch: 'F6' }],
  [11.75, 'whip horizontal', 'whoosh', { len: 0.4, from: 2600, to: 600, pan: 0.3 }],
  [12.0, 'carte prix', 'thud'],
  [12.75, '39 €', 'impact'],
  [13.3, 'cercle autour du prix', 'blip', { pitch: 'A5' }],
  [15.7, 'volet papier', 'whoosh', { len: 0.3, from: 400, to: 1800 }],
  [16.1, 'étape 1', 'tick'],
  [18.1, 'étape 2', 'tick'],
  [20.1, 'étape 3', 'tick'],
  [23, 'avant le rush', 'pop', { pitch: 'D6' }],
  [25.6, 'vers la pastille', 'whoosh', { len: 0.3, from: 1800, to: 400 }],
  [26, 'carte de fin', 'impact'],
  [26.6, 'logo', 'bell', { pitch: 'D6' }],
];

// ---------------------------------------------------------------- helpers
const box = (ctx, x, y, w, h, r, color) => { rrect(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); };
function shadow(ctx, blur, y, a = 0.45) { ctx.shadowColor = `rgba(0,0,0,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = y; }
function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

function springLine(ctx, str, x, base, f, color, u, u0, { stagger = 0.03, drop = 130, cfg = SPRING.bouncy, track = 0 } = {}) {
  const L = layout(ctx, str, f, track);
  L.glyphs.forEach((g, j) => {
    const k = springU(u, u0 + j * stagger, cfg);
    if (k <= 0.001) return;
    glyph(ctx, g.ch, x + g.cx, base + (1 - k) * drop, f, color, clamp(k, 0, 1.3), clamp(k, 0, 1.3));
  });
  return L;
}
function kicker(ctx, str, y, color, a = 1) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = color; ctx.fillRect(X0, y - 12, 56, 3);
  text(ctx, str, X0 + 76, y, font(30, 700, D), color, 'left', 5);
  ctx.restore();
}
function tag(ctx, str, x, y, bg, fg) {
  ctx.font = font(30, 800, D); const w = ctx.measureText(str).width + 5 * str.length + 52;
  box(ctx, x, y, w, 60, 30, bg); text(ctx, str, x + 26, y + 41, font(30, 800, D), fg, 'left', 5);
}
function honest(ctx, x, y, a = 1) {   // mention « exemple » toujours lisible
  ctx.save(); ctx.globalAlpha = a;
  const s = 'Exemple · commerce imaginaire'; ctx.font = font(28, 600, D); const w = ctx.measureText(s).width + 44;
  box(ctx, x - w, y, w, 52, 26, 'rgba(17,16,24,0.82)'); text(ctx, s, x - w + 22, y + 35, font(28, 600, D), C.white);
  ctx.restore();
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
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(214,169,106,${a})`); g.addColorStop(1, 'rgba(214,169,106,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// la carte-menu (photo issue de la vidéo IL4N), wipe = part « après » révélée de gauche à droite
const SRC = [124, 70, 500, 770];                       // le papier dans l'image 768×960
function menuCard(ctx, IMG, cx, cy, w, rot, wipe = 0, scale = 1) {
  const h = w * SRC[3] / SRC[2];
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(scale, scale);
  shadow(ctx, 90, 40, 0.55); box(ctx, -w / 2, -h / 2, w, h, 26, '#2a2420'); noShadow(ctx);
  ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 26); ctx.clip();
  if (IMG.avant) crop(ctx, IMG.avant, SRC, -w / 2, -h / 2, w, h);
  if (wipe > 0 && IMG.apres) {
    const xw = -w / 2 + w * wipe;
    ctx.save(); ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w * wipe, h); ctx.clip();
    crop(ctx, IMG.apres, SRC, -w / 2, -h / 2, w, h); ctx.restore();
    if (wipe < 1) { ctx.fillStyle = C.gold; ctx.fillRect(xw - 6, -h / 2, 12, h); }
  }
  ctx.restore(); ctx.restore();
  return h;
}

// ---------------------------------------------------------------- S1 accroche (u 0..4)
function sHook(ctx, u, IMG) {
  fill(ctx, C.night); halo(ctx, 800, 560, 760, 0.16);
  const kk = E.outCubic(prog(u, -0.2, 0.7));
  kicker(ctx, 'MENU DE FÊTES', 420, C.gold, kk);
  springLine(ctx, 'Votre menu', X0 - 4, 600, font(150, 900, D), C.white, u, -0.25, { track: -6, drop: 160 });
  const f2 = font(166, 400, A);
  const L2 = layout(ctx, 'donne faim ?', f2, -4);
  L2.glyphs.forEach((g, j) => {
    const k = springU(u, 0.95 + j * 0.035, SPRING.bouncy); if (k <= 0.001) return;
    glyph(ctx, g.ch, X0 + g.cx, 790 + (1 - k) * 150, f2, C.gold, clamp(k, 0, 1.3), clamp(k, 0, 1.3));
  });
  // le résultat d'abord : la belle carte monte, inclinée
  const k = springU(u, 1.55, SPRING.snappy);
  if (k > 0) {
    const q = 0.03 * wobble(u - 2.4, 2.2, 5);
    menuCard(ctx, IMG, 600, 1440 + (1 - k) * 1100, 640, -0.07 + q, 1);
    honest(ctx, X0 + 470, 860, clamp(k * 1.4));
  }
}

// ---------------------------------------------------------------- S2 le problème (u 4..8)
const CARD = { cx: 540, cy: 1060, w: 600 };
function sProblem(ctx, u, IMG, wipe = 0) {
  fill(ctx, C.night2);
  const k = springU(u, 4.3, SPRING.bouncy);
  const sh = 0.012 * Math.sin(u * 22) * (1 - prog(u, 5, 6.2)) * (wipe ? 0 : 1);
  menuCard(ctx, IMG, CARD.cx, CARD.cy + (1 - k) * 260, CARD.w, 0.02 + sh, wipe, lerp(0.92, 1, k));
  const h = CARD.w * SRC[3] / SRC[2];
  if (wipe < 0.5) tag(ctx, 'AVANT', CARD.cx - CARD.w / 2 + 24, CARD.cy - h / 2 + 30, C.night, C.white);
  else tag(ctx, 'APRÈS', CARD.cx - CARD.w / 2 + 24, CARD.cy - h / 2 + 30, C.gold, C.night);
  kicker(ctx, 'EXEMPLE · COMMERCE IMAGINAIRE', 285, C.muted, 1);
}
function sProblemText(ctx, u) {
  springLine(ctx, 'Ou il ressemble', X0 - 2, 420, font(108, 900, D), C.white, u, 5.3, { track: -4 });
  const f2 = font(150, 400, A); const L = layout(ctx, 'à ça ?', f2, -2);
  L.glyphs.forEach((g, j) => {
    const k = springU(u, 6.15 + j * 0.05, SPRING.wobbly); if (k <= 0.001) return;
    const sq = 0.1 * wobble(u - 6.5, 2.4, 4);
    glyph(ctx, g.ch, X0 + g.cx, 545 + (1 - k) * 140, f2, C.gold, clamp(k) * (1 + sq), clamp(k) * (1 - sq));
  });
}

// ---------------------------------------------------------------- S3 DROP : même menu (u 8..12)
function sDrop(ctx, u, IMG) {
  const wipe = E.inOutCubic(prog(u, 7.95, 8.9));
  ctx.save(); shake(ctx, u, 8, 18, 5, 0.14);
  const z = 1 * (1.06 / 1) ** E.outCubic(prog(u, 8.9, 11.8));
  M.zoomAbout(ctx, z, CARD.cx, CARD.cy);
  sProblem(ctx, Math.max(u, 6.3), IMG, wipe);
  ctx.restore();
  // le texte de S2 sort par le haut pendant que le nouveau arrive
  const out = E.inCubic(prog(u, 7.95, 8.4));
  if (out < 1) { ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate(0, -out * 120); sProblemText(ctx, Math.max(u, 7)); ctx.restore(); }
  springLine(ctx, 'Même menu.', X0 - 2, 420, font(118, 900, D), C.white, u, 8.45, { track: -5, drop: 90, cfg: SPRING.snappy });
  const f2 = font(112, 400, A); const L = layout(ctx, 'Pas le même effet.', f2, -2);
  L.glyphs.forEach((g, j) => {
    const k = springU(u, 9.25 + j * 0.025, SPRING.bouncy); if (k <= 0.001) return;
    glyph(ctx, g.ch, X0 + g.cx, 535 + (1 - k) * 120, f2, C.gold, clamp(k, 0, 1.3), clamp(k, 0, 1.3));
  });
}

// ---------------------------------------------------------------- S4 le prix, vraie capture (u 12..16)
// carte « Menu de restaurant 39 € » dans live_autres.png (2264×680)
const PRICE_SRC = [1522, 200, 742, 166];
function sPrice(ctx, u, IMG) {
  fill(ctx, C.paper);
  const kt = springU(u, 11.8, SPRING.gentle);
  kicker(ctx, 'TARIF AFFICHÉ SUR LE SITE', 420, C.gold2, clamp(kt * 1.4));
  const k = springU(u, 11.75, SPRING.bouncy);
  const w = W - 2 * X0 + 20, h = w * PRICE_SRC[3] / PRICE_SRC[2];
  const x = X0 - 10, y = 500 + (1 - k) * 700;
  ctx.save(); ctx.globalAlpha = clamp(k * 2);
  shadow(ctx, 70, 26, 0.18); box(ctx, x, y, w, h, 34, C.white); noShadow(ctx);
  if (IMG.autres) { ctx.save(); rrect(ctx, x, y, w, h, 34); ctx.clip(); crop(ctx, IMG.autres, PRICE_SRC, x, y, w, h); ctx.restore(); }
  ctx.restore();
  // cercle or tracé autour de « 39 € » (coin haut droit de la carte)
  const p = E.inOutCubic(prog(u, 13.2, 14));
  if (p > 0) {
    const cx = x + w * 0.905, cy = y + h * 0.27, rx = 118, ry = 72;
    ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, -0.08, -2.4, -2.4 + p * M.TAU * 1.04); ctx.stroke(); ctx.restore();
  }
  // le prix en très grand, sous la preuve
  const kb = springU(u, 12.6, SPRING.wobbly);
  if (kb > 0) {
    const sq = 0.08 * wobble(u - 13, 2.4, 4);
    springLine(ctx, '39 €', X0 - 10, 1060, font(330, 900, D), C.ink, u, 12.6, { stagger: 0.08, drop: 200, track: -12, cfg: SPRING.wobbly });
  }
  const k2 = springU(u, 13.9, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(k2 * 1.4);
  text(ctx, 'Prêt à imprimer.', X0, 1220 - (1 - k2) * 40, font(112, 400, A), C.gold2);
  text(ctx, 'Fichier HD, chez l\'imprimeur de votre choix.', X0, 1300 - (1 - k2) * 30, font(40, 500, D), C.ink2);
  ctx.restore();
}

// ---------------------------------------------------------------- S5 comment ça marche (u 16..26)
const STEPS = [
  ['Vous m\'envoyez', 'vos plats et vos prix.'],
  ['Je mets en page', 'votre carte de fêtes.'],
  ['Vous validez,', 'puis vous payez.'],
];
function sSteps(ctx, u) {
  fill(ctx, C.paper);
  kicker(ctx, 'COMMENT ÇA MARCHE', 400, C.gold2, 1);
  STEPS.forEach(([a, b], i) => {
    const u0 = 16.1 + i * 2, k = springU(u, u0 - 0.15, SPRING.snappy);
    if (k <= 0) return;
    const y = 500 + i * 220, dx = (1 - k) * 90;
    ctx.save(); ctx.globalAlpha = clamp(k * 1.5);
    box(ctx, X0 - dx, y, W - 2 * X0, 190, 44, C.white);
    check(ctx, X0 + 78 - dx, y + 95, 42, prog(u, u0, u0 + 0.6), C.gold, C.ink);
    text(ctx, a, X0 + 156 - dx, y + 84, font(56, 800, D), C.ink);
    text(ctx, b, X0 + 156 - dx, y + 148, font(50, 500, D), C.ink2);
    ctx.restore();
  });
  const k = springU(u, 22.9, SPRING.bouncy);
  if (k > 0) {
    const f = font(104, 400, A);
    springLine(ctx, 'Prête avant', X0, 1300, f, C.ink, u, 22.9, { stagger: 0.02, drop: 90 });
    springLine(ctx, 'le rush des fêtes.', X0, 1410, f, C.gold2, u, 23.25, { stagger: 0.02, drop: 90 });
  }
}

// ---------------------------------------------------------------- S6 carte de fin (u 26..32)
const PILL = { x: X0, y: 1150, w: W - 2 * X0, h: 140 };
function sEnd(ctx, u) {
  fill(ctx, C.night); halo(ctx, 800, 560, 760, 0.16);
  const L = springLine(ctx, 'il4n', X0 - 6, 600, font(170, 900, D), C.white, u, 26.1, { stagger: 0.06, drop: 140, track: -8 });
  const kd = springU(u, 26.6, SPRING.wobbly);
  if (kd > 0) { ctx.beginPath(); ctx.arc(X0 - 6 + L.width + 26, 588, 17 * kd, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill(); }
  const t1 = springU(u, 26.8, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(t1 * 1.4);
  text(ctx, 'Votre menu de fêtes.', X0, 790 - (1 - t1) * 40, font(98, 400, A), C.gold);
  text(ctx, '39 € · vous validez avant de payer', X0, 880 - (1 - t1) * 30, font(44, 600, D), C.white);
  text(ctx, 'Graphiste à Sarrians · Vaucluse', X0, 945 - (1 - t1) * 30, font(38, 500, D), C.muted);
  ctx.restore();
  const br = 1 + 0.035 * bump(u, 28.2, 0.6) + 0.03 * bump(u, 30.2, 0.6);
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
  images: { avant: 'assets/menu_avant_raw.png', apres: 'assets/menu_apres_raw.png', autres: 'assets/shots/live_autres.png' },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 4.2) { sHook(ctx, u, IMG); return; }
    if (u < 7.95) {
      // whip vertical : l'accroche sort par le haut, la carte « avant » arrive par le bas
      const k = springU(u, 4.2, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(0, -k * H); sHook(ctx, u, IMG); ctx.restore(); }
      ctx.save(); ctx.translate(0, (1 - Math.min(1, k)) * H); sProblem(ctx, u, IMG, 0); sProblemText(ctx, u); ctx.restore();
      return;
    }
    if (u < 11.7) { sDrop(ctx, u, IMG); return; }
    if (u < 15.7) {
      const k = springU(u, 11.7, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(-k * W, 0); sDrop(ctx, u, IMG); ctx.restore(); }
      ctx.save(); ctx.translate((1 - Math.min(1, k)) * W, 0); sPrice(ctx, u, IMG); ctx.restore();
      return;
    }
    if (u < 25.6) {
      // volet : la page prix glisse vers le haut, les étapes montent (même papier)
      const k = E.inOutCubic(prog(u, 15.7, 16.2));
      if (k < 1) { ctx.save(); ctx.translate(0, -k * H); sPrice(ctx, u, IMG); ctx.restore(); }
      ctx.save(); ctx.translate(0, (1 - k) * H); sSteps(ctx, u); ctx.restore();
      return;
    }
    // le papier se rétracte dans la pastille CTA
    const m = E.inOutCubic(prog(u, 25.6, 26.1));
    sEnd(ctx, u);
    if (m < 1) {
      const lg = (a, b) => a * (b / a) ** m;
      const x = lerp(0, PILL.x, m), y = lerp(0, PILL.y, m), w = lg(W, PILL.w), h = lg(H, PILL.h), r = lerp(0, PILL.h / 2, m);
      ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip();
      ctx.fillStyle = mix(C.paper, C.gold, m); ctx.fillRect(0, 0, W, H);
      if (m < 0.35) { ctx.globalAlpha = 1 - m / 0.35; sSteps(ctx, u); }
      ctx.restore();
    }
  },
});
