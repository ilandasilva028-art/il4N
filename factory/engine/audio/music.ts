// Musique originale synthétisée (libre de droits par construction : aucune source externe).
// Trois ambiances : « energique » (house 4/4), « chill » (lo-fi), « cinematique » (pulsations, nappes).
// Structure : intro filtrée pendant l'accroche, « drop » sur la fin de l'accroche, outro qui se referme.
import { SR, Biquad, midiHz, polyBlepSaw, reverb, peakNormalize, mulberry32, writeWav } from './dsp.ts';

export interface MusicSpec { durationSec: number; bpm: number; mood: 'energique' | 'chill' | 'cinematique'; dropAt: number; seed: number; accents?: number[] }

const PROG = [[0, 3, 7, 'm'], [-4, 4, 7, 'M'], [3, 4, 7, 'M'], [-2, 4, 7, 'M']] as const; // i – VI – III – VII
const ROOTS = [57, 60, 62, 52, 54, 55]; // la, do, ré, mi, fa#, sol

export function synthMusic(spec: MusicSpec): [Float32Array, Float32Array] {
  const n = Math.ceil((spec.durationSec + 0.5) * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  const drums = new Float32Array(n), bass = new Float32Array(n), padBus = new Float32Array(n), lead = new Float32Array(n);
  const rnd = mulberry32(spec.seed);
  const beat = 60 / spec.bpm, bar = beat * 4;
  const root = ROOTS[Math.floor(rnd() * ROOTS.length)];
  const swing = spec.mood === 'chill' ? 0.16 : 0;
  const drop = Math.max(beat * 2, spec.dropAt);
  const end = spec.durationSec;
  const noise = new Float32Array(SR); for (let i = 0; i < SR; i++) noise[i] = rnd() * 2 - 1;

  const add = (buf: Float32Array, t0: number, len: number, fn: (t: number, i: number) => number) => {
    const s0 = Math.max(0, Math.floor(t0 * SR)), s1 = Math.min(n, Math.floor((t0 + len) * SR));
    for (let i = s0; i < s1; i++) buf[i] += fn(i / SR - t0, i);
  };
  const kick = (t0: number, g = 1) => { let ph = 0; add(drums, t0, 0.45, (t) => { const f = 48 + 110 * Math.exp(-t / 0.035); ph += f / SR; return g * Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.16) * 0.9 + (t < 0.004 ? g * 0.3 * (1 - t / 0.004) : 0); }); };
  const clap = (t0: number, g = 1) => { const bp = new Biquad().set('bp', 1400, 0.9); add(drums, t0, 0.3, (t, i) => { const e = t < 0.03 ? (Math.exp(-((t % 0.01) / 0.003))) : Math.exp(-(t - 0.03) / 0.09); return g * bp.tick(noise[i % SR]) * e * 1.6; }); };
  const hat = (t0: number, open = false, g = 1) => { const hp = new Biquad().set('hp', 7500, 0.7); add(drums, t0, open ? 0.25 : 0.06, (t, i) => g * hp.tick(noise[(i * 7) % SR]) * Math.exp(-t / (open ? 0.08 : 0.018)) * 0.5); };
  const tom = (t0: number, f0: number, g = 1) => { let ph = 0; add(drums, t0, 0.6, (t) => { ph += (f0 * (1 + 0.5 * Math.exp(-t / 0.05))) / SR; return g * Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.22) * 0.7; }); };
  const bassNote = (m: number, t0: number, len: number, g = 1) => {
    const lp = new Biquad(); let ph = 0, sub = 0; const f = midiHz(m);
    add(bass, t0, len + 0.05, (t) => {
      ph = (ph + f / SR) % 1; sub = (sub + f / SR) % 1;
      lp.set('lp', 220 + 900 * Math.exp(-t / 0.09), 1.1);
      const env = Math.min(1, t / 0.005) * (t > len ? Math.exp(-(t - len) / 0.02) : 1);
      return g * env * (0.45 * lp.tick(polyBlepSaw(ph, f / SR)) + 0.55 * Math.sin(2 * Math.PI * sub));
    });
  };
  const padChord = (notes: number[], t0: number, len: number, g = 1, bright = 1800) => {
    notes.forEach((m, k) => {
      [-0.08, 0, 0.08].forEach((det) => {
        const lp = new Biquad().set('lp', bright, 0.6); let ph = rnd(); const f = midiHz(m + det);
        add(padBus, t0, len + 0.6, (t) => {
          ph = (ph + f / SR) % 1;
          const env = Math.min(1, t / 0.25) * (t > len ? Math.exp(-(t - len) / 0.3) : 1);
          return (g * 0.11 * env * lp.tick(polyBlepSaw(ph, f / SR))) / (1 + k * 0.15);
        });
      });
    });
  };
  const keys = (notes: number[], t0: number, len: number, g = 1) => {
    notes.forEach((m) => { const f = midiHz(m); add(padBus, t0, len + 0.8, (t) => g * 0.16 * Math.exp(-t / 1.4) * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t / 0.3)) * (1 + 0.15 * Math.sin(2 * Math.PI * 4.5 * t))); });
  };
  const pluck = (m: number, t0: number, g = 1) => {
    const lp = new Biquad(); let ph = 0; const f = midiHz(m);
    add(lead, t0, 0.4, (t) => { ph = (ph + f / SR) % 1; lp.set('lp', 500 + 4000 * Math.exp(-t / 0.06), 1.5); return g * 0.22 * lp.tick(polyBlepSaw(ph, f / SR)) * Math.exp(-t / 0.18); });
  };
  const riser = (tEnd: number, len: number) => {
    const hp = new Biquad();
    add(lead, tEnd - len, len, (t, i) => { const p = t / len; hp.set('hp', 300 + 6000 * p * p, 0.8); return 0.25 * p * p * hp.tick(noise[(i * 3) % SR]); });
  };

  const chordAt = (b: number) => { const c = PROG[Math.floor(b / 4) % 4]; const r = root + c[0]; return { r, notes: [r, r + (c[3] === 'm' ? 3 : 4), r + 7] }; };
  const nBeats = Math.ceil(end / beat) + 1;
  const kickTimes: number[] = [];
  for (let b = 0; b < nBeats; b++) {
    const t = b * beat; if (t >= end) break;
    const afterDrop = t >= drop - 1e-3;
    const outro = t > end - bar * 0.75;
    const { r, notes } = chordAt(b);
    if (spec.mood === 'energique') {
      if (afterDrop || b % 2 === 0) { kick(t, afterDrop ? 1 : 0.7); kickTimes.push(t); }
      if (afterDrop && (b % 4 === 1 || b % 4 === 3)) clap(t, 0.8);
      hat(t + beat / 2, afterDrop && b % 2 === 1, afterDrop ? 0.9 : 0.5);
      if (afterDrop) { hat(t + beat / 4, false, 0.35); hat(t + (3 * beat) / 4, false, 0.35); }
      if (afterDrop && !outro) { bassNote(r - 12, t + beat / 2, beat * 0.42, 0.9); }
      if (b % 4 === 0) padChord(notes.map((x) => x + 12), t, bar, afterDrop ? 1 : 0.8, afterDrop ? 2600 : 900);
      if (afterDrop && !outro) [0, 0.75, 1.5, 2.5, 3].forEach((k, j) => { if (b % 4 === 0 || (b % 4 === 2 && j % 2 === 0)) pluck(notes[j % 3] + 24, t + (k * beat) / 2, 0.8); });
    } else if (spec.mood === 'chill') {
      if (b % 4 === 0) { kick(t, 0.8); kickTimes.push(t); }
      if (b % 4 === 2) { kick(t + beat / 2, 0.6); kickTimes.push(t + beat / 2); }
      if (b % 2 === 1) clap(t, 0.45);
      hat(t, false, 0.4); hat(t + beat / 2 + swing * beat * 0.5, false, 0.3);
      if (b % 4 === 0) { keys(notes.map((x) => x + 12).concat([notes[0] + 22]), t, bar, 1); bassNote(r - 12, t, bar * 0.9, 0.7); }
    } else {
      if (b % 4 === 0) { padChord(notes, t, bar, 1.1, afterDrop ? 1500 : 700); bassNote(r - 24, t, bar * 0.95, 0.6); }
      if (afterDrop && !outro) for (let k = 0; k < 4; k++) pluck(notes[k % 3] + 12, t + (k * beat) / 4, 0.55);
      if (afterDrop && b % 8 === 0) { tom(t, 70, 1); kickTimes.push(t); }
    }
  }
  if (drop > beat * 2) riser(drop, Math.min(drop, bar * 0.75));
  // Impact grave sur le drop et sur les accents demandés (changements de plan forts).
  for (const a of [drop, ...(spec.accents || [])]) { let ph = 0; add(drums, a, 1.2, (t) => { ph += (40 + 30 * Math.exp(-t / 0.1)) / SR; return 0.55 * Math.sin(2 * Math.PI * ph) * Math.exp(-t / 0.4); }); }
  // Vinyle léger pour le lo-fi.
  if (spec.mood === 'chill') for (let i = 0; i < n; i += 1) if (rnd() < 0.0004) padBus[i] += (rnd() - 0.5) * 0.3;

  // Pompage (sidechain) des nappes et basses par la grosse caisse.
  const duck = new Float32Array(n).fill(1);
  if (spec.mood !== 'cinematique') for (const k of kickTimes) add(duck, k, 0.3, (t) => -0.55 * Math.exp(-t / 0.11));
  const [pL, pR] = reverb(padBus.map((x, i) => x * Math.max(0.3, duck[i])), 0.3, 1.1);
  const [lL, lR] = reverb(lead, 0.22, 0.8);
  // Filtre passe-bas d'intro qui s'ouvre au drop, et se referme sur la dernière mesure.
  const mlp = [new Biquad(), new Biquad()];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const pre = t < drop ? 0.35 + 0.65 * (t / drop) ** 3 : t > end - bar ? Math.max(0.2, (end - t) / bar) : 1;
    const cutoff = 300 + 17000 * pre * pre;
    if (i % 64 === 0) { mlp[0].set('lp', cutoff, 0.7); mlp[1].set('lp', cutoff, 0.7); }
    const b = bass[i] * Math.max(0.35, duck[i]);
    const fadeOut = t > end - 0.4 ? Math.max(0, (end - t) / 0.4) : 1;
    L[i] = fadeOut * mlp[0].tick(drums[i] * 0.9 + b * 0.8 + pL[i] + lL[i] * 0.9);
    R[i] = fadeOut * mlp[1].tick(drums[i] * 0.9 + b * 0.8 + pR[i] + lR[i] * 0.9);
  }
  for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2); }
  peakNormalize([L, R], -1);
  return [L, R];
}

export function writeMusic(file: string, spec: MusicSpec): void { writeWav(file, synthMusic(spec)); }
