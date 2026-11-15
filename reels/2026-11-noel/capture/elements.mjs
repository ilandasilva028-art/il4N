// Captures élément par élément du vrai site (horloge fixée au 17/11/2026 12:00), pour les plans « cartes ».
import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const p = await ctx.newPage(); await p.clock.setFixedTime(new Date('2026-11-17T12:00:00+01:00'));
await p.goto('https://il4nstudio.netlify.app', { waitUntil: 'networkidle' });
await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } scrollTo(0, 0); });
await p.waitForTimeout(1000);
const kids = await p.evaluate(() => {
  const out = {};
  const prod = document.querySelector('#products'); out.products = [...prod.children].slice(0, 3).map(e => e.className);
  const sites = document.querySelector('#sites'); out.sites = [...sites.querySelectorAll('article, .card, [class*=card], [class*=plan], p')].slice(0, 12).map(e => e.tagName + '.' + (e.className + '').slice(0, 40) + ' ' + (e.innerText || '').slice(0, 50).replace(/\n/g, ' '));
  return out;
});
console.log(JSON.stringify(kids, null, 1));
const S = 'reels/2026-11-noel/';
const cards = p.locator('#products > *');
for (let i = 0; i < 3; i++) for (const f of ['flyers', 'site']) await cards.nth(i).screenshot({ path: `${S}${f}/assets/shots/carte_flyer_${i + 1}.png` });
await b.close();
