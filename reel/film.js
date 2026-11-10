// IL4N Studio — de A à Z. Fonction pure du temps : window.seek(t) peint l'image t.
// Plan : docs/shotlist.md. Temps en beats (u) sur la grille de beats.json (128 bpm).
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, clamp, springU, SPRING, wobble, font, layout, glyph, text, fill, cover, crop, rrect, shake, mix, bump } = M;

// Charte du site il4nstudio.netlify.app (assets/brand.json). Un seul accent : l'or.
const C = { night: '#111018', night2: '#1b1825', paper: '#f4f0e8', white: '#fffdf8', ink: '#17131d', gold: '#d6a96a', muted: '#a49eaa', ink2: '#6d6870', green: '#3f8a62' };
const D = 'Display', A = 'Accent';
const X0 = 72;                       // marge gauche (zone sûre story)

// Chaque accent visuel : [beat, label, sfx, opts] -> sfx.mjs les sonorise.
const HITS = [
  [0, 'Votre', 'impact'],
  [0.5, 'site', 'pop', { pitch: 'A5' }],
  [1, 'web', 'pop', { pitch: 'C6' }],
  [2, 'de A', 'boing', { pitch: 'E5', to: 'A5' }],
  [3, 'à Z', 'boing', { pitch: 'A5', to: 'E6' }],
  [3.75, 'whip vers le téléphone', 'whoosh', { len: 0.45, from: 500, to: 2600 }],
  [4.25, 'téléphone posé', 'thud'],
  [6.5, 'défilement', 'riser', { len: 0.8 }],
  [8, 'DROP : desktop', 'impact'],
  [8.75, 'puce A', 'blip', { pitch: 'A5' }],
  [11.85, 'whip vers les cartes', 'whoosh', { len: 0.4, from: 2600, to: 600, pan: 0.3 }],
  [12.25, 'carte 1', 'thud'],
  [13, 'carte 3', 'thud'],
  [13.75, 'carte 2 (le plus choisi)', 'pop', { pitch: 'E6' }],
  [14.25, 'puce W', 'blip', { pitch: 'C6' }],
  [15.75, 'plongée dans la carte', 'whoosh', { len: 0.4 }],
  [16, 'desktop + mobile', 'click'],
  [16.5, 'mobile arrive', 'click'],
  [17.25, 'légende', 'tick'],
  [19.75, 'morph navigateur', 'whoosh', { len: 0.35, from: 800, to: 2000 }],
  [20.25, 'URL tapée', 'type', { n: 14, len: 0.65 }],
  [22, 'en ligne', 'bell', { pitch: 'E6' }],
  [22.5, 'puce L', 'blip', { pitch: 'E6' }],
  [23.75, 'volet papier', 'whoosh', { len: 0.3, from: 400, to: 1800 }],
  [24, 'Z', 'impact'],
  [25, 'coche 1', 'tick'],
  [25.75, 'coche 2', 'tick'],
  [26.5, 'coche 3', 'tick'],
  [27.25, 'coche 4', 'tick'],
  [28, 'carte de fin', 'impact'],
  [28.5, 'logo', 'bell', { pitch: 'A5' }],
];

// ---------------------------------------------------------------- helpers
const loopRect = (ctx, x, y, w, h, r, color) => { rrect(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); };
function shadow(ctx, blur, y, a = 0.45) { ctx.shadowColor = `rgba(0,0,0,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = y; }
function noShadow(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

// une ligne de texte, glyphe par glyphe, qui monte sur un ressort
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

// coche dessinée (pas de glyphe : évite les polices de secours)
function check(ctx, cx, cy, r, p, bg, fg) {
  if (p <= 0) return;
  const s = E.outBack(clamp(p * 1.6), 2.2);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, M.TAU); ctx.fillStyle = bg; ctx.fill();
  const q = clamp((p - 0.3) / 0.7);
  ctx.strokeStyle = fg; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  const pts = [[-0.42, 0.02], [-0.12, 0.32], [0.45, -0.3]];
  ctx.moveTo(pts[0][0] * r, pts[0][1] * r);
  const a = clamp(q * 2), b = clamp(q * 2 - 1);
  ctx.lineTo(lerp(pts[0][0], pts[1][0], a) * r, lerp(pts[0][1], pts[1][1], a) * r);
  if (b > 0) ctx.lineTo(lerp(pts[1][0], pts[2][0], b) * r, lerp(pts[1][1], pts[2][1], b) * r);
  ctx.stroke(); ctx.restore();
}

// flèche ↗ dessinée
function arrowNE(ctx, x, y, s, color, lw) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x + s, y); ctx.moveTo(x + s * 0.25, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + s * 0.75); ctx.stroke(); ctx.restore();
}

// téléphone : coque + écran (draw(ctx, sx, sy, sw, sh) peint l'écran)
function phone(ctx, x, y, w, h, draw) {
  ctx.save();
  shadow(ctx, 80, 40, 0.55);
  loopRect(ctx, x, y, w, h, w * 0.14, '#08070c');
  noShadow(ctx);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2; rrect(ctx, x + 1, y + 1, w - 2, h - 2, w * 0.14); ctx.stroke();
  const b = w * 0.035, sx = x + b, sy = y + b, sw = w - 2 * b, sh = h - 2 * b;
  ctx.save(); rrect(ctx, sx, sy, sw, sh, w * 0.11); ctx.clip();
  draw(ctx, sx, sy, sw, sh);
  ctx.restore();
  loopRect(ctx, x + w / 2 - w * 0.14, sy + w * 0.03, w * 0.28, w * 0.075, w * 0.04, '#000');
  ctx.restore();
}

// navigateur : barre + URL + page
function browser(ctx, x, y, w, h, url, chars, draw, { pill = 0 } = {}) {
  ctx.save();
  shadow(ctx, 90, 40, 0.5);
  loopRect(ctx, x, y, w, h, 28, C.night2);
  noShadow(ctx);
  const bar = 78;
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.beginPath(); ctx.arc(x + 36 + i * 30, y + bar / 2, 9, 0, M.TAU); ctx.fillStyle = c; ctx.fill(); });
  const ux = x + 140, uw = w - 170;
  loopRect(ctx, ux, y + 17, uw, bar - 34, 22, 'rgba(255,255,255,0.08)');
  const shown = url.slice(0, chars);
  text(ctx, shown, ux + 24, y + bar / 2 + 11, font(30, 500, D), '#e6e2ea');
  if (chars < url.length) {               // curseur
    ctx.font = font(30, 500, D);
    const cw = ctx.measureText(shown).width;
    ctx.fillStyle = C.gold; ctx.fillRect(ux + 26 + cw, y + bar / 2 - 15, 3, 30);
  }
  if (pill > 0) {                          // pastille « En ligne »
    const s = E.outBack(clamp(pill), 2.5), pw = 190, ph = 44, px = x + w - 30 - pw, py = y + bar / 2 - ph / 2;
    ctx.save(); ctx.translate(px + pw / 2, py + ph / 2); ctx.scale(s, s); ctx.translate(-(px + pw / 2), -(py + ph / 2));
    loopRect(ctx, px, py, pw, ph, 22, C.green);
    ctx.beginPath(); ctx.arc(px + 26, py + ph / 2, 8, 0, M.TAU); ctx.fillStyle = '#c9f2d9'; ctx.fill();
    text(ctx, 'En ligne', px + 44, py + ph / 2 + 10, font(28, 700, D), C.white);
    ctx.restore();
  }
  ctx.save(); rrect(ctx, x, y + bar, w, h - bar, 0); ctx.beginPath(); ctx.roundRect(x, y + bar, w, h - bar, [0, 0, 28, 28]); ctx.clip();
  draw(ctx, x, y + bar, w, h - bar);
  ctx.restore();
  ctx.restore();
}

// puce lettre + phrase dorée + sous-ligne (A / W / L)
function chip(ctx, u, u0, letter, line, sub, y, dark = true) {
  const k = springU(u, u0, SPRING.bouncy), k2 = springU(u, u0 + 0.25, SPRING.gentle), k3 = springU(u, u0 + 0.5, SPRING.gentle);
  if (k <= 0) return;
  const s = 128, x = X0;
  ctx.save(); ctx.translate(x + s / 2, y + s / 2); ctx.rotate((1 - k) * -0.6); ctx.scale(k, k); ctx.translate(-(x + s / 2), -(y + s / 2));
  loopRect(ctx, x, y, s, s, 30, C.gold);
  text(ctx, letter, x + s / 2, y + s / 2 + 32, font(92, 900, D), C.ink, 'center');
  ctx.restore();
  ctx.save(); ctx.globalAlpha = clamp(k2 * 1.5);
  text(ctx, line, x + s + 30 - (1 - k2) * 60, y + 66, font(72, 400, A), dark ? C.white : C.ink);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = clamp(k3 * 1.5);
  text(ctx, sub, x + s + 32 - (1 - k3) * 60, y + 116, font(34, 600, D), dark ? C.muted : C.ink2, 'left', 0.5);
  ctx.restore();
}

// ---------------------------------------------------------------- S1 accroche (u 0..4)
function sHook(ctx, u) {
  fill(ctx, C.night);
  // halo or derrière le titre
  const g = ctx.createRadialGradient(780, 640, 0, 780, 640, 760);
  g.addColorStop(0, 'rgba(214,169,106,0.16)'); g.addColorStop(1, 'rgba(214,169,106,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // kicker façon site : trait + capitales dorées
  const kk = E.outCubic(prog(u, -0.2, 0.8));
  ctx.fillStyle = C.gold; ctx.fillRect(X0, 553, 56 * kk, 3);
  ctx.save(); ctx.globalAlpha = kk; text(ctx, 'IL4N STUDIO · SARRIANS', X0 + 76 - (1 - kk) * 30, 566, font(30, 700, D), C.gold, 'left', 6); ctx.restore();
  // ligne 1 : Votre site web,
  const f1 = font(122, 900, D);
  const words = [0, 6, 11];                 // index de début des mots
  springLine(ctx, 'Votre site web,', X0 - 4, 760, f1, C.white, u, 0, {
    track: -5, drop: 150, groups: (j) => { const w = j >= 11 ? 2 : j >= 6 ? 1 : 0; return [-0.3, 0.5, 1][w] + (j - words[w]) * 0.03; },
  });
  // ligne 2 : de A à Z.  (italique dorée, comme « bonne impression. » sur le site)
  const f2 = font(250, 400, A);
  const L2 = layout(ctx, 'de A à Z.', f2, -6);
  const base2 = 1010;
  L2.glyphs.forEach((gl, j) => {
    const big = gl.ch === 'A' || gl.ch === 'Z';
    const start = j < 4 ? 2 + j * 0.04 : 3 + (j - 5) * 0.04;
    const k = springU(u, start, big ? SPRING.wobbly : SPRING.bouncy);
    if (k <= 0.001) return;
    const sq = big ? 0.12 * wobble(u - start - 0.35, 2.4, 4) : 0;
    glyph(ctx, gl.ch, X0 + gl.cx, base2 + (1 - k) * 170, f2, C.gold, clamp(k) * (1 + sq), clamp(k) * (1 - sq));
  });
  // trait A -> Z sous la ligne, tracé en 1 beat
  const a = L2.glyphs.find((q) => q.ch === 'A'), z = L2.glyphs.find((q) => q.ch === 'Z');
  const tp = E.inOutCubic(prog(u, 3.1, 3.7));
  if (tp > 0 && a && z) {
    const x1 = X0 + a.cx, x2 = X0 + z.cx, yy = base2 + 54;
    ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, yy); ctx.quadraticCurveTo((x1 + x2) / 2, yy + 46, lerp(x1, x2, tp), yy + (1 - (2 * tp - 1) ** 2) * 23); ctx.stroke(); ctx.restore();
  }
  // sous-titre
  const sp = springU(u, 1.5, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(sp);
  text(ctx, 'Création · mise en ligne · gestion', X0, 1150 + (1 - sp) * 40, font(42, 500, D), C.muted);
  ctx.restore();
}

// ---------------------------------------------------------------- S2 téléphone, vrai site (u 4..8)
const PH = { w: 640, h: 1330 };
function sPhone(ctx, u, IMG, rise) {
  fill(ctx, C.night);
  const x = (W - PH.w) / 2, y = 345 + (1 - rise) * 1500;
  // légende honnête au-dessus
  const lk = springU(u, 4.5, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(lk);
  ctx.fillStyle = C.gold; ctx.fillRect(X0, 280, 56, 3);
  text(ctx, 'EXEMPLE : MON PROPRE SITE', X0 + 76, 293, font(30, 700, D), C.gold, 'left', 5);
  ctx.restore();
  // un léger roulis à la pose
  const q = 0.035 * wobble(u - 4.25, 2.2, 5);
  ctx.save(); ctx.translate(W / 2, y + PH.h); ctx.scale(1 + q, 1 - q); ctx.translate(-W / 2, -(y + PH.h));
  phone(ctx, x, y, PH.w, PH.h, (c, sx, sy, sw, sh) => {
    const img = IMG.mscroll; if (!img) return;
    const sc = sw / img.width, visH = sh / sc;
    // lecture, puis défilement qui accélère jusqu'au drop
    const p = E.inCubic(prog(u, 5.6, 8));
    const yy = Math.min(img.height - visH, p * 5600 + E.outCubic(prog(u, 4.6, 5.6)) * 260);
    crop(c, img, [0, yy, img.width, visH], sx, sy, sw, sh);
  });
  ctx.restore();
}

// ---------------------------------------------------------------- S3 A · conception (u 8..12)
const R3 = { x: X0, y: 300, w: W - 2 * X0, h: 1030 };
function sDesign(ctx, u, IMG) {
  fill(ctx, C.night);
  ctx.save(); shake(ctx, u, 8, 22, 5, 0.14);
  const p = E.outCubic(prog(u, 8, 11.8));
  const z = 1.32 * (1 / 1.32) ** p;          // zoom log : travelling régulier
  browser(ctx, R3.x, R3.y, R3.w, R3.h, 'il4nstudio.netlify.app', 99, (c, x, y, w, h) => {
    if (IMG.desk) cover(c, IMG.desk, x, y, w, h, { fx: 0.04, fy: 0.42, zoom: z });
  });
  ctx.restore();
  chip(ctx, u, 8.75, 'A', 'Je le conçois.', 'DESIGN SUR MESURE', 1380);
}

// ---------------------------------------------------------------- S4 W · création (u 12..16)
const CARDS = [
  { src: [2, 592, 756, 760], cx: 300, cy: 900, rot: -0.12, u0: 12.25 },
  { src: [1598, 592, 758, 760], cx: 780, cy: 920, rot: 0.11, u0: 13 },
  { src: [800, 592, 760, 760], cx: 540, cy: 850, rot: -0.015, u0: 13.75 },
];
const CS = 580;
function sCards(ctx, u, IMG) {
  fill(ctx, C.paper);
  // plongée dans la carte du milieu (push-through) avant la coupe
  const pz = E.inCubic(prog(u, 15.4, 16));
  const zoom = 1 * (7 / 1) ** pz;
  ctx.save();
  M.zoomAbout(ctx, zoom, CARDS[2].cx, CARDS[2].cy - 60);
  CARDS.forEach((cd) => {
    const k = springU(u, cd.u0 - 0.25, SPRING.bouncy);
    if (k <= 0) return;
    const y = cd.cy - (1 - k) * 1300;
    const rot = cd.rot + (1 - k) * cd.rot * 4;
    ctx.save(); ctx.translate(cd.cx, y); ctx.rotate(rot);
    shadow(ctx, 60, 28, 0.25);
    loopRect(ctx, -CS / 2, -CS / 2, CS, CS, 30, C.white);
    noShadow(ctx);
    if (IMG.cards) { ctx.save(); rrect(ctx, -CS / 2, -CS / 2, CS, CS, 30); ctx.clip(); crop(ctx, IMG.cards, cd.src, -CS / 2, -CS / 2, CS, CS); ctx.restore(); }
    ctx.restore();
  });
  ctx.restore();
  // titre au-dessus
  const tk = springU(u, 12.25, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(tk) * (1 - pz);
  ctx.fillStyle = C.gold; ctx.fillRect(X0, 330, 56, 3);
  text(ctx, 'VOS OFFRES, CLAIRES', X0 + 76, 343, font(30, 700, D), '#9a663e', 'left', 5);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = 1 - pz;
  chip(ctx, u, 14.25, 'W', 'Je le crée.', 'UN SITE RAPIDE, À VOTRE IMAGE', 1380, false);
  ctx.restore();
}

// ---------------------------------------------------------------- S5 mobile + ordinateur (u 16..20)
const R5 = { x: 60, y: 330, w: 900, h: 590 };
const R6 = { x: X0, y: 330, w: W - 2 * X0, h: 1000 };
function sResponsive(ctx, u, IMG) {
  fill(ctx, C.night2);
  const kd = springU(u, 15.9, SPRING.snappy), km = springU(u, 16.4, SPRING.snappy);
  const m = E.inOutCubic(prog(u, 19.5, 20));        // morph vers le navigateur de S6
  const lg = (a, b) => a * (b / a) ** m;
  const bx = lerp(R5.x - (1 - kd) * 1100, R6.x, m), by = lerp(R5.y, R6.y, m), bw = lg(R5.w, R6.w), bh = lg(R5.h, R6.h);
  const drift = (u - 16) * 4 * (1 - m);
  browser(ctx, bx - drift, by, bw, bh, 'il4nstudio.netlify.app', 99, (c, x, y, w, h) => {
    if (IMG.desk) cover(c, IMG.desk, x, y, w, h, { fx: 0.5, fy: 0.3 });
    if (m > 0) { c.fillStyle = `rgba(27,24,37,${m})`; c.fillRect(x, y, w, h); }
  });
  const pw = 340, ph = 700;
  const px = 670 + (1 - km) * 700 + m * 900 + drift, py = 640 + bump(u, 18, 0.5) * -18;
  phone(ctx, px, py, pw, ph, (c, sx, sy, sw, sh) => { if (IMG.mob) cover(c, IMG.mob, sx, sy, sw, sh, { fx: 0.5, fy: 0 }); });
  const t1 = springU(u, 17.25, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(t1) * (1 - m);
  text(ctx, 'Parfait sur mobile', X0, 1430 - (1 - t1) * 40, font(96, 400, A), C.gold);
  text(ctx, 'et sur ordinateur.', X0, 1495 - (1 - t1) * 30, font(48, 700, D), C.white);
  ctx.restore();
}

// ---------------------------------------------------------------- S6 L · en ligne (u 20..24)
function sOnline(ctx, u, IMG) {
  fill(ctx, C.night2);
  const url = 'il4nstudio.netlify.app';
  const chars = Math.floor(clamp(prog(u, 20.2, 21.5)) * url.length);
  const load = E.inOutCubic(prog(u, 21.5, 22));
  const pill = prog(u, 22, 22.6);
  // volet papier qui monte (transition vers S7)
  browser(ctx, R6.x, R6.y, R6.w, R6.h, url, chars, (c, x, y, w, h) => {
    if (u >= 22 && IMG.reals) {
      const sc = E.outCubic(prog(u, 22, 23.8));
      cover(c, IMG.reals, x, y, w, h, { fx: 0.5, fy: 0.08 + sc * 0.1, zoom: 1.02 });
    }
    if (u < 22) {                         // l'adresse tapée en grand pendant le chargement
      const shown = url.slice(0, chars), f = font(66, 900, D);
      const bk = springU(u, 20, SPRING.gentle);
      c.save(); c.globalAlpha = clamp(bk) * (1 - load);
      text(c, 'MISE EN LIGNE', x + 60, y + h / 2 - 70, font(30, 700, D), C.gold, 'left', 6);
      text(c, shown, x + 60, y + h / 2 + 20, f, C.white, 'left', -2);
      c.restore();
    }
    if (load > 0 && load < 1) { c.fillStyle = C.gold; c.fillRect(x, y, w * load, 6); }
  }, { pill });
  chip(ctx, u, 22.5, 'L', 'Je le mets en ligne.', 'NOM DE DOMAINE & HÉBERGEMENT', 1380);
}

// ---------------------------------------------------------------- S7 Z · zéro souci (u 24..28)
const ITEMS = ['Mises à jour', 'Sécurité & sauvegardes', 'Modifications', 'Suivi & conseils'];
function sZero(ctx, u) {
  fill(ctx, C.paper);
  const kz = springU(u, 23.9, SPRING.wobbly);
  const sq = 0.1 * wobble(u - 24.2, 2, 4);
  ctx.save(); ctx.translate(X0 + 150, 860); ctx.rotate((1 - kz) * 0.5); ctx.scale(kz * (1 + sq), kz * (1 - sq)); ctx.translate(-(X0 + 150), -860);
  text(ctx, 'Z', X0 - 10, 860, font(600, 900, D), C.gold);
  ctx.restore();
  const tk = springU(u, 24.4, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(tk * 1.4);
  text(ctx, 'Zéro souci.', X0 + 420 - (1 - tk) * 60, 600, font(110, 400, A), C.ink);
  text(ctx, 'Après la mise en ligne,', X0 + 424 - (1 - tk) * 40, 690, font(38, 500, D), C.ink2);
  text(ctx, 'je m\'en occupe pour vous.', X0 + 424 - (1 - tk) * 40, 738, font(38, 700, D), C.ink);
  ctx.restore();
  ITEMS.forEach((it, i) => {
    const u0 = 25 + i * 0.75, k = springU(u, u0 - 0.1, SPRING.snappy);
    if (k <= 0) return;
    const y = 1000 + i * 112;
    ctx.save(); ctx.globalAlpha = clamp(k * 1.5);
    loopRect(ctx, X0 - (1 - k) * 80, y - 62, W - 2 * X0, 92, 46, C.white);
    check(ctx, X0 + 50 - (1 - k) * 80, y - 16, 28, prog(u, u0, u0 + 0.6), C.gold, C.ink);
    text(ctx, it, X0 + 100 - (1 - k) * 80, y, font(44, 700, D), C.ink);
    ctx.restore();
  });
}

// ---------------------------------------------------------------- S8 carte de fin (u 28..)
const PILL = { x: X0, y: 1130, w: W - 2 * X0 - 60, h: 136 };
function sEnd(ctx, u) {
  fill(ctx, C.night);
  const g = ctx.createRadialGradient(540, 820, 0, 540, 820, 800);
  g.addColorStop(0, 'rgba(214,169,106,0.14)'); g.addColorStop(1, 'rgba(214,169,106,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // logo « il4n. » comme sur le site (point doré)
  const f = font(230, 900, D);
  const L = springLine(ctx, 'il4n', X0 - 8, 760, f, C.white, u, 28.1, { stagger: 0.06, drop: 140, track: -10 });
  const kd = springU(u, 28.5, SPRING.wobbly);
  if (kd > 0) { ctx.beginPath(); ctx.arc(X0 - 8 + L.width + 34, 742, 22 * kd, 0, M.TAU); ctx.fillStyle = C.gold; ctx.fill(); }
  const t1 = springU(u, 28.75, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(t1 * 1.4);
  text(ctx, 'Votre site, de A à Z.', X0, 900 - (1 - t1) * 40, font(96, 400, A), C.gold);
  text(ctx, 'Création · mise en ligne · gestion', X0, 975 - (1 - t1) * 30, font(40, 500, D), C.muted);
  ctx.restore();
  // pastille CTA (arrive du volet papier de S7)
  const br = 1 + 0.035 * bump(u, 30.5, 0.6);
  ctx.save(); ctx.translate(PILL.x + PILL.w / 2, PILL.y + PILL.h / 2); ctx.scale(br, br); ctx.translate(-(PILL.x + PILL.w / 2), -(PILL.y + PILL.h / 2));
  loopRect(ctx, PILL.x, PILL.y, PILL.w, PILL.h, PILL.h / 2, C.gold);
  const tp = springU(u, 28.3, SPRING.gentle);
  ctx.globalAlpha = clamp(tp * 1.5);
  text(ctx, 'Écrivez-moi en privé', PILL.x + 56, PILL.y + PILL.h / 2 + 19, font(54, 800, D), C.ink);
  arrowNE(ctx, PILL.x + PILL.w - 92, PILL.y + PILL.h / 2 - 20, 38, C.ink, 7);
  ctx.restore();
  const t3 = springU(u, 29.25, SPRING.gentle);
  ctx.save(); ctx.globalAlpha = clamp(t3);
  text(ctx, 'il4nstudio.netlify.app', X0 + 4, 1340, font(36, 600, D), C.muted, 'left', 1);
  ctx.restore();
}

// ---------------------------------------------------------------- montage
M.film({
  fonts: [font(100, 900, D), font(100, 800, D), font(100, 700, D), font(100, 600, D), font(100, 500, D), font(100, 400, A)],
  images: {
    mscroll: 'assets/shots/clean_mobile_scroll.png',
    desk: 'assets/shots/clean_desktop.png',
    mob: 'assets/shots/clean_mobile.png',
    cards: 'assets/shots/section_01_chaque-id-e.png',
    reals: 'assets/shots/clean_reals.png',
  },
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 3.6) { sHook(ctx, u); return; }
    if (u < 8) {
      // whip vertical : l'accroche sort par le haut pendant que le téléphone monte
      const k = springU(u, 3.6, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(0, -k * 1500); sHook(ctx, u); ctx.restore(); }
      ctx.save(); ctx.translate(0, (1 - Math.min(1, k)) * 1500); sPhone(ctx, u, IMG, 1); ctx.restore();
      return;
    }
    if (u < 11.85) { sDesign(ctx, u, IMG); return; }
    if (u < 16) {
      // whip horizontal : A sort à gauche, les cartes entrent par la droite
      const k = springU(u, 11.7, SPRING.snappy);
      if (k < 0.995) { ctx.save(); ctx.translate(-k * W, 0); sDesign(ctx, u, IMG); ctx.restore(); }
      ctx.save(); ctx.translate((1 - Math.min(1, k)) * W, 0); sCards(ctx, u, IMG); ctx.restore();
      return;
    }
    if (u < 20) { sResponsive(ctx, u, IMG); return; }
    if (u < 23.6) { sOnline(ctx, u, IMG); return; }
    if (u < 27.7) {
      // volet papier qui monte : S6 dessous, S7 révélé de bas en haut
      const k = E.inOutCubic(prog(u, 23.6, 24));
      if (k < 1) sOnline(ctx, u, IMG);
      ctx.save(); ctx.beginPath(); ctx.rect(0, H * (1 - k), W, H * k); ctx.clip(); sZero(ctx, u); ctx.restore();
      return;
    }
    // le papier se rétracte dans la pastille CTA
    const m = E.inOutCubic(prog(u, 27.7, 28.15));
    sEnd(ctx, u);
    if (m < 1) {
      const lg = (a, b) => a * (b / a) ** m;
      const x = lerp(0, PILL.x, m), y = lerp(0, PILL.y, m), w = lg(W, PILL.w), h = lg(H, PILL.h), r = lerp(0, PILL.h / 2, m);
      ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip();
      ctx.fillStyle = mix(C.paper, C.gold, m); ctx.fillRect(0, 0, W, H);
      if (m < 0.35) { ctx.globalAlpha = 1 - m / 0.35; sZero(ctx, u); }
      ctx.restore();
    }
  },
});
