// Pont vers faster-whisper (python/transcribe.py). Optionnel : si Python ou le paquet manquent,
// l'analyse continue et le rapport indique clairement que la transcription n'a pas été faite.
import fs from 'node:fs';
import path from 'node:path';
import { run } from '../core/exec.ts';
import { TOOLS, PYTHON_DIR, DIRS } from '../core/config.ts';
import type { Logger } from '../core/log.ts';

export interface Word { word: string; start: number; end: number; prob: number }
export interface Transcript {
  ok: boolean; reason?: string; model?: string; language?: string; text: string;
  segments: { start: number; end: number; text: string }[]; words: Word[];
}

export async function transcribe(src: string, out: string, opts: { log?: Logger; model?: string; prompt?: string; lang?: string } = {}): Promise<Transcript> {
  if (!fs.existsSync(TOOLS.python)) return { ok: false, reason: `Python introuvable (${TOOLS.python}). Lancez « npm run setup:python ».`, text: '', segments: [], words: [] };
  const args = [path.join(PYTHON_DIR, 'transcribe.py'), src, out, '--model', opts.model || TOOLS.whisperModel, '--lang', opts.lang || 'fr', '--models-dir', path.join(DIRS.models, 'whisper')];
  if (opts.prompt) args.push('--prompt', opts.prompt.slice(0, 800));
  const r = await run(TOOLS.python, args, { log: opts.log, timeoutMs: 30 * 60 * 1000 });
  if (r.code !== 0 || !fs.existsSync(out)) {
    const msg = r.stderr.trim().split('\n').slice(-3).join(' ');
    opts.log?.warn(`Transcription impossible : ${msg}`);
    return { ok: false, reason: `Transcription impossible : ${msg.slice(0, 300)}`, text: '', segments: [], words: [] };
  }
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  return { ok: true, model: j.model, language: j.language, text: j.text, segments: j.segments, words: j.words };
}

// Taux d'erreur de mots (WER) entre un texte attendu et une transcription, après normalisation.
export function normalizeWords(s: string): string[] {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
}

export function wordErrorRate(expected: string, got: string): number {
  const a = normalizeWords(expected), b = normalizeWords(got);
  if (!a.length) return b.length ? 1 : 0;
  const d: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return Math.round((d[b.length] / a.length) * 1000) / 1000;
}
