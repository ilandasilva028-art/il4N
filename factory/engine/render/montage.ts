// Montage final avec Remotion (factory/remotion/) : le moteur canvas fournit l'image « propre » (?v=clean : ni textes,
// ni compteur, ni transitions) et le son (mix.wav de la version livrée) ; la fiche MONTAGE exportée par le film décrit
// les textes, le compteur, la barre de progression et les transitions. Remotion rend les versions A et B.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT } from '../core/config.ts';
import { servePlayer, renderFilm } from './render.ts';

export const REMOTION_DIR = path.join(ROOT, 'remotion');

export async function extractMontage(film: string): Promise<any | null> {
  const { chromium } = await import('playwright');
  const srv = await servePlayer();
  const browser = await chromium.launch(process.env.FACTORY_CHROMIUM ? { executablePath: process.env.FACTORY_CHROMIUM } : {});
  try {
    const page = await browser.newPage();
    await page.goto(`${srv.url}/index.html?film=${film}&render=1&v=a`);
    await page.waitForFunction(() => (window as any).filmReady === true, null, { timeout: 120000 });
    return await page.evaluate(() => (window as any).MONTAGE ? JSON.parse(JSON.stringify((window as any).MONTAGE)) : null);
  } finally { await browser.close(); srv.close(); }
}

const run = (cmd: string, args: string[], cwd: string) => new Promise<void>((resolve, reject) => {
  const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '';
  p.stdout.on('data', () => {}); p.stderr.on('data', (d) => { err += d; });
  p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.slice(0, 3).join(' ')} → ${code}\n${err.slice(-2000)}`))));
});

export async function montage(film: string, mixWav: string, outA: string, outB: string, { reuseClean = false } = {}): Promise<{ spec: any }> {
  if (!fs.existsSync(path.join(REMOTION_DIR, 'node_modules', 'remotion'))) throw new Error('Remotion absent : cd factory/remotion && npm ci');
  const spec = await extractMontage(film);
  if (!spec) throw new Error(`Le film ${film} n'exporte pas de fiche MONTAGE (voir docs/ROUTINE-VIDEO-QUOTIDIENNE.md § Remotion).`);
  const pub = path.join(REMOTION_DIR, 'public');
  fs.mkdirSync(pub, { recursive: true });
  const clean = path.join(pub, 'clean.mp4');
  if (!(reuseClean && fs.existsSync(clean))) await renderFilm(film, clean, { fps: spec.fps, crf: 14, variant: 'clean' });
  fs.copyFileSync(mixWav, path.join(pub, 'mix.wav'));
  const browser = process.env.FACTORY_CHROMIUM ? [`--browser-executable=${process.env.FACTORY_CHROMIUM}`] : [];
  for (const [variant, out] of ([['a', outA], ['b', outB]] as const).filter(([v]) => (process.env.MONTAGE_VARIANTS ?? 'ab').includes(v))) {
    const props = path.join(REMOTION_DIR, 'out', `props-${variant}.json`);
    fs.mkdirSync(path.dirname(props), { recursive: true });
    fs.writeFileSync(props, JSON.stringify({ spec, variant, video: 'clean.mp4', audio: 'mix.wav' }));
    await run('npx', ['remotion', 'render', 'src/index.ts', 'Montage', out, `--props=${props}`, '--codec=h264', '--crf=18', '--concurrency=4', '--log=error', ...browser], REMOTION_DIR);
  }
  return { spec };
}
