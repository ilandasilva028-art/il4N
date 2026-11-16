// Analyse audio : loudness EBU R128, crête vraie, silences, tempo estimé, attaques (onsets),
// équilibre spectral, hauteur de voix estimée, synchronisation des coupes avec l'audio.
import { run, runOk } from '../core/exec.ts';
import { TOOLS } from '../core/config.ts';
import type { Logger } from '../core/log.ts';

export interface AudioReport {
  present: boolean;
  integratedLufs: number | null; loudnessRangeLu: number | null; truePeakDbtp: number | null;
  silences: { start: number; end: number }[]; silencePct: number; leadingSilenceSec: number;
  tempoBpm: number | null; tempoConfidence: number; tempoWindows: { from: number; to: number; bpm: number | null; confidence: number }[]; onsets: number[]; onsetsPerSec: number;
  bands: { lowPct: number; midPct: number; highPct: number };
  pitch: { medianHz: number | null; p10Hz: number | null; p90Hz: number | null; voicedPct: number; note: string };
  rmsCurve: { t: number; db: number }[];
  dynamicRangeDb: number;
  cutsOnBeatPct: number | null;
}

const SR = 16000;

export async function decodePcm(file: string, log?: Logger, sr = SR): Promise<Float32Array> {
  const r = await runOk(TOOLS.ffmpeg, ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { log });
  const b = r.stdoutBuf;
  return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4)).slice();
}

export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k], ai = im[i + k];
        const br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ar + br; im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

export interface SpectralFeatures { flux: Float64Array; hopSec: number; bandsPct: { lowPct: number; midPct: number; highPct: number }; rmsDb: Float64Array }

export function spectral(pcm: Float32Array, sr = SR): SpectralFeatures {
  const N = 1024, hop = 256;
  const frames = Math.max(0, Math.floor((pcm.length - N) / hop));
  const flux = new Float64Array(frames);
  const rmsDb = new Float64Array(frames);
  const win = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  let prev = new Float64Array(N / 2);
  let low = 0, mid = 0, high = 0;
  const binHz = sr / N;
  for (let f = 0; f < frames; f++) {
    const re = new Float64Array(N), im = new Float64Array(N);
    let e = 0;
    for (let i = 0; i < N; i++) { const s = pcm[f * hop + i]; re[i] = s * win[i]; e += s * s; }
    rmsDb[f] = 10 * Math.log10(e / N + 1e-12);
    fft(re, im);
    const mag = new Float64Array(N / 2);
    let fl = 0;
    for (let k = 1; k < N / 2; k++) {
      mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
      const d = mag[k] - prev[k];
      if (d > 0) fl += d;
      const p = re[k] * re[k] + im[k] * im[k], hz = k * binHz;
      if (hz < 250) low += p; else if (hz < 2000) mid += p; else high += p;
    }
    flux[f] = fl; prev = mag;
  }
  const tot = low + mid + high || 1;
  return { flux, hopSec: hop / sr, rmsDb, bandsPct: { lowPct: pc(low / tot), midPct: pc(mid / tot), highPct: pc(high / tot) } };
}

export function onsetsFromFlux(flux: Float64Array, hopSec: number): number[] {
  // Pics du flux spectral au-dessus d'une moyenne glissante (détection d'attaques).
  const out: number[] = [];
  const w = Math.round(0.25 / hopSec);
  let last = -1;
  for (let i = 1; i < flux.length - 1; i++) {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - w); j < Math.min(flux.length, i + w); j++) { s += flux[j]; n++; }
    const thr = (s / n) * 1.5 + 0.5;
    if (flux[i] > thr && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1]) {
      const t = i * hopSec;
      if (last < 0 || t - last > 0.09) { out.push(Math.round(t * 1000) / 1000); last = t; }
    }
  }
  return out;
}

export function estimateTempo(flux: Float64Array, hopSec: number): { bpm: number | null; confidence: number } {
  if (flux.length < 200) return { bpm: null, confidence: 0 };
  const mean = flux.reduce((a, b) => a + b, 0) / flux.length;
  const x = Array.from(flux, (v) => Math.max(0, v - mean));
  const minLag = Math.round(60 / 180 / hopSec), maxLag = Math.round(60 / 70 / hopSec);
  let best = 0, bestLag = 0;
  const ac: number[] = [];
  let zero = 0;
  for (let i = 0; i < x.length; i++) zero += x[i] * x[i];
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < x.length; i++) s += x[i] * x[i + lag];
    s /= x.length - lag;
    ac.push(s);
    if (s > best) { best = s; bestLag = lag; }
  }
  const avg = ac.reduce((a, b) => a + b, 0) / Math.max(1, ac.length);
  const confidence = Math.max(0, Math.min(1, (best / (avg || 1) - 1) / 2));
  return { bpm: bestLag ? Math.round((60 / (bestLag * hopSec)) * 10) / 10 : null, confidence: Math.round(confidence * 100) / 100 };
}

export function pitchTrack(pcm: Float32Array, sr = SR): { medianHz: number | null; p10Hz: number | null; p90Hz: number | null; voicedPct: number } {
  // Autocorrélation normalisée par trames de 40 ms : fréquence fondamentale des passages voisés.
  const N = Math.round(0.04 * sr), hop = Math.round(0.02 * sr);
  const minLag = Math.round(sr / 400), maxLag = Math.round(sr / 70);
  const f0: number[] = []; let frames = 0;
  for (let o = 0; o + N + maxLag < pcm.length; o += hop) {
    frames++;
    let e = 0;
    for (let i = 0; i < N; i++) e += pcm[o + i] ** 2;
    if (e / N < 1e-4) continue;
    let best = 0, bestLag = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let s = 0, e2 = 0;
      for (let i = 0; i < N; i++) { s += pcm[o + i] * pcm[o + i + lag]; e2 += pcm[o + i + lag] ** 2; }
      const r = s / Math.sqrt(e * e2 + 1e-12);
      if (r > best) { best = r; bestLag = lag; }
    }
    if (best > 0.75 && bestLag) f0.push(sr / bestLag);
  }
  f0.sort((a, b) => a - b);
  const q = (p: number) => (f0.length ? Math.round(f0[Math.floor(p * (f0.length - 1))]) : null);
  return { medianHz: q(0.5), p10Hz: q(0.1), p90Hz: q(0.9), voicedPct: pc(f0.length / Math.max(1, frames)) };
}

async function loudness(file: string, log?: Logger) {
  const r = await run(TOOLS.ffmpeg, ['-v', 'info', '-nostats', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { log });
  const sum = r.stderr.split('Summary:').pop() || '';
  const num = (re: RegExp) => { const m = sum.match(re); return m ? Number(m[1]) : null; };
  return { I: num(/I:\s+(-?[\d.]+) LUFS/), LRA: num(/LRA:\s+(-?[\d.]+) LU/), TP: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/) };
}

async function silences(file: string, durationSec: number, log?: Logger) {
  const r = await run(TOOLS.ffmpeg, ['-v', 'info', '-nostats', '-i', file, '-vn', '-af', 'silencedetect=noise=-40dB:d=0.3', '-f', 'null', '-'], { log });
  const out: { start: number; end: number }[] = [];
  let s: number | null = null;
  for (const line of r.stderr.split('\n')) {
    const a = line.match(/silence_start: (-?[\d.]+)/); if (a) s = Math.max(0, +a[1]);
    const b = line.match(/silence_end: ([\d.]+)/); if (b && s !== null) { out.push({ start: r2(s), end: r2(+b[1]) }); s = null; }
  }
  if (s !== null) out.push({ start: r2(s), end: r2(durationSec) });
  return out;
}

export async function analyzeAudio(file: string, durationSec: number, hasAudio: boolean, cuts: number[], log?: Logger): Promise<AudioReport> {
  const empty: AudioReport = {
    present: false, integratedLufs: null, loudnessRangeLu: null, truePeakDbtp: null, silences: [], silencePct: 100, leadingSilenceSec: durationSec,
    tempoBpm: null, tempoConfidence: 0, tempoWindows: [], onsets: [], onsetsPerSec: 0, bands: { lowPct: 0, midPct: 0, highPct: 0 },
    pitch: { medianHz: null, p10Hz: null, p90Hz: null, voicedPct: 0, note: 'Pas de piste audio.' }, rmsCurve: [], dynamicRangeDb: 0, cutsOnBeatPct: null,
  };
  if (!hasAudio) return empty;
  const [ld, sil, pcm] = await Promise.all([loudness(file, log), silences(file, durationSec, log), decodePcm(file, log)]);
  const sp = spectral(pcm);
  const onsets = onsetsFromFlux(sp.flux, sp.hopSec);
  const tempo = estimateTempo(sp.flux, sp.hopSec);
  const pitch = pitchTrack(pcm);
  const tempoWindows: AudioReport['tempoWindows'] = [];
  const win = Math.min(20, durationSec);
  for (let a = 0; a + win * 0.6 <= durationSec; a += win) {
    const seg = spectral(pcm.slice(Math.round(a * SR), Math.round(Math.min(durationSec, a + win) * SR)));
    const e = estimateTempo(seg.flux, seg.hopSec);
    tempoWindows.push({ from: r2(a), to: r2(Math.min(durationSec, a + win)), bpm: e.bpm, confidence: e.confidence });
  }
  const silTot = sil.reduce((a, s) => a + (s.end - s.start), 0);
  const rmsStep = Math.max(1, Math.round(0.1 / sp.hopSec));
  const rmsCurve: { t: number; db: number }[] = [];
  for (let i = 0; i < sp.rmsDb.length; i += rmsStep) rmsCurve.push({ t: r2(i * sp.hopSec), db: Math.round(sp.rmsDb[i] * 10) / 10 });
  const loud = Array.from(sp.rmsDb).filter((d) => d > -60).sort((a, b) => a - b);
  const dyn = loud.length ? loud[Math.floor(loud.length * 0.95)] - loud[Math.floor(loud.length * 0.1)] : 0;
  const nearOnset = (t: number) => onsets.some((o) => Math.abs(o - t) <= 0.07);
  const cutsOnBeatPct = cuts.length ? pc(cuts.filter(nearOnset).length / cuts.length) : null;
  return {
    present: true,
    integratedLufs: ld.I, loudnessRangeLu: ld.LRA, truePeakDbtp: ld.TP,
    silences: sil, silencePct: pc(silTot / Math.max(0.01, durationSec)),
    leadingSilenceSec: sil.length && sil[0].start <= 0.05 ? sil[0].end : 0,
    tempoBpm: tempo.bpm, tempoConfidence: tempo.confidence, tempoWindows,
    onsets: onsets.slice(0, 2000), onsetsPerSec: r2(onsets.length / Math.max(0.01, durationSec)),
    bands: sp.bandsPct,
    pitch: { ...pitch, note: 'Hauteur estimée sur tout le mixage (musique comprise) : indicative pour la voix seulement si la musique est discrète.' },
    rmsCurve, dynamicRangeDb: Math.round(dyn * 10) / 10, cutsOnBeatPct,
  };
}

function r2(x: number) { return Math.round(x * 100) / 100; }
function pc(x: number) { return Math.round(x * 1000) / 10; }
