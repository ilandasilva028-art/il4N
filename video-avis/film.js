// IL4N — « 2 avis. 5 étoiles. Prêt pour mon 4e vrai projet. » Fonction pure du temps.
// 128 bpm, 32 beats, 9:16. Avis Google réels (captures du 15/11/2026), cités mot pour mot.
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, clamp, springU, SPRING, wobble, font, layout, glyph, text, fill, rrect, mix, bump } = M;
const C = { night: '#111018', night2: '#1b1825', paper: '#f4f0e8', white: '#fffdf8', ink: '#17131d', gold: '#d6a96a', gold2: '#9a663e', muted: '#a49eaa', ink2: '#6d6870' };
const D = 'Display', A = 'Accent';
const X0 = 84;

const HITS = [
  [0, '2 avis', 'impact'],
  [1.5, '5 étoiles', 'pop', { pitch: 'F5' }],
  [2.5, 'étoile 1', 'blip', { pitch: 'C6' }],
  [2.85, 'étoile 2', 'blip', { pitch: 'D6' }],
  [3.2, 'étoile 3', 'blip', { pitch: 'E6' }],
  [3.55, 'étoile 4', 'blip', { pitch: 'F6' }],
  [3.9, 'étoile 5', 'bell', { pitch: 'A6' }],
  [4.6, 'prêt pour mon 4e', 'pop', { pitch: 'C6' }],
  [7.7, 'volet papier', 'whoosh', { len: 0.3, from: 400, to: 1800 }],
  [8, 'DROP : avis 1', 'impact'],
  [11, 'Je recommande vivement', 'pop', { pitch: 'F6' }],
  [12.6, 'nom', 'tick'],
  [15.7, 'whip', 'whoosh', { len: 0.4, from: 2600, to: 600, pan: 0.3 }],
  [16, 'avis 2', 'thud'],
  [18.5, 'carte vrai client', 'thud'],
  [19.3, 'étiquette', 'tick'],
  [21.7, 'volet nuit', 'whoosh', { len: 0.35, from: 1800, to: 400 }],
  [22, 'N°4', 'impact'],
  [23.2, 'le prochain projet', 'pop', { pitch: 'C6' }],
  [24, 'peut être le vôtre', 'pop', { pitch: 'F6' }],
  [26.5, 'CTA', 'click'],
  [28, 'respiration', 'tick'],
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
function star(ctx, cx, cy, r, k, color) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate((1 - k) * -1.2); ctx.scale(k, k);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
function stars(ctx, u, u0, x, y, r, gap, color, step = 0.35) {
  for (let i = 0; i < 5; i++) star(ctx, x + r + i * (2 * r + gap), y, r, clamp(springU(u, u0 + i * step, SPRING.wobbly), 0, 1.25), color);
}
// texte en paragraphes, mot par mot (apparition par groupes)
function wrapWords(ctx, str, f, maxW) {
  ctx.font = f; const words = str.split(' '); const lines = []; let cur = [];
  for (const w of words) { const t = [...cur, w].join(' '); if (ctx.measureText(t).width > maxW && cur.length) { lines.push(cur); cur = [w]; } else cur.push(w); }
  if (cur.length) lines.push(cur); return lines;
}
function words(ctx, str, x, y, f, lh, color, u, u0, per = 0.12, maxW = W - 2 * X0) {
  const lines = wrapWords(ctx, str, f, maxW); let n = 0;
  lines.forEach((ln, li) => {
    let cx = x; ctx.font = f; const sp = ctx.measureText(' ').width;
    ln.forEach((w) => {
      const k = springU(u, u0 + n * per, SPRING.gentle); n++;
      const ww = ctx.measureText(w).width;
      if (k > 0.001) { ctx.save(); ctx.globalAlpha = clamp(k * 1.6); text(ctx, w, cx, y + li * lh + (1 - clamp(k)) * 36, f, color); ctx.restore(); }
      cx += ww + sp;
    });
  });
  return { lines: lines.length, end: u0 + n * per };
}
function avatar(ctx, x, y, letter, bg, name, sub, k, dark) {
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(k * 1.5); const dx = (1 - k) * 60;
  ctx.beginPath(); ctx.arc(x + 42 - dx, y, 42, 0, M.TAU); ctx.fillStyle = bg; ctx.fill();
  text(ctx, letter, x + 42 - dx, y + 14, font(40, 600, D), '#fff', 'center');
  text(ctx, name, x + 110 - dx, y - 6, font(38, 800, D), dark ? C.white : C.ink);
  text(ctx, sub, x + 110 - dx, y + 36, font(28, 600, D), dark ? C.muted : C.ink2);
  ctx.restore();
}
function arrowNE(ctx, x, y, s, color, lw) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x + s, y); ctx.moveTo(x + s * 0.25, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + s * 0.75); ctx.stroke(); ctx.restore();
}
function halo(ctx, x, y, r, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(214,169,106,${a})`); g.addColorStop(1, 'rgba(214,169,106,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function qmark(ctx, x, y, k, color) {
  if (k <= 0) return; ctx.save(); ctx.globalAlpha = clamp(k * 1.5);
  glyph(ctx, '“', x, y + (1 - k) * 60, font(210, 400, A), color, clamp(k, 0, 1.2), clamp(k, 0, 1.2)); ctx.restore();
}

// ---------------------------------------------------------------- S1 accroche (u 0..8)
function sHook(ctx, u) {
  fill(ctx, C.night); halo(ctx, 820, 520, 760, 0.17);
  kicker(ctx, 'IL4N STUDIO · AVIS GOOGLE', 420, C.gold, E.outCubic(prog(u, -0.2, 0.6)));
  springLine(ctx, '2 avis.', X0 - 6, 640, font(190, 900, D), C.white, u, -0.3, { track: -8, drop: 170 });
  springLine(ctx, '5 étoiles.', X0 - 6, 830, font(190, 900, D), C.white, u, 1.3, { track: -8, drop: 170 });
  stars(ctx, u, 2.4, X0, 950, 44, 22, C.gold);
  const f = font(100, 400, A);
  springLine(ctx, 'Et je suis prêt pour', X0, 1150, f, C.gold, u, 4.5, { stagger: 0.018, drop: 90 });
  springLine(ctx, 'mon 4e vrai projet.', X0, 1265, f, C.gold, u, 4.9, { stagger: 0.018, drop: 90 });
}

// ---------------------------------------------------------------- S2 avis 1 (u 8..16)
function sAvis1(ctx, u) {
  fill(ctx, C.paper);
  kicker(ctx, 'AVIS N°1 · GOOGLE', 330, C.gold2, 1);
  stars(ctx, u, 7.9, X0, 420, 34, 16, C.gold, 0.12);
  qmark(ctx, X0 - 6, 650, springU(u, 8.2, SPRING.bouncy), C.gold);
  const f = font(70, 400, A);
  const r = words(ctx, 'Ilan est très réactif, impliqué, il écoute et conseille de manière à mettre en avant votre activité.', X0, 720, f, 86, C.ink, u, 8.4, 0.13);
  springLine(ctx, 'Je recommande vivement.', X0, 720 + r.lines * 86 + 40, font(78, 400, A), C.gold2, u, 11, { stagger: 0.02, drop: 80 });
  avatar(ctx, X0, 720 + r.lines * 86 + 170, 'L', '#5b3db8', 'LuZoHeadSpa', 'Avis Google · novembre 2026', springU(u, 12.5, SPRING.gentle), false);
}

// ---------------------------------------------------------------- S3 avis 2 + vraie carte (u 16..22)
function sAvis2(ctx, u, IMG) {
  fill(ctx, C.paper);
  kicker(ctx, 'AVIS N°2 · GOOGLE', 330, C.gold2, 1);
  stars(ctx, u, 15.9, X0, 420, 34, 16, C.gold, 0.1);
  const f = font(56, 400, A);
  const r = words(ctx, 'Notre association Les Souffre-Douleurs de l\'École 63 a sollicité Il4n Studio pour la création de notre carte de visite…', X0, 580, f, 70, C.ink, u, 16.1, 0.09);
  avatar(ctx, X0, 580 + r.lines * 70 + 30, 'C', '#3b6b2f', 'Caroline D.', 'Local Guide · Avis Google', springU(u, 17.8, SPRING.gentle), false);
  // la vraie carte réalisée
  const k = springU(u, 18.4, SPRING.bouncy);
  if (k > 0 && IMG.carte) {
    const w = 700, h = w * IMG.carte.height / IMG.carte.width, y = 1030 + (1 - k) * 600;
    const q = 0.02 * wobble(u - 18.9, 2.2, 5);
    ctx.save(); ctx.translate(X0 + w / 2, y + h / 2); ctx.rotate(-0.03 + q); ctx.translate(-(X0 + w / 2), -(y + h / 2));
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
    box(ctx, X0, y, w, h, 24, '#fff'); ctx.shadowColor = 'transparent';
    ctx.save(); rrect(ctx, X0, y, w, h, 24); ctx.clip(); ctx.drawImage(IMG.carte, X0, y, w, h); ctx.restore();
    ctx.restore();
    const kt = springU(u, 19.3, SPRING.snappy);
    if (kt > 0) {
      ctx.save(); ctx.globalAlpha = clamp(kt * 1.5);
      const s = 'LA CARTE RÉALISÉE · VRAI CLIENT'; ctx.font = font(26, 800, D); const tw = ctx.measureText(s).width + 26 * 4 + 48;
      box(ctx, W - X0 - tw, y + h - 34, tw, 58, 29, C.night);
      text(ctx, s, W - X0 - tw + 24, y + h + 4, font(26, 800, D), C.white, 'left', 4);
      ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- S4 N°4 (u 22..26)
function sN4(ctx, u) {
  fill(ctx, C.night); halo(ctx, 820, 520, 760, 0.17);
  kicker(ctx, 'ET MAINTENANT ?', 400, C.gold, 1);
  const k = springU(u, 21.95, SPRING.wobbly);
  const sq = 0.1 * wobble(u - 22.3, 2.4, 4);
  ctx.save(); ctx.translate(X0 + 250, 760); ctx.scale(k * (1 + sq), k * (1 - sq)); ctx.translate(-(X0 + 250), -760);
  text(ctx, 'N°4', X0 - 14, 760, font(330, 900, D), C.gold, 'left', -14);
  ctx.restore();
  springLine(ctx, 'Le prochain projet', X0 - 2, 920, font(104, 900, D), C.white, u, 23.1, { stagger: 0.02, drop: 110, track: -4 });
  springLine(ctx, 'peut être le vôtre.', X0, 1040, font(110, 400, A), C.gold, u, 23.9, { stagger: 0.02, drop: 100 });
}
function sEnd(ctx, u) {
  sN4(ctx, u);
  const k = springU(u, 26.3, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(k * 1.5);
  text(ctx, 'Flyer · menu · carte de visite · site', X0, 1160 - (1 - k) * 30, font(40, 600, D), '#e9e3d8');
  text(ctx, 'Tarifs affichés · vous validez avant de payer', X0, 1215 - (1 - k) * 30, font(36, 500, D), C.muted);
  ctx.restore();
  const kp = springU(u, 26.4, SPRING.bouncy);
  if (kp > 0) {
    const P = { x: X0, y: 1270, w: W - 2 * X0, h: 136 };
    const br = (0.6 + 0.4 * clamp(kp, 0, 1.1)) * (1 + 0.035 * bump(u, 28, 0.6) + 0.03 * bump(u, 30, 0.6));
    ctx.save(); ctx.translate(P.x + P.w / 2, P.y + P.h / 2); ctx.scale(br, br); ctx.translate(-(P.x + P.w / 2), -(P.y + P.h / 2));
    ctx.globalAlpha = clamp(kp * 2);
    box(ctx, P.x, P.y, P.w, P.h, P.h / 2, C.gold);
    text(ctx, 'Écrivez-moi en privé', P.x + 60, P.y + P.h / 2 + 20, font(58, 800, D), C.ink);
    arrowNE(ctx, P.x + P.w - 100, P.y + P.h / 2 - 21, 40, C.ink, 7);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- montage
M.film({
  fonts: [font(100, 900, D), font(100, 800, D), font(100, 700, D), font(100, 600, D), font(100, 500, D), font(100, 400, A)],
  images: { carte: 'assets/cartes_asso.png' },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 7.7) { sHook(ctx, u); return; }
    if (u < 15.7) {
      // volet papier qui monte sur l'accroche
      const k = E.inOutCubic(prog(u, 7.7, 8.05));
      if (k < 1) sHook(ctx, u);
      ctx.save(); ctx.beginPath(); ctx.rect(0, H * (1 - k), W, H * k); ctx.clip(); sAvis1(ctx, u); ctx.restore();
      return;
    }
    if (u < 21.7) {
      const k = springU(u, 15.7, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(-k * W, 0); sAvis1(ctx, u); ctx.restore(); }
      ctx.save(); ctx.translate((1 - Math.min(1, k)) * W, 0); sAvis2(ctx, u, IMG); ctx.restore();
      return;
    }
    // volet nuit qui descend
    const k = E.inOutCubic(prog(u, 21.7, 22.05));
    if (k < 1) sAvis2(ctx, u, IMG);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H * k); ctx.clip(); sEnd(ctx, u); ctx.restore();
  },
});
