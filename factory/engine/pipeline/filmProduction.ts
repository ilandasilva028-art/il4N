// Production d'un film « motion design » écrit en code (engine/render/player/films/<nom>.js) :
// rendu image → musique originale → bruitages → mixage → assemblage MP4 → analyse → contrôle qualité.
import fs from 'node:fs';
import path from 'node:path';
import { renderFilm } from '../render/render.ts';
import { writeMusic } from '../audio/music.ts';
import { writeSfx } from '../audio/sfx.ts';
import { mix } from '../audio/mix.ts';
import { runOk } from '../core/exec.ts';
import { TOOLS } from '../core/config.ts';
import { analyzeVideo, type AnalysisReport } from '../analysis/report.ts';
import { qualityControl, qcMarkdown, type QcReport } from '../agents/qc.ts';
import { readJson, writeJson, writeText } from '../core/store.ts';
import type { Logger } from '../core/log.ts';

export interface FilmJob { film: string; outDir: string; referenceAnalysis?: string; fps?: number; crf?: number; seed?: number; musicDb?: number; sfxDb?: number; log?: Logger }

export async function produceFilm(j: FilmJob): Promise<{ final: string; qc: QcReport; analysis: AnalysisReport }> {
  const log = j.log;
  fs.mkdirSync(j.outDir, { recursive: true });
  log?.info(`Rendu image du film « ${j.film} »…`);
  const r = await renderFilm(j.film, path.join(j.outDir, 'video.mp4'), { fps: j.fps ?? 30, crf: j.crf ?? 12, log, onProgress: (p) => log?.info(`rendu ${Math.round(p * 100)} %`) });
  log?.info(`${r.frames} images en ${r.seconds} s.`);
  const m = r.music || { bpm: 120, mood: 'energique', dropAt: 2 };
  const music = path.join(j.outDir, 'music.wav'), sfx = path.join(j.outDir, 'sfx.wav'), mixed = path.join(j.outDir, 'mix.wav');
  writeMusic(music, { durationSec: r.duration, bpm: m.bpm, mood: m.mood, dropAt: m.dropAt, breakAt: m.breakAt, backAt: m.backAt, seed: j.seed ?? 11 });
  writeSfx(sfx, r.hits, r.duration);
  const lv = await mix({ music, sfx, out: mixed, durationSec: r.duration, targetLufs: -14, truePeak: -1.5, musicDb: j.musicDb ?? 0, sfxDb: j.sfxDb ?? -3, voDb: 0 }, log);
  log?.info(`Mixage : ${lv.lufs} LUFS, crête ${lv.tp} dBTP.`);
  const final = path.join(j.outDir, 'final.mp4');
  await runOk(TOOLS.ffmpeg, ['-v', 'error', '-y', '-i', path.join(j.outDir, 'video.mp4'), '-i', mixed, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', final], { log });
  const analysis = await analyzeVideo(final, path.join(j.outDir, 'analyse'), { log, transcribe: false });
  const ref = j.referenceAnalysis && fs.existsSync(j.referenceAnalysis) ? readJson<AnalysisReport>(j.referenceAnalysis) : null;
  const qc = qualityControl(analysis, ref, { durationSec: r.duration, hasVoice: false });
  writeJson(path.join(j.outDir, 'qc.json'), qc);
  writeText(path.join(j.outDir, 'qc.md'), qcMarkdown(qc, j.film));
  return { final, qc, analysis };
}
