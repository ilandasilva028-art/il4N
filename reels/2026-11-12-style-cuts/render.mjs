// Rendu image par image : node render.mjs [fps]
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
const fps = +(process.argv[2] || 30);
const dir = new URL('.', import.meta.url).pathname;
rmSync(dir + 'frames', { recursive: true, force: true }); mkdirSync(dir + 'frames');
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await pg.goto('file://' + dir + 'index.html'); await pg.evaluate(() => document.fonts.ready);
await pg.waitForTimeout(300);
const dur = await pg.evaluate(() => window.DUR); const n = Math.round(dur * fps);
for (let i = 0; i < n; i++) {
  await pg.evaluate(t => window.seek(t), i / fps);
  await pg.screenshot({ path: `${dir}frames/${String(i).padStart(4, '0')}.png` });
}
await b.close();
mkdirSync(dir + 'out', { recursive: true });
execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(fps), '-i', dir + 'frames/%04d.png', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', '30', dir + 'out/video_seule.mp4']);
console.log('ok', n, 'images');
