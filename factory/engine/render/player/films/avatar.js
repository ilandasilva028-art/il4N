// Photos de profil du compte (1080×1080, lisibles en petit rond). t ∈ [0,1) : A, [1,2) : B, [2,3) : C.
import { drawStick, POSES, COLORS } from '../lib/stick.js';

export const W = 1080, H = 1080;
export const DURATION = 3;
const VEE = { lean: 0, head: -6, armB: [140, 0], armF: [-140, 0], legB: [20, 0], legF: [-20, 0] };

function stairs(ctx, color = '#3a3a3d') {
  for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#2e2e31' : color; ctx.fillRect(170 + i * 95, 960 - i * 70, 95, 400); }
}

export function draw(ctx, t) {
  ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
  const v = Math.floor(t);
  if (v === 0) {
    // A — le personnage en haut des marches, drapeau rouge (résume la série)
    stairs(ctx);
    const topX = 170 + 5 * 95 + 47, topY = 960 - 5 * 70;
    ctx.fillStyle = '#b5b5b7'; ctx.fillRect(topX + 70, topY - 330, 12, 330);
    ctx.fillStyle = COLORS.red; ctx.beginPath(); ctx.moveTo(topX + 82, topY - 325); ctx.lineTo(topX + 250, topY - 290); ctx.lineTo(topX + 82, topY - 240); ctx.fill();
    drawStick(ctx, topX - 20, topY - 130, VEE, { scale: 0.82 });
  } else if (v === 1) {
    // B — gros plan : personnage blanc sur disque rouge (le plus lisible en tout petit)
    ctx.fillStyle = COLORS.red; ctx.beginPath(); ctx.arc(540, 540, 400, 0, Math.PI * 2); ctx.fill();
    drawStick(ctx, 540, 600, VEE, { scale: 1.3, color: '#f4f4f4' });
  } else {
    // C — face-à-face : toi (blanc) contre toi (gris), séparés par un trait rouge
    ctx.fillStyle = COLORS.red; ctx.fillRect(532, 220, 16, 640);
    drawStick(ctx, 360, 700, POSES.stand, { scale: 1.45, color: '#8c8c8e', face: 1 });
    drawStick(ctx, 720, 700, POSES.stand, { scale: 1.45, color: '#f4f4f4', face: -1 });
  }
}
export const HITS = [];
