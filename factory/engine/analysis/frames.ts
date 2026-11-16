// Extraction d'images brutes (RGB ou niveaux de gris) basse résolution via FFmpeg, pour les mesures.
import { runOk } from '../core/exec.ts';
import { TOOLS, LIMITS } from '../core/config.ts';
import type { Logger } from '../core/log.ts';

export interface RawFrames { w: number; h: number; channels: 1 | 3; fps: number; frames: Buffer[] }

export function scaledSize(dw: number, dh: number, targetW: number): [number, number] {
  const w = Math.max(16, Math.round(targetW / 2) * 2);
  const h = Math.max(16, Math.round((targetW * dh) / dw / 2) * 2);
  return [w, h];
}

export async function extractFrames(file: string, opts: { fps: number; width: number; dw: number; dh: number; gray?: boolean; start?: number; duration?: number; log?: Logger }): Promise<RawFrames> {
  const [w, h] = scaledSize(opts.dw, opts.dh, opts.width);
  const channels = opts.gray ? 1 : 3;
  const args = ['-v', 'error', '-threads', String(LIMITS.ffmpegThreads)];
  if (opts.start) args.push('-ss', String(opts.start));
  args.push('-i', file);
  if (opts.duration) args.push('-t', String(opts.duration));
  args.push('-an', '-vf', `fps=${opts.fps},scale=${w}:${h}:flags=area`, '-pix_fmt', opts.gray ? 'gray' : 'rgb24', '-f', 'rawvideo', '-');
  const r = await runOk(TOOLS.ffmpeg, args, { log: opts.log });
  const size = w * h * channels;
  const frames: Buffer[] = [];
  for (let o = 0; o + size <= r.stdoutBuf.length; o += size) frames.push(r.stdoutBuf.subarray(o, o + size));
  return { w, h, channels, fps: opts.fps, frames };
}

// Luminance BT.709 d'un pixel RGB.
export const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
