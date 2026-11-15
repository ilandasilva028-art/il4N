#!/usr/bin/env node
// Scanner de site : pré-audit d'accessibilité (axe-core) et contenus non français.
// Usage : node scan.mjs <url> [--mode tout|accessibilite|langue] [--pages 10] [--sortie dossier]
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detecterLangue } from './lib/langue.mjs';
import { analyserRobots, cheminAutorise } from './lib/robots.mjs';
import { genererRapport } from './lib/rapport.mjs';

const require = createRequire(import.meta.url);
const ICI = path.dirname(fileURLToPath(import.meta.url));
const AGENT = 'ScannerSite/0.1 (pre-audit accessibilite et langue)';
const EXTENSIONS_IGNOREES = /\.(pdf|jpe?g|png|gif|webp|svg|ico|zip|mp4|mp3|webm|docx?|xlsx?|pptx?|css|js|json|xml|txt)$/i;

function lireArguments(argv) {
  const opts = { mode: 'tout', pages: 10, sortie: null, url: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') opts.mode = argv[++i];
    else if (a === '--pages') opts.pages = Number(argv[++i]);
    else if (a === '--sortie') opts.sortie = argv[++i];
    else if (a === '-h' || a === '--aide') opts.aide = true;
    else if (!opts.url) opts.url = a;
  }
  return opts;
}

function normaliser(href, origine) {
  try {
    const u = new URL(href, origine);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    u.hash = '';
    u.pathname = u.pathname.replace(/\/index\.(html?|php)$/i, '/');
    if (EXTENSIONS_IGNOREES.test(u.pathname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

async function chargerRobots(origine) {
  try {
    const rep = await fetch(new URL('/robots.txt', origine), { headers: { 'user-agent': AGENT } });
    if (!rep.ok) return [];
    return analyserRobots(await rep.text());
  } catch {
    return [];
  }
}

// Exécuté dans la page : textes visibles regroupés par bloc + attributs lus par les utilisateurs.
function extraireTextes() {
  const resultats = [];
  const vus = new Set();
  const ajouter = (texte, type) => {
    const t = (texte || '').replace(/\s+/g, ' ').trim();
    if (t.length < 2 || t.length > 500) return;
    const cle = type + '|' + t;
    if (vus.has(cle)) return;
    vus.add(cle);
    resultats.push({ texte: t, type });
  };
  const visible = (el) => {
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length > 0;
  };
  const BLOCS = 'h1,h2,h3,h4,h5,h6,p,li,a,button,label,th,td,dt,dd,figcaption,blockquote,summary,option,legend,caption';
  for (const el of document.querySelectorAll(BLOCS)) {
    if (!visible(el)) continue;
    // Évite les doublons : ignore un bloc qui contient d'autres blocs (ses enfants seront traités).
    if (el.querySelector(BLOCS)) {
      const propre = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ');
      ajouter(propre, 'texte');
      continue;
    }
    const type = el.matches('a') ? 'lien' : el.matches('button') ? 'bouton' : el.matches('h1,h2,h3,h4,h5,h6') ? 'titre' : 'texte';
    ajouter(el.innerText, type);
  }
  for (const el of document.querySelectorAll('img[alt]')) ajouter(el.getAttribute('alt'), 'texte alternatif');
  for (const el of document.querySelectorAll('[placeholder]')) ajouter(el.getAttribute('placeholder'), 'champ (indication)');
  for (const el of document.querySelectorAll('[aria-label]')) ajouter(el.getAttribute('aria-label'), 'libellé accessible');
  for (const el of document.querySelectorAll('input[type=submit][value],input[type=button][value]')) ajouter(el.value, 'bouton');
  ajouter(document.title, 'titre de page');
  const meta = document.querySelector('meta[name=description]');
  if (meta) ajouter(meta.content, 'description (meta)');
  return { textes: resultats, langHtml: document.documentElement.getAttribute('lang') || '' };
}

function fusionnerAxe(cumul, violations, url) {
  for (const v of violations) {
    let r = cumul.get(v.id);
    if (!r) {
      r = {
        id: v.id, impact: v.impact, aide: v.help, description: v.description, lien: v.helpUrl,
        criteres: v.tags.filter((t) => /^wcag\d/.test(t) && !/^wcag2a+$|^wcag21a+$|^wcag22a+$/.test(t)),
        occurrences: 0, pages: [], exemples: [],
      };
      cumul.set(v.id, r);
    }
    r.occurrences += v.nodes.length;
    if (!r.pages.includes(url)) r.pages.push(url);
    for (const n of v.nodes) {
      if (r.exemples.length >= 5) break;
      r.exemples.push({ page: url, cible: n.target.join(' '), html: n.html.slice(0, 300) });
    }
  }
}

async function main() {
  const opts = lireArguments(process.argv.slice(2));
  if (opts.aide || !opts.url) {
    console.log('Usage : node scan.mjs <url> [--mode tout|accessibilite|langue] [--pages 10] [--sortie dossier]');
    process.exit(opts.url ? 0 : 1);
  }
  if (!['tout', 'accessibilite', 'langue'].includes(opts.mode)) throw new Error(`Mode inconnu : ${opts.mode}`);
  const depart = normaliser(opts.url, opts.url);
  if (!depart) throw new Error(`URL invalide : ${opts.url}`);
  const origine = new URL(depart).origin;
  const faireA11y = opts.mode !== 'langue';
  const faireLangue = opts.mode !== 'accessibilite';

  const robots = await chargerRobots(origine);
  const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
  const axeFr = JSON.parse(await readFile(path.join(path.dirname(require.resolve('axe-core/axe.min.js')), 'locales/fr.json'), 'utf8'));

  const { chromium } = require('playwright');
  // Utilise le proxy de l'environnement s'il existe (HTTPS_PROXY).
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const navigateur = await chromium.launch(proxy ? { proxy: { server: proxy } } : {});
  const contexte = await navigateur.newContext({ userAgent: AGENT, locale: 'fr-FR' });
  const page = await contexte.newPage();

  const file = [depart];
  const connus = new Set(file);
  const analysees = [];
  const erreurs = [];
  const reglesAxe = new Map();
  const textes = new Map();
  const pagesLangue = [];

  while (file.length && analysees.length < opts.pages) {
    const url = file.shift();
    const chemin = new URL(url).pathname + new URL(url).search;
    if (!cheminAutorise(robots, chemin)) {
      erreurs.push({ url, message: 'interdit par robots.txt, page ignorée' });
      continue;
    }
    process.stderr.write(`Analyse ${analysees.length + 1}/${opts.pages} : ${url}\n`);
    try {
      const rep = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      if (rep && !rep.ok()) throw new Error(`HTTP ${rep.status()}`);
      await page.waitForTimeout(800);
      const finale = page.url();
      if (new URL(finale).origin !== origine) throw new Error(`redirigé hors du site (${finale})`);
      analysees.push(finale);

      const liens = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
      for (const l of liens) {
        const n = normaliser(l, finale);
        if (n && new URL(n).origin === origine && !connus.has(n)) {
          connus.add(n);
          file.push(n);
        }
      }

      if (faireA11y) {
        await page.addScriptTag({ content: axeSource });
        const violations = await page.evaluate(async (locale) => {
          window.axe.configure({ locale });
          const r = await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
            resultTypes: ['violations'],
          });
          return r.violations;
        }, axeFr);
        fusionnerAxe(reglesAxe, violations, finale);
      }

      if (faireLangue) {
        const { textes: blocs, langHtml } = await page.evaluate(extraireTextes);
        let touchee = false;
        for (const b of blocs) {
          const code = detecterLangue(b.texte);
          if (code === 'fra' || code === 'und') continue;
          touchee = true;
          const cle = b.texte;
          const t = textes.get(cle) ?? { texte: b.texte, langue: code, type: b.type, pages: [] };
          if (!t.pages.includes(finale)) t.pages.push(finale);
          textes.set(cle, t);
        }
        pagesLangue.push({ url: finale, langHtml, touchee });
      }
    } catch (e) {
      erreurs.push({ url, message: e.message.split('\n')[0] });
    }
  }
  await navigateur.close();

  if (!analysees.length) {
    for (const e of erreurs) console.error(`- ${e.url} : ${e.message}`);
    throw new Error('aucune page n\'a pu être analysée');
  }

  const date = new Date().toISOString().slice(0, 10);
  const donnees = {
    site: depart,
    date,
    pages: analysees,
    erreurs,
    a11y: faireA11y ? { regles: [...reglesAxe.values()] } : null,
    langue: faireLangue
      ? {
          textes: [...textes.values()].sort((a, b) => b.pages.length - a.pages.length),
          pages: pagesLangue,
          pagesTouchees: pagesLangue.filter((p) => p.touchee).length,
        }
      : null,
  };

  const dossier = opts.sortie ?? path.join(ICI, 'rapports', `${new URL(depart).hostname}-${date}`);
  await mkdir(dossier, { recursive: true });
  await writeFile(path.join(dossier, 'donnees.json'), JSON.stringify(donnees, null, 2));
  await writeFile(path.join(dossier, 'rapport.html'), genererRapport(donnees));
  console.log(`Rapport : ${path.join(dossier, 'rapport.html')}`);
  if (faireA11y) console.log(`Accessibilité : ${reglesAxe.size} type(s) de problème`);
  if (faireLangue) console.log(`Langue : ${textes.size} texte(s) non français`);
}

main().catch((e) => {
  console.error(`Erreur : ${e.message}`);
  process.exit(1);
});
