// Captures du vrai site il4nstudio.netlify.app, horloge du navigateur fixée au 17/11/2026 12:00 (Paris).
// Le compte à rebours affiche donc le vrai temps restant à cette date. Rien n'est modifié dans la page.
import { chromium } from 'playwright';
const OUT = 'reels/2026-11-noel/assets/shots/';
const T = new Date('2026-11-17T12:00:00+01:00');
const b = await chromium.launch();
async function page(vp, dsf) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dsf, reducedMotion: 'reduce' });
  const p = await ctx.newPage(); await p.clock.setFixedTime(T);
  await p.goto('https://il4nstudio.netlify.app', { waitUntil: 'networkidle' });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
  await p.waitForTimeout(1200); return p;
}
const m = await page({ width: 390, height: 844 }, 3);
await m.screenshot({ path: OUT + 'm_top.png' });
for (const [sel, name] of [['#sites', 'm_sites'], ['#realisations', 'm_reals'], ['#offres', 'm_offres']]) {
  await m.locator(sel).screenshot({ path: OUT + name + '.png' }).catch(e => console.log('échec', name, e.message.slice(0, 80)));
}
const d = await page({ width: 1440, height: 900 }, 1.5);
await d.screenshot({ path: OUT + 'd_top.png' });
for (const [sel, name] of [['#sites', 'd_sites'], ['#realisations', 'd_reals'], ['#offres', 'd_offres']]) {
  await d.locator(sel).screenshot({ path: OUT + name + '.png' }).catch(e => console.log('échec', name, e.message.slice(0, 80)));
}
await b.close();
