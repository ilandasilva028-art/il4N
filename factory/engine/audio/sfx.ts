// Bruitages synthétisés et posés sur les « hits » du plan de montage (un son par accent visuel).
import { SR, Biquad, mulberry32, writeWav } from './dsp.ts';
import type { Hit } from '../pipeline/types.ts';

export function synthSfx(hits: Hit[], durationSec: number, seed = 7): [Float32Array, Float32Array] {
  const n = Math.ceil((durationSec + 1) * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  const rnd = mulberry32(seed);
  const noise = new Float32Array(SR); for (let i = 0; i < SR; i++) noise[i] = rnd() * 2 - 1;
  const put = (t0: number, len: number, pan: number, fn: (t: number, i: number) => number) => {
    const s0 = Math.max(0, Math.floor(t0 * SR)), s1 = Math.min(n, Math.floor((t0 + len) * SR));
    const gl = Math.cos(((pan + 1) * Math.PI) / 4), gr = Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = s0; i < s1; i++) { const v = fn(i / SR - t0, i); L[i] += v * gl; R[i] += v * gr; }
  };
  for (const h of hits) {
    const g = h.gain ?? 1;
    switch (h.sfx) {
      case 'whoosh': {
        const len = h.len ?? 0.35; const bp = new Biquad();
        put(h.t - len * 0.7, len, (rnd() - 0.5) * 0.6, (t, i) => { const p = t / len; bp.set('bp', 400 + 3500 * Math.sin(Math.PI * p), 1.2); return g * 0.9 * Math.sin(Math.PI * p) ** 2 * bp.tick(noise[i % SR]); });
        break;
      }
      case 'pop': {
        let ph = 0; const f0 = 500 + rnd() * 500;
        put(h.t, 0.12, (rnd() - 0.5) * 0.4, (t) => { ph += (f0 * (1 + 1.5 * Math.exp(-t / 0.01))) / SR; return g * 0.5 * Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.03); });
        break;
      }
      case 'impact': {
        let ph = 0; const lp = new Biquad().set('lp', 900, 0.7);
        put(h.t, 0.9, 0, (t, i) => { ph += (45 + 90 * Math.exp(-t / 0.04)) / SR; return g * (0.8 * Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.25) + 0.4 * lp.tick(noise[i % SR]) * Math.exp(-t / 0.05)); });
        break;
      }
      case 'tick': {
        const hp = new Biquad().set('hp', 3000, 0.7);
        put(h.t, 0.03, (rnd() - 0.5) * 0.5, (t, i) => g * 0.6 * hp.tick(noise[(i * 5) % SR]) * Math.exp(-t / 0.006));
        break;
      }
      case 'riser': {
        const len = h.len ?? 1; const hp = new Biquad(); let ph = 0;
        put(h.t - len, len, 0, (t, i) => { const p = t / len; hp.set('hp', 200 + 5000 * p * p, 0.8); ph += (200 + 900 * p * p) / SR; return g * p * p * (0.35 * hp.tick(noise[i % SR]) + 0.15 * Math.sin(2 * Math.PI * ph)); });
        break;
      }
      case 'ding': {
        const f = 1320;
        put(h.t, 1.2, 0.1, (t) => g * 0.25 * Math.exp(-t / 0.35) * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t / 0.1)));
        break;
      }
    }
  }
  for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i]); R[i] = Math.tanh(R[i]); }
  return [L, R];
}

export function writeSfx(file: string, hits: Hit[], durationSec: number): void { writeWav(file, synthSfx(hits, durationSec)); }
