// Analyse image et montage : détection des plans, netteté, mouvement (intensité + estimation des
// mouvements de caméra), défauts (noir, image figée), images clés et planche contact.
import fs from 'node:fs';
import path from 'node:path';
import { run, runOk } from '../core/exec.ts';
import { TOOLS, LIMITS } from '../core/config.ts';
import type { Logger } from '../core/log.ts';
import { extractFrames, type RawFrames } from './frames.ts';

export interface Shot { index: number; start: number; end: number; duration: number; cutScore: number | null }
export interface SceneReport {
  threshold: number; cuts: number[]; transitions: number[]; shots: Shot[]; shotCount: number;
  avgShotSec: number; medianShotSec: number; minShotSec: number; maxShotSec: number;
  cutsPerMinute: number; cutsFirst3s: number; firstCutSec: number | null;
  scoreCurve: { t: number; s: number }[];
}

export async function detectScenes(file: string, durationSec: number, log?: Logger): Promise<SceneReport> {
  // Score de changement de scène FFmpeg (0..1) sur chaque image, calculé sur une version réduite.
  const r = await runOk(TOOLS.ffmpeg, ['-v', 'error', '-threads', String(LIMITS.ffmpegThreads), '-i', file, '-an',
    '-vf', "scale=160:-2,select='gte(scene,0)',metadata=print:file=-", '-f', 'null', '-'], { log });
  const curve: { t: number; s: number }[] = [];
  let t = 0;
  for (const line of r.stdout.split('\n')) {
    const mt = line.match(/pts_time:([\d.]+)/);
    if (mt) { t = Number(mt[1]); continue; }
    const ms = line.match(/lavfi\.scene_score=([\d.]+)/);
    if (ms) curve.push({ t, s: Number(ms[1]) });
  }
  // Seuil adaptatif : un vrai cut dépasse 0,3 ET se détache nettement du voisinage (évite de
  // compter chaque image d'une animation rapide comme un plan).
  const threshold = 0.3;
  const cuts: number[] = []; const cutScores: number[] = [];
  for (let i = 1; i < curve.length; i++) {
    const s = curve[i].s;
    if (s < threshold) continue;
    const win = curve.slice(Math.max(0, i - 6), i + 7).filter((_, k, arr) => arr[k] !== curve[i]).map((c) => c.s).sort((a, b) => a - b);
    const med = win.length ? win[Math.floor(win.length / 2)] : 0;
    if (s < med * 2.5 + 0.05) continue;
    if (cuts.length && curve[i].t - cuts[cuts.length - 1] < 0.2) { // deux pics très proches = un seul cut
      if (s > cutScores[cutScores.length - 1]) { cuts[cuts.length - 1] = curve[i].t; cutScores[cutScores.length - 1] = s; }
      continue;
    }
    cuts.push(curve[i].t); cutScores.push(s);
  }
  const bounds = [0, ...cuts, durationSec];
  const shots: Shot[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const d = bounds[i + 1] - bounds[i];
    if (d <= 0.01) continue;
    shots.push({ index: shots.length, start: r2(bounds[i]), end: r2(bounds[i + 1]), duration: r2(d), cutScore: i > 0 ? r2(cutScores[i - 1]) : null });
  }
  const durs = shots.map((s) => s.duration).sort((a, b) => a - b);
  // Courbe allégée pour le rapport (max ~400 points).
  const step = Math.max(1, Math.ceil(curve.length / 400));
  return {
    threshold, cuts: cuts.map(r2), transitions: [], shots, shotCount: shots.length,
    avgShotSec: r2(durationSec / Math.max(1, shots.length)), medianShotSec: r2(durs[Math.floor(durs.length / 2)] || durationSec),
    minShotSec: r2(durs[0] || durationSec), maxShotSec: r2(durs[durs.length - 1] || durationSec),
    cutsPerMinute: r2((cuts.length / Math.max(1, durationSec)) * 60), cutsFirst3s: cuts.filter((c) => c < 3).length,
    firstCutSec: cuts.length ? r2(cuts[0]) : null,
    scoreCurve: curve.filter((_, i) => i % step === 0).map((c) => ({ t: r2(c.t), s: r2(c.s) })),
  };
}

export interface SharpnessReport { meanLaplacianVar: number; minLaplacianVar: number; edgeDensity: number; perFrame: { t: number; v: number }[]; analysisWidth: number }

export function analyzeSharpness(rf: RawFrames): SharpnessReport {
  const { w, h } = rf;
  const per: { t: number; v: number }[] = [];
  let edgesTot = 0;
  rf.frames.forEach((buf, fi) => {
    let s = 0, s2 = 0, n = 0, edges = 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = buf[i - 1] + buf[i + 1] + buf[i - w] + buf[i + w] - 4 * buf[i];
      s += lap; s2 += lap * lap; n++;
      if (Math.abs(lap) > 30) edges++;
    }
    const mean = s / n;
    per.push({ t: r2(fi / rf.fps), v: Math.round(s2 / n - mean * mean) });
    edgesTot += edges / n;
  });
  const vals = per.map((p) => p.v);
  return {
    meanLaplacianVar: Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)),
    minLaplacianVar: Math.min(...vals),
    edgeDensity: Math.round((edgesTot / Math.max(1, rf.frames.length)) * 1000) / 10,
    perFrame: per, analysisWidth: w,
  };
}

export interface MotionReport {
  meanEnergy: number; energyFirst3s: number; energyCurve: { t: number; e: number }[];
  staticPct: number; camera: { panLeftPct: number; panRightPct: number; tiltUpPct: number; tiltDownPct: number; zoomInPct: number; zoomOutPct: number; shakePct: number };
  dominantCamera: string; note: string;
}

function sad(a: Buffer, b: Buffer, w: number, h: number, dx: number, dy: number, scale = 1): number {
  // Somme des écarts absolus entre a et b décalée/zoomée (b échantillonnée), sur la zone centrale.
  let s = 0, n = 0;
  const cx = w / 2, cy = h / 2, m = 6;
  for (let y = m; y < h - m; y += 1) for (let x = m; x < w - m; x += 1) {
    const sx = Math.round(cx + (x - cx) * scale + dx), sy = Math.round(cy + (y - cy) * scale + dy);
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
    s += Math.abs(a[y * w + x] - b[sy * w + sx]); n++;
  }
  return n ? s / n : 255;
}

export function analyzeMotion(rf: RawFrames): MotionReport {
  const { w, h, frames, fps } = rf;
  const energy: { t: number; e: number }[] = [];
  const cam = { panLeft: 0, panRight: 0, tiltUp: 0, tiltDown: 0, zoomIn: 0, zoomOut: 0, shake: 0 };
  let staticN = 0, pairs = 0;
  let prevDx = 0, prevDy = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1], b = frames[i];
    const base = sad(a, b, w, h, 0, 0);
    energy.push({ t: r2(i / fps), e: Math.round(base * 10) / 10 });
    pairs++;
    if (base < 1.2) { staticN++; prevDx = prevDy = 0; continue; }
    if (base > 60) { prevDx = prevDy = 0; continue; } // cut probable : pas un mouvement de caméra
    let best = { dx: 0, dy: 0, s: 1, v: base };
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      if (!dx && !dy) continue;
      const v = sad(a, b, w, h, dx, dy);
      if (v < best.v) best = { dx, dy, s: 1, v };
    }
    for (const s of [0.94, 0.97, 1.03, 1.06]) {
      const v = sad(a, b, w, h, 0, 0, s);
      if (v < best.v) best = { dx: 0, dy: 0, s, v };
    }
    if (best.v > base * 0.8) { prevDx = prevDy = 0; continue; } // mouvement interne au plan, pas global
    // Contenu qui se déplace vers la droite (dx<0 dans b) = caméra qui part à gauche.
    if (best.s < 1) cam.zoomOut++; else if (best.s > 1) cam.zoomIn++;
    else if (Math.abs(best.dx) >= Math.abs(best.dy)) { if (best.dx > 0) cam.panRight++; else cam.panLeft++; }
    else { if (best.dy > 0) cam.tiltDown++; else cam.tiltUp++; }
    if ((prevDx && Math.sign(prevDx) === -Math.sign(best.dx)) || (prevDy && Math.sign(prevDy) === -Math.sign(best.dy))) cam.shake++;
    prevDx = best.dx; prevDy = best.dy;
  }
  const pct = (n: number) => Math.round((n / Math.max(1, pairs)) * 1000) / 10;
  const camera = { panLeftPct: pct(cam.panLeft), panRightPct: pct(cam.panRight), tiltUpPct: pct(cam.tiltUp), tiltDownPct: pct(cam.tiltDown), zoomInPct: pct(cam.zoomIn), zoomOutPct: pct(cam.zoomOut), shakePct: pct(cam.shake) };
  const labels: [number, string][] = [[camera.zoomInPct, 'zooms avant / poussées'], [camera.zoomOutPct, 'zooms arrière'], [camera.panLeftPct + camera.panRightPct, 'panoramiques horizontaux'], [camera.tiltUpPct + camera.tiltDownPct, 'mouvements verticaux (défilement, tilt)'], [camera.shakePct, 'tremblements / caméra à l’épaule']];
  labels.sort((a, b) => b[0] - a[0]);
  const meanE = energy.reduce((a, x) => a + x.e, 0) / Math.max(1, energy.length);
  const first = energy.filter((x) => x.t <= 3);
  return {
    meanEnergy: Math.round(meanE * 10) / 10,
    energyFirst3s: Math.round((first.reduce((a, x) => a + x.e, 0) / Math.max(1, first.length)) * 10) / 10,
    energyCurve: energy, staticPct: pct(staticN), camera,
    dominantCamera: labels[0][0] >= 5 ? labels[0][1] : 'caméra majoritairement fixe',
    note: 'Estimation par recherche de translation/zoom global sur images 96 px à 10 i/s : indicative, ne distingue pas un vrai mouvement de caméra d’un défilement d’écran ou d’une animation plein cadre.',
  };
}

export interface DefectReport { blackSegments: { start: number; end: number }[]; frozenSegments: { start: number; end: number }[] }

export async function detectDefects(file: string, log?: Logger): Promise<DefectReport> {
  const r = await run(TOOLS.ffmpeg, ['-v', 'info', '-threads', String(LIMITS.ffmpegThreads), '-i', file, '-an', '-vf',
    'scale=270:-2,blackdetect=d=0.08:pix_th=0.06,freezedetect=n=-55dB:d=0.6', '-f', 'null', '-'], { log });
  const black: { start: number; end: number }[] = [];
  for (const m of r.stderr.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)/g)) black.push({ start: r2(+m[1]), end: r2(+m[2]) });
  const frozen: { start: number; end: number }[] = [];
  let fs0: number | null = null;
  for (const line of r.stderr.split('\n')) {
    const a = line.match(/freeze_start: ([\d.]+)/); if (a) fs0 = +a[1];
    const b = line.match(/freeze_end: ([\d.]+)/); if (b && fs0 !== null) { frozen.push({ start: r2(fs0), end: r2(+b[1]) }); fs0 = null; }
  }
  return { blackSegments: black, frozenSegments: frozen };
}

export async function extractKeyframes(file: string, shots: Shot[], outDir: string, log?: Logger): Promise<{ t: number; file: string; shot: number }[]> {
  fs.mkdirSync(outDir, { recursive: true });
  const list = shots.slice(0, 60).map((s) => ({ t: r2(s.start + Math.min(s.duration / 2, 1.2)), shot: s.index }));
  const out: { t: number; file: string; shot: number }[] = [];
  for (const k of list) {
    const f = path.join(outDir, `shot_${String(k.shot).padStart(3, '0')}.jpg`);
    await runOk(TOOLS.ffmpeg, ['-v', 'error', '-y', '-ss', String(k.t), '-i', file, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '3', f], { log });
    out.push({ ...k, file: path.basename(f) });
  }
  return out;
}

export async function contactSheet(file: string, durationSec: number, out: string, log?: Logger): Promise<{ file: string; fps: number; cols: number }> {
  // Une vignette toutes les ~0,5 s pour une vidéo courte, plafonnée à 48 vignettes.
  const n = Math.min(48, Math.max(6, Math.round(durationSec * 2)));
  const fps = n / Math.max(0.5, durationSec);
  const cols = 8, rows = Math.ceil(n / cols);
  await runOk(TOOLS.ffmpeg, ['-v', 'error', '-y', '-i', file, '-frames:v', '1', '-vf',
    `fps=${fps.toFixed(4)},scale=180:-2,drawtext=text='%{pts\\:hms}':x=4:y=4:fontsize=14:fontcolor=white:box=1:boxcolor=black@0.6,tile=${cols}x${rows}:padding=4:color=0x111018`, '-q:v', '3', out], { log });
  return { file: path.basename(out), fps: Math.round(fps * 100) / 100, cols };
}

export async function videoFrameSets(file: string, dw: number, dh: number, durationSec: number, log?: Logger) {
  const colorFps = Math.min(2, 150 / Math.max(1, durationSec));
  const sharpFps = Math.min(1, 40 / Math.max(1, durationSec));
  const motionFps = Math.min(10, 1500 / Math.max(1, durationSec));
  const [color, sharp, motion] = [
    await extractFrames(file, { fps: colorFps, width: 144, dw, dh, log }),
    await extractFrames(file, { fps: sharpFps, width: 540, dw, dh, gray: true, log }),
    await extractFrames(file, { fps: motionFps, width: 96, dw, dh, gray: true, log }),
  ];
  return { color, sharp, motion };
}

// Transitions progressives (whip, fondu, morph, volet) : le contenu change fortement entre t-0,3 s et
// t+0,3 s alors qu'il est relativement stable avant et après. Complète la détection de coupes franches.
export function detectTransitions(rf: RawFrames, hardCuts: number[]): number[] {
  const { w, h, frames, fps } = rf;
  const k = Math.max(1, Math.round(0.3 * fps));
  const diff = (i: number, j: number) => {
    const a = frames[i], b = frames[j]; let s = 0;
    for (let p = 0; p < a.length; p += 2) s += Math.abs(a[p] - b[p]);
    return s / (a.length / 2);
  };
  const D: number[] = [];
  for (let i = 0; i < frames.length; i++) D.push(i - k >= 0 && i + k < frames.length ? diff(i - k, i + k) : 0);
  const out: number[] = [];
  for (let i = k * 2; i < frames.length - k * 2; i++) {
    if (D[i] < 18 || D[i] < D[i - 1] || D[i] < D[i + 1]) continue;
    const before = diff(i - 2 * k, i - k), after = diff(i + k, i + 2 * k);
    if (D[i] < 1.8 * Math.max(before, after) + 4) continue;
    const t = i / fps;
    if (hardCuts.some((c) => Math.abs(c - t) < 0.45) || (out.length && t - out[out.length - 1] < 0.6)) continue;
    out.push(r2(t));
  }
  void w; void h;
  return out;
}

export function mergeShots(scenes: SceneReport, transitions: number[], durationSec: number): SceneReport {
  const all = [...scenes.cuts, ...transitions].sort((a, b) => a - b);
  const bounds = [0, ...all, durationSec];
  const shots: Shot[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const d = bounds[i + 1] - bounds[i];
    if (d > 0.01) shots.push({ index: shots.length, start: r2(bounds[i]), end: r2(bounds[i + 1]), duration: r2(d), cutScore: null });
  }
  const durs = shots.map((s) => s.duration).sort((a, b) => a - b);
  return {
    ...scenes, transitions, shots, shotCount: shots.length,
    avgShotSec: r2(durationSec / Math.max(1, shots.length)), medianShotSec: r2(durs[Math.floor(durs.length / 2)] || durationSec),
    minShotSec: r2(durs[0] || durationSec), maxShotSec: r2(durs[durs.length - 1] || durationSec),
    cutsPerMinute: r2((all.length / Math.max(1, durationSec)) * 60), cutsFirst3s: all.filter((c) => c < 3).length,
    firstCutSec: all.length ? r2(all[0]) : null,
  };
}

function r2(x: number) { return Math.round(x * 100) / 100; }
