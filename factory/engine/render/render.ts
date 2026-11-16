// AGENT 6 (partie image) — rendu image par image d'un film canvas dans Chromium (Playwright),
// encodage H.264 par FFmpeg. Le lecteur est servi par un mini-serveur HTTP local (polices, modules).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { PLAYER_DIR, TOOLS, LIMITS } from '../core/config.ts';
import type { Logger } from '../core/log.ts';

const launchOpts = (extra: string[] = []) => ({ args: extra, ...(process.env.FACTORY_CHROMIUM ? { executablePath: process.env.FACTORY_CHROMIUM } : {}) });
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

export function servePlayer(): Promise<{ url: string; close: () => void }> {
  const server = http.createServer((req, res) => {
    const p = path.normalize(decodeURIComponent((req.url || '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const file = path.join(PLAYER_DIR, p === '/' ? 'index.html' : p);
    if (!file.startsWith(PLAYER_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const a = server.address() as { port: number };
    resolve({ url: `http://127.0.0.1:${a.port}`, close: () => server.close() });
  }));
}

export interface TextFrame { t: number; texts: string[] }
export interface RenderResult { file: string; frames: number; seconds: number; duration: number; hits: any[]; music: any; textLog: TextFrame[] }

export async function renderFilm(film: string, out: string, opts: { fps?: number; crf?: number; log?: Logger; onProgress?: (p: number) => void; from?: number; to?: number; variant?: string } = {}): Promise<RenderResult> {
  const fps = opts.fps ?? 30;
  const { chromium } = await import('playwright');
  const srv = await servePlayer();
  const browser = await chromium.launch(launchOpts(['--force-color-profile=srgb']));
  const t0 = Date.now();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => opts.log?.error(`Lecteur : ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') opts.log?.error(`Lecteur : ${m.text()}`); });
    await page.goto(`${srv.url}/index.html?film=${film}&render=1&fps=${fps}&v=${opts.variant || 'a'}`);
    await page.waitForFunction('window.filmReady === true', null, { timeout: 60000 });
    const textLog: TextFrame[] = [];
    const meta = await page.evaluate('({ d: window.DURATION, hits: window.HITS, music: window.MUSIC })') as { d: number; hits: any[]; music: any };
    const from = opts.from ?? 0, to = Math.min(opts.to ?? meta.d, meta.d);
    const n = Math.round((to - from) * fps);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const ff = spawn(TOOLS.ffmpeg, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', String(opts.crf ?? 17), '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-threads', String(LIMITS.ffmpegThreads), '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'pipe'] });
    let ffErr = '';
    ff.stderr.on('data', (d) => (ffErr += d));
    const done = new Promise<void>((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`FFmpeg (encodage) : ${ffErr.slice(-400)}`)))));
    for (let i = 0; i < n; i++) {
      const t = from + i / fps;
      const res = await page.evaluate((tt) => { const w = window as any; w.seek(tt); return { b64: (document.getElementById('film') as HTMLCanvasElement).toDataURL('image/jpeg', 0.95).slice(23), texts: w.__frameTexts ? [...new Set(w.__frameTexts() as string[])] : [] }; }, t) as { b64: string; texts: string[] };
      const b64 = res.b64;
      textLog.push({ t: Math.round(t * 1000) / 1000, texts: res.texts });
      if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % fps === 0) opts.onProgress?.(i / n);
    }
    ff.stdin.end();
    await done;
    return { file: out, frames: n, seconds: Math.round((Date.now() - t0) / 100) / 10, duration: to - from, hits: meta.hits, music: meta.music, textLog };
  } finally {
    await browser.close();
    srv.close();
  }
}

// Une image fixe (contrôle rapide d'un plan).
export async function stills(film: string, times: number[], outDir: string, variant = 'a'): Promise<string[]> {
  const { chromium } = await import('playwright');
  const srv = await servePlayer();
  const browser = await chromium.launch(launchOpts());
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.goto(`${srv.url}/index.html?film=${film}&render=1&v=${variant}`);
    await page.waitForFunction('window.filmReady === true');
    fs.mkdirSync(outDir, { recursive: true });
    const files: string[] = [];
    for (const t of times) {
      const b64 = await page.evaluate((tt) => { (window as any).seek(tt); return (document.getElementById('film') as HTMLCanvasElement).toDataURL('image/jpeg', 0.9).slice(23); }, t) as string;
      const f = path.join(outDir, `still_${t.toFixed(2)}.jpg`); fs.writeFileSync(f, Buffer.from(b64, 'base64')); files.push(f);
    }
    return files;
  } finally { await browser.close(); srv.close(); }
}
