// Transitions entre plans (fonction pure du temps) : on rend le plan sortant et le plan entrant dans deux
// tampons hors écran, puis on les compose. Types :
//   - 'whip'   : balayage horizontal très rapide avec flou de mouvement (dir = 1 vers la gauche, -1 vers la droite) ;
//   - 'zoom'   : on traverse l'image (zoom avant + flou radial), le plan suivant arrive en se posant ;
//   - 'glitch' : bug numérique (tranches décalées, couleurs séparées) ;
//   - 'drop'   : écran noir d'une fraction de seconde (impact), pour un temps fort.
// Usage dans draw() : if (transition(ctx, t, renderAt, CUTS)) return;  sinon renderAt(ctx, t).
// CUTS = [{ t, type, dir, d }], t = instant de la coupe, d = durée totale (défaut 0,24 s).
import { W, H, hash } from './kit.js';

let A = null, B = null;
const buf = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

function renderInto(c, renderAt, t) {
  const g = c.getContext('2d', { alpha: false });
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = 'none'; renderAt(g, t); g.restore();
}

export function transition(ctx, t, renderAt, cuts) {
  const cut = cuts.find((c) => Math.abs(t - c.t) < (c.d ?? 0.24) / 2);
  if (!cut) return false;
  const d = cut.d ?? 0.24, k = (t - (cut.t - d / 2)) / d; // 0 → 1
  if (!A) { A = buf(); B = buf(); }
  const eps = 1 / 240;
  renderInto(A, renderAt, Math.min(t, cut.t - eps));
  renderInto(B, renderAt, Math.max(t, cut.t + eps));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
  if (cut.type === 'whip') {
    const dir = cut.dir ?? 1, speed = Math.sin(Math.PI * k);
    for (let i = 0; i < 6; i++) {
      const o = (i / 5 - 0.5) * 110 * speed;
      ctx.globalAlpha = 1 / (i + 1);
      ctx.drawImage(A, -dir * e * W + o, 0);
      ctx.drawImage(B, dir * (1 - e) * W + o, 0);
    }
  } else if (cut.type === 'zoom') {
    const src = k < 0.5 ? A : B;
    const s = k < 0.5 ? 1 + 2.2 * (k * 2) ** 2 : 1.35 - 0.35 * ease((k - 0.5) * 2);
    const n = 5, spread = Math.sin(Math.PI * k) * 0.08;
    for (let i = 0; i < n; i++) {
      const si = s * (1 + spread * (i / (n - 1) - 0.5));
      ctx.globalAlpha = 1 / (i + 1);
      ctx.drawImage(src, W / 2 - (W * si) / 2, H / 2 - (H * si) / 2, W * si, H * si);
    }
    ctx.globalAlpha = Math.max(0, 0.5 - Math.abs(k - 0.5)) * 1.2; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  } else if (cut.type === 'glitch') {
    const f = Math.floor(t * 60);
    ctx.globalAlpha = 1; ctx.drawImage(k < 0.5 ? A : B, 0, 0);
    for (let i = 0; i < 14; i++) {
      const y = Math.floor(hash(f * 31 + i) * H), h = 20 + hash(f * 17 + i) * 140, x = (hash(f * 7 + i) - 0.5) * 220 * Math.sin(Math.PI * k);
      const src = hash(f + i * 3) > 0.5 ? A : B;
      ctx.drawImage(src, 0, y, W, h, x, y, W, h);
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * Math.sin(Math.PI * k);
    ctx.drawImage(k < 0.5 ? A : B, 14, 0); ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.25 * Math.sin(Math.PI * k);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#e3342c', '#3cf', '#fff', '#b28cff'][i]; ctx.fillRect(0, hash(f * 5 + i) * H, W, 6 + hash(i + f) * 18); }
  } else { // drop
    ctx.globalAlpha = 1; if (k > 0.6) ctx.drawImage(B, 0, 0); else if (k < 0.25) ctx.drawImage(A, 0, 0);
  }
  ctx.restore();
  return true;
}
const ease = (x) => 1 - (1 - x) ** 3;
