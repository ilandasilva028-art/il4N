// Fiche technique d'un fichier vidéo via ffprobe (aucune estimation : valeurs lues dans le fichier).
import { runOk } from '../core/exec.ts';
import { TOOLS } from '../core/config.ts';
import type { Logger } from '../core/log.ts';

export interface ProbeInfo {
  file: string;
  container: string;
  durationSec: number;
  sizeBytes: number;
  bitrateKbps: number | null;
  video: null | {
    codec: string; profile: string | null; width: number; height: number; displayWidth: number; displayHeight: number;
    rotation: number; fps: number; avgFps: number; frameCount: number | null; pixFmt: string; bitrateKbps: number | null;
    colorSpace: string | null; colorRange: string | null; aspect: string; orientation: 'vertical' | 'horizontal' | 'carré';
  };
  audio: null | { codec: string; sampleRate: number; channels: number; bitrateKbps: number | null; layout: string | null };
}

const ratio = (s?: string) => {
  if (!s) return 0;
  const [a, b] = s.split('/').map(Number);
  return b ? a / b : a;
};
const kbps = (v?: string) => (v && !Number.isNaN(Number(v)) ? Math.round(Number(v) / 1000) : null);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export async function probe(file: string, log?: Logger): Promise<ProbeInfo> {
  const r = await runOk(TOOLS.ffprobe, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { log, lowPriority: false });
  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s: any) => s.codec_type === 'video' && !(s.disposition?.attached_pic));
  const a = j.streams.find((s: any) => s.codec_type === 'audio');
  let rotation = 0;
  if (v) {
    const sd = (v.side_data_list || []).find((x: any) => x.rotation !== undefined);
    rotation = Math.abs(Number(sd?.rotation ?? v.tags?.rotate ?? 0)) % 360;
  }
  const w = v ? Number(v.width) : 0, h = v ? Number(v.height) : 0;
  const dw = rotation === 90 || rotation === 270 ? h : w, dh = rotation === 90 || rotation === 270 ? w : h;
  const g = gcd(dw, dh) || 1;
  return {
    file,
    container: j.format.format_name,
    durationSec: Number(j.format.duration || v?.duration || 0),
    sizeBytes: Number(j.format.size || 0),
    bitrateKbps: kbps(j.format.bit_rate),
    video: v ? {
      codec: v.codec_name, profile: v.profile ?? null, width: w, height: h, displayWidth: dw, displayHeight: dh, rotation,
      fps: Math.round(ratio(v.r_frame_rate) * 100) / 100, avgFps: Math.round(ratio(v.avg_frame_rate) * 100) / 100,
      frameCount: v.nb_frames ? Number(v.nb_frames) : null, pixFmt: v.pix_fmt, bitrateKbps: kbps(v.bit_rate),
      colorSpace: v.color_space ?? null, colorRange: v.color_range ?? null,
      aspect: `${dw / g}:${dh / g}`, orientation: dh > dw ? 'vertical' : dw > dh ? 'horizontal' : 'carré',
    } : null,
    audio: a ? { codec: a.codec_name, sampleRate: Number(a.sample_rate), channels: Number(a.channels), bitrateKbps: kbps(a.bit_rate), layout: a.channel_layout ?? null } : null,
  };
}
