// Colorimétrie : luminosité, contraste, saturation, couleurs dominantes (k-means), température.
import { luma, type RawFrames } from './frames.ts';

export interface FrameColor { t: number; luma: number; contrast: number; saturation: number; colorfulness: number; darkPct: number; brightPct: number; warmth: number }
export interface Swatch { hex: string; share: number; name: string }
export interface ColorReport {
  meanLuma: number; meanContrast: number; meanSaturation: number; meanColorfulness: number;
  darkPct: number; brightPct: number; warmth: number; lumaVariationBetweenFrames: number;
  palette: Swatch[]; mood: string[]; perFrame: FrameColor[];
}

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function colorName(hexStr: string): string {
  const n = parseInt(hexStr.slice(1), 16);
  const [h, s, l] = rgbToHsl(n >> 16, (n >> 8) & 255, n & 255);
  if (l < 0.12) return 'noir';
  if (l > 0.92) return 'blanc';
  if (s < 0.12) return l < 0.4 ? 'gris foncé' : l < 0.7 ? 'gris' : 'gris clair';
  const tone = l < 0.3 ? ' foncé' : l > 0.75 ? ' clair' : '';
  const names: [number, string][] = [[15, 'rouge'], [40, 'orange'], [65, 'jaune'], [90, 'jaune-vert'], [160, 'vert'], [195, 'cyan'], [250, 'bleu'], [290, 'violet'], [335, 'magenta'], [360, 'rouge']];
  let base = names.find(([lim]) => h < lim)![1];
  if ((base === 'orange' || base === 'rouge') && l < 0.45 && s < 0.6) base = 'brun';
  return base + tone;
}

function kmeans(points: Float32Array, k: number, iters = 12): { centers: number[][]; counts: number[] } {
  const n = points.length / 3;
  const centers: number[][] = [];
  // Initialisation k-means++ déterministe (le point le plus éloigné à chaque fois).
  centers.push([points[0], points[1], points[2]]);
  const dist = new Float32Array(n).fill(Infinity);
  while (centers.length < k) {
    const c = centers[centers.length - 1];
    let best = 0, bestD = -1;
    for (let i = 0; i < n; i++) {
      const dr = points[i * 3] - c[0], dg = points[i * 3 + 1] - c[1], db = points[i * 3 + 2] - c[2];
      dist[i] = Math.min(dist[i], dr * dr + dg * dg + db * db);
      if (dist[i] > bestD) { bestD = dist[i]; best = i; }
    }
    centers.push([points[best * 3], points[best * 3 + 1], points[best * 3 + 2]]);
  }
  const assign = new Int32Array(n);
  const counts = new Array(k).fill(0);
  for (let it = 0; it < iters; it++) {
    const sums = centers.map(() => [0, 0, 0]); counts.fill(0);
    for (let i = 0; i < n; i++) {
      let bi = 0, bd = Infinity;
      for (let j = 0; j < k; j++) {
        const dr = points[i * 3] - centers[j][0], dg = points[i * 3 + 1] - centers[j][1], db = points[i * 3 + 2] - centers[j][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bd) { bd = d; bi = j; }
      }
      assign[i] = bi; counts[bi]++;
      sums[bi][0] += points[i * 3]; sums[bi][1] += points[i * 3 + 1]; sums[bi][2] += points[i * 3 + 2];
    }
    for (let j = 0; j < k; j++) if (counts[j]) centers[j] = sums[j].map((s) => s / counts[j]);
  }
  return { centers, counts };
}

export function analyzeColor(rf: RawFrames): ColorReport {
  const perFrame: FrameColor[] = [];
  const sample: number[] = [];
  rf.frames.forEach((buf, fi) => {
    let sl = 0, sl2 = 0, ss = 0, sn = 0, dark = 0, bright = 0, rs = 0, bs = 0;
    let rgSum = 0, rgSum2 = 0, ybSum = 0, ybSum2 = 0;
    const n = buf.length / 3;
    for (let i = 0; i < n; i++) {
      const r = buf[i * 3], g = buf[i * 3 + 1], b = buf[i * 3 + 2];
      const y = luma(r, g, b);
      sl += y; sl2 += y * y;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (y > 40) { ss += (max - min) / max; sn++; }
      if (y < 25) dark++;
      if (y > 235) bright++;
      rs += r; bs += b;
      const rg = r - g, yb = 0.5 * (r + g) - b;
      rgSum += rg; rgSum2 += rg * rg; ybSum += yb; ybSum2 += yb * yb;
      if (i % 7 === 0) sample.push(r, g, b);
    }
    const mean = sl / n;
    const sdRg = Math.sqrt(Math.max(0, rgSum2 / n - (rgSum / n) ** 2)), sdYb = Math.sqrt(Math.max(0, ybSum2 / n - (ybSum / n) ** 2));
    const colorfulness = Math.sqrt(sdRg ** 2 + sdYb ** 2) + 0.3 * Math.sqrt((rgSum / n) ** 2 + (ybSum / n) ** 2);
    perFrame.push({
      t: Math.round((fi / rf.fps) * 100) / 100,
      luma: Math.round(mean * 10) / 10,
      contrast: Math.round(Math.sqrt(Math.max(0, sl2 / n - mean * mean)) * 10) / 10,
      saturation: Math.round((ss / Math.max(1, sn)) * 1000) / 1000,
      colorfulness: Math.round(colorfulness * 10) / 10,
      darkPct: Math.round((dark / n) * 1000) / 10,
      brightPct: Math.round((bright / n) * 1000) / 10,
      warmth: Math.round(((rs - bs) / n) * 10) / 10,
    });
  });
  const avg = (k: keyof FrameColor) => perFrame.reduce((a, f) => a + (f[k] as number), 0) / Math.max(1, perFrame.length);
  const pts = new Float32Array(sample);
  const { centers, counts } = pts.length >= 18 ? kmeans(pts, 6) : { centers: [], counts: [] };
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const palette = centers.map((c, i) => ({ hex: hex(c[0], c[1], c[2]), share: Math.round((counts[i] / total) * 1000) / 10, name: '' }))
    .filter((s) => s.share > 0.5).sort((a, b) => b.share - a.share);
  palette.forEach((s) => (s.name = colorName(s.hex)));
  const lumas = perFrame.map((f) => f.luma);
  const lmean = lumas.reduce((a, b) => a + b, 0) / Math.max(1, lumas.length);
  const lsd = Math.sqrt(lumas.reduce((a, b) => a + (b - lmean) ** 2, 0) / Math.max(1, lumas.length));

  const meanLuma = avg('luma'), meanSat = avg('saturation'), meanContrast = avg('contrast'), warmth = avg('warmth');
  const mood: string[] = [];
  mood.push(meanLuma < 70 ? 'image sombre (low-key)' : meanLuma > 160 ? 'image très claire (high-key)' : 'luminosité moyenne');
  mood.push(meanContrast > 65 ? 'contraste fort' : meanContrast < 35 ? 'contraste doux' : 'contraste modéré');
  mood.push(meanSat > 0.45 ? 'couleurs très saturées' : meanSat < 0.18 ? 'couleurs désaturées' : 'saturation modérée');
  mood.push(warmth > 12 ? 'dominante chaude' : warmth < -12 ? 'dominante froide' : 'balance neutre');
  return {
    meanLuma: Math.round(meanLuma * 10) / 10, meanContrast: Math.round(meanContrast * 10) / 10,
    meanSaturation: Math.round(meanSat * 1000) / 1000, meanColorfulness: Math.round(avg('colorfulness') * 10) / 10,
    darkPct: Math.round(avg('darkPct') * 10) / 10, brightPct: Math.round(avg('brightPct') * 10) / 10,
    warmth: Math.round(warmth * 10) / 10, lumaVariationBetweenFrames: Math.round(lsd * 10) / 10,
    palette, mood, perFrame,
  };
}

// Distance perceptuelle simple entre deux palettes (0 = identiques, ~100 = opposées), pondérée par la part.
export function paletteDistance(a: Swatch[], b: Swatch[]): number {
  if (!a.length || !b.length) return 100;
  const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const d = (x: number[], y: number[]) => Math.sqrt((x[0] - y[0]) ** 2 * 0.3 + (x[1] - y[1]) ** 2 * 0.59 + (x[2] - y[2]) ** 2 * 0.11);
  const one = (p: Swatch[], q: Swatch[]) => {
    const tot = p.reduce((s, x) => s + x.share, 0) || 1;
    return p.reduce((s, x) => s + (x.share / tot) * Math.min(...q.map((y) => d(rgb(x.hex), rgb(y.hex)))), 0);
  };
  return Math.round(((one(a, b) + one(b, a)) / 2 / 255) * 1000) / 10;
}
