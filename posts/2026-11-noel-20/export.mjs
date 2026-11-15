// Exporte les 6 visuels fixes (3 sujets × post 1080×1350 / story 1080×1920) en PNG.
import { chromium } from 'playwright';
import { fileURLToPath } from 'url'; import path from 'path';
const dir = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
for (const v of ['flyers', 'site', 'menu']) for (const [f, h] of [['post', 1350], ['story', 1920]]) {
  const p = await b.newPage({ viewport: { width: 1080, height: h } });
  await p.goto(`file://${dir}/visuel.html?v=${v}&f=${f}`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const over = await p.evaluate(() => { const lim = innerHeight - (document.body.classList.contains('story') ? 430 : 40) + 0; const m = Math.max(...[...document.querySelectorAll('.col > *')].map(e => e.getBoundingClientRect().bottom)); return m > lim ? Math.round(m - lim) + ' px de trop' : 0; });
  await p.screenshot({ path: `${dir}/${v}-${f}.png` });
  console.log(`${v}-${f}.png`, over ? '⚠️ ' + over : 'ok');
  await p.close();
}
await b.close();
