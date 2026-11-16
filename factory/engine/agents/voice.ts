// AGENT 5 — VOICE & AUDIO (voix off)
// Synthèse locale Piper (une phrase par fichier), suppression des silences de bord,
// placement sur la ligne de temps, puis alignement des mots par Whisper pour les sous-titres.
import fs from 'node:fs';
import path from 'node:path';
import { run, runOk } from '../core/exec.ts';
import { TOOLS, PYTHON_DIR, PIPER_DIR } from '../core/config.ts';
import type { Logger } from '../core/log.ts';
import type { Script, StyleBible, SubWord } from '../pipeline/types.ts';
import { SR, readWavMono, writeWav } from '../audio/dsp.ts';
import { transcribe, normalizeWords, type Word } from '../analysis/transcribe.ts';

export interface RawSegment { id: string; text: string; file: string; duration: number }

export async function synthesizeSegments(script: Script, style: StyleBible, outDir: string, log?: Logger): Promise<RawSegment[]> {
  fs.mkdirSync(outDir, { recursive: true });
  const model = path.join(PIPER_DIR, `${style.voice.model}.onnx`);
  if (!fs.existsSync(model)) throw new Error(`Voix Piper absente : ${model}. Lancez « npm run setup:voices ».`);
  if (!fs.existsSync(TOOLS.python)) throw new Error(`Python introuvable (${TOOLS.python}). Lancez « npm run setup:python ».`);
  const spec = { model, speaker: style.voice.speaker ?? null, length_scale: style.voice.lengthScale, noise_scale: 0.6, noise_w: 0.75,
    segments: script.beats.map((b) => ({ id: b.id, text: b.voice })) };
  const specFile = path.join(outDir, 'spec.json');
  fs.writeFileSync(specFile, JSON.stringify(spec, null, 1));
  const rawDir = path.join(outDir, 'raw');
  await runOk(TOOLS.python, [path.join(PYTHON_DIR, 'tts_piper.py'), specFile, rawDir], { log });
  const out: RawSegment[] = [];
  for (const b of script.beats) {
    // Bords nettoyés (silences < -45 dB) et rééchantillonnage en 48 kHz mono.
    const f = path.join(outDir, `${b.id}.wav`);
    await runOk(TOOLS.ffmpeg, ['-v', 'error', '-y', '-i', path.join(rawDir, `${b.id}.wav`), '-af',
      'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse',
      '-ar', String(SR), '-ac', '1', f], { log });
    const { data } = readWavMono(f);
    out.push({ id: b.id, text: b.voice, file: f, duration: Math.round((data.length / SR) * 1000) / 1000 });
  }
  return out;
}

// Pose chaque phrase à son temps de départ (calculé par le monteur) dans une piste unique.
export function assembleVoice(segments: { file: string; start: number }[], durationSec: number, out: string): void {
  const buf = new Float32Array(Math.ceil((durationSec + 0.5) * SR));
  for (const s of segments) {
    const { data } = readWavMono(s.file);
    const o = Math.round(s.start * SR);
    for (let i = 0; i < data.length && o + i < buf.length; i++) buf[o + i] += data[i];
  }
  writeWav(out, [buf]);
}

// Alignement : on garde l'orthographe du script et les temps mesurés par Whisper.
export function alignWords(scriptText: string, whisper: Word[], segStart: number, segEnd: number): SubWord[] {
  const tokens = scriptText.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const norm = tokens.map((t) => normalizeWords(t).join(''));
  const wn = whisper.map((w) => normalizeWords(w.word).join(''));
  // Programmation dynamique (Needleman-Wunsch simplifié) script ↔ transcription.
  const n = tokens.length, m = whisper.length;
  const D = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const same = norm[i - 1] && norm[i - 1] === wn[j - 1] ? 0 : 1;
    D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + same);
  }
  const match: (number | null)[] = new Array(n).fill(null);
  for (let i = n, j = m; i > 0 && j > 0;) {
    const same = norm[i - 1] && norm[i - 1] === wn[j - 1] ? 0 : 1;
    if (D[i][j] === D[i - 1][j - 1] + same) { match[i - 1] = j - 1; i--; j--; }
    else if (D[i][j] === D[i - 1][j] + 1) i--; else j--;
  }
  const res: SubWord[] = tokens.map((t, i) => {
    const k = match[i];
    return { text: t, start: k !== null ? whisper[k].start : NaN, end: k !== null ? whisper[k].end : NaN, accent: false };
  });
  // Interpolation des mots non appariés à partir des voisins (ou répartition par nombre de lettres).
  const total = tokens.reduce((a, t) => a + Math.max(2, t.length), 0);
  let acc = 0;
  res.forEach((w, i) => {
    const share = Math.max(2, tokens[i].length) / total;
    if (Number.isNaN(w.start)) {
      const prev = res.slice(0, i).reverse().find((x) => !Number.isNaN(x.end));
      w.start = prev ? prev.end : segStart + acc * (segEnd - segStart);
      w.end = Math.min(segEnd, w.start + share * (segEnd - segStart));
    }
    acc += share;
  });
  for (let i = 0; i < res.length; i++) {
    res[i].start = Math.max(segStart, Math.min(res[i].start, segEnd));
    res[i].end = Math.max(res[i].start + 0.05, Math.min(res[i].end, segEnd + 0.1));
  }
  return res;
}

export async function wordTimings(voFile: string, fullText: string, workDir: string, log?: Logger): Promise<{ words: Word[]; ok: boolean; wer: number | null; reason?: string }> {
  const tr = await transcribe(voFile, path.join(workDir, 'vo.transcript.json'), { log, prompt: fullText });
  if (!tr.ok) return { words: [], ok: false, wer: null, reason: tr.reason };
  const { wordErrorRate } = await import('../analysis/transcribe.ts');
  return { words: tr.words, ok: true, wer: wordErrorRate(fullText, tr.text) };
}

export async function voiceAvailable(): Promise<boolean> {
  if (!fs.existsSync(TOOLS.python)) return false;
  const r = await run(TOOLS.python, ['-c', 'import piper'], { lowPriority: false, timeoutMs: 20000 }).catch(() => null);
  return !!r && r.code === 0;
}
