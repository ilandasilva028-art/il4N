// Interface en ligne de commande : npm run analyze -- <video> | npm run doctor | npm run produce -- <options>
import path from 'node:path';
import { analyzeVideo } from './analysis/report.ts';
import { createLogger } from './core/log.ts';
import { ensureDirs } from './core/config.ts';

const [cmd, ...args] = process.argv.slice(2);
ensureDirs();
const log = createLogger('cli');

if (cmd === 'analyze') {
  const file = args[0];
  const out = args[1] || path.join('data', 'tmp', 'analyse-' + path.basename(file, path.extname(file)));
  const r = await analyzeVideo(path.resolve(file), path.resolve(out), { log, onProgress: (p, l) => log.info(`${Math.round(p * 100)} % ${l}`) });
  console.log(JSON.stringify({ out, shots: r.scenes.shotCount, lufs: r.audio.integratedLufs, wpm: r.transcript.wordsPerMinute, seconds: r.analysisSeconds }));
} else {
  console.log('Commandes : analyze <video> [dossier] | doctor | produce');
}

if (cmd === 'film') {
  const { produceFilm } = await import('./pipeline/filmProduction.ts');
  const [film, outDir, ref] = args;
  const r = await produceFilm({ film, outDir: path.resolve(outDir), referenceAnalysis: ref ? path.resolve(ref) : undefined, log });
  console.log(JSON.stringify({ final: r.final, score: r.qc.score, max: r.qc.measurableMax }));
}
