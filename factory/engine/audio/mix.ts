// Mixage FFmpeg : traitement de la voix (passe-haut, présence, compression), musique qui s'efface
// sous la voix (sidechain), bruitages, puis normalisation en deux passes à la cible LUFS.
import { run, runOk } from '../core/exec.ts';
import { TOOLS } from '../core/config.ts';
import type { Logger } from '../core/log.ts';

export interface MixOptions { vo?: string | null; music?: string | null; sfx?: string | null; out: string; durationSec: number; targetLufs: number; truePeak: number; musicDb: number; sfxDb: number; voDb: number }

export async function mix(o: MixOptions, log?: Logger): Promise<{ lufs: number | null; tp: number | null }> {
  const inputs: string[] = []; const parts: string[] = []; const labels: string[] = [];
  let idx = 0;
  const hasVo = !!o.vo;
  if (o.vo) {
    inputs.push('-i', o.vo);
    parts.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=85,equalizer=f=220:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=3,acompressor=threshold=-20dB:ratio=3.5:attack=5:release=120:makeup=2,volume=${o.voDb}dB,asplit=2[vo][key]`);
    labels.push('[vo]'); idx++;
  }
  if (o.music) {
    inputs.push('-i', o.music);
    parts.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${o.musicDb}dB[m0]`);
    if (hasVo) { parts.push('[m0][key]sidechaincompress=threshold=0.04:ratio=6:attack=15:release=350:makeup=1[mus]'); labels.push('[mus]'); }
    else labels.push('[m0]');
    idx++;
  } else if (hasVo) parts.push('[key]anullsink');
  if (o.sfx) {
    inputs.push('-i', o.sfx);
    parts.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${o.sfxDb}dB[fx]`);
    labels.push('[fx]'); idx++;
  }
  if (!labels.length) throw new Error('Rien à mixer.');
  const pre = `${o.out}.pre.wav`;
  const graph = [...parts, `${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=0:${o.durationSec.toFixed(3)},alimiter=limit=0.95:level=false[out]`].join(';');
  await runOk(TOOLS.ffmpeg, ['-v', 'error', '-y', ...inputs, '-filter_complex', graph, '-map', '[out]', '-ar', '48000', pre], { log });

  // Normalisation EBU R128 en deux passes (mesure puis correction linéaire), puis limiteur à −2,5 dBFS :
  // l'encodage AAC ajoute des crêtes entre échantillons, il faut garder ~1,5 dB de marge sous −1 dBTP.
  const m = await run(TOOLS.ffmpeg, ['-v', 'info', '-nostats', '-i', pre, '-af', `loudnorm=I=${o.targetLufs}:TP=${o.truePeak}:LRA=11:print_format=json`, '-f', 'null', '-'], { log });
  const js = m.stderr.slice(m.stderr.lastIndexOf('{'), m.stderr.lastIndexOf('}') + 1);
  let filter = `loudnorm=I=${o.targetLufs}:TP=${o.truePeak}:LRA=11`;
  try {
    const j = JSON.parse(js);
    filter = `loudnorm=I=${o.targetLufs}:TP=${o.truePeak}:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`;
  } catch { log?.warn('Mesure loudnorm illisible : normalisation en une passe.'); }
  await runOk(TOOLS.ffmpeg, ['-v', 'error', '-y', '-i', pre, '-af', `${filter},aresample=48000,alimiter=limit=-2.5dB:level=false:attack=1:release=60`, '-ar', '48000', o.out], { log });
  const v = await run(TOOLS.ffmpeg, ['-v', 'info', '-nostats', '-i', o.out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { log });
  const sum = v.stderr.split('Summary:').pop() || '';
  const I = sum.match(/I:\s+(-?[\d.]+) LUFS/), P = sum.match(/Peak:\s+(-?[\d.]+) dBFS/);
  return { lufs: I ? Number(I[1]) : null, tp: P ? Number(P[1]) : null };
}
