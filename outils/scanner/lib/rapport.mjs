// Génération du rapport HTML en français.
const IMPACTS = {
  critical: { libelle: 'Critique', ordre: 0 },
  serious: { libelle: 'Grave', ordre: 1 },
  moderate: { libelle: 'Modéré', ordre: 2 },
  minor: { libelle: 'Mineur', ordre: 3 },
};

export function echapper(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const NOMS_LANGUES = {
  eng: 'anglais', spa: 'espagnol', deu: 'allemand', ita: 'italien', por: 'portugais', nld: 'néerlandais',
};

// « wcag111 » → « WCAG 1.1.1 »
export function formaterCritere(tag) {
  const m = /^wcag(\d)(\d)(\d+)$/.exec(tag);
  return m ? `WCAG ${m[1]}.${m[2]}.${m[3]}` : tag;
}

function sectionAccessibilite(a11y) {
  if (!a11y) return '';
  const regles = [...a11y.regles].sort(
    (x, y) => (IMPACTS[x.impact]?.ordre ?? 9) - (IMPACTS[y.impact]?.ordre ?? 9) || y.occurrences - x.occurrences,
  );
  const lignes = regles.map((r) => `
    <details class="regle">
      <summary>
        <span class="badge ${echapper(r.impact)}">${echapper(IMPACTS[r.impact]?.libelle ?? r.impact)}</span>
        <strong>${echapper(r.aide)}</strong>
        <span class="compte">${r.occurrences} élément(s) · ${r.pages.length} page(s)</span>
      </summary>
      <p>${echapper(r.description)}</p>
      <p class="petit">Critères : ${echapper(r.criteres.map(formaterCritere).join(', ') || '—')} · <a href="${echapper(r.lien)}" rel="noopener">Documentation (anglais)</a></p>
      <ul class="exemples">${r.exemples.map((e) => `
        <li><code>${echapper(e.cible)}</code><br><span class="petit">${echapper(e.page)}</span><pre>${echapper(e.html)}</pre></li>`).join('')}
      </ul>
    </details>`).join('');

  const parImpact = Object.entries(IMPACTS).map(([cle, { libelle }]) => {
    const n = regles.filter((r) => r.impact === cle).length;
    return `<div class="tuile"><span class="nombre">${n}</span><span>${libelle}</span></div>`;
  }).join('');

  return `
  <section>
    <h2>Accessibilité</h2>
    <p class="note"><strong>Important :</strong> ce pré-audit automatique ne détecte qu'une partie des problèmes
    (une partie des critères ne peut être vérifiée que par une personne). Il ne prouve <strong>pas</strong> que le site est conforme à la loi
    européenne sur l'accessibilité (EAA) ni au RGAA. Un audit humain reste nécessaire.</p>
    <div class="tuiles">${parImpact}</div>
    ${regles.length ? lignes : '<p>Aucun problème détecté automatiquement sur les pages analysées.</p>'}
  </section>`;
}

function sectionLangue(langue) {
  if (!langue) return '';
  const pagesLang = langue.pages.filter((p) => !p.langHtml || !p.langHtml.toLowerCase().startsWith('fr'));
  const lignes = langue.textes.map((t) => `
      <tr>
        <td>${echapper(t.texte)}</td>
        <td>${echapper(NOMS_LANGUES[t.langue] ?? t.langue)}</td>
        <td>${echapper(t.type)}</td>
        <td>${t.pages.length}</td>
        <td class="petit">${echapper(t.pages[0])}</td>
      </tr>`).join('');
  return `
  <section>
    <h2>Contenus non français</h2>
    <p class="note"><strong>Important :</strong> détection automatique, avec des erreurs possibles sur les textes très courts,
    les noms de marque et les termes techniques. Ce rapport ne dit pas si le site respecte la Charte de la langue
    française (Loi 96) : il liste seulement les textes qui semblent ne pas être en français.</p>
    <div class="tuiles">
      <div class="tuile"><span class="nombre">${langue.textes.length}</span><span>textes uniques non français</span></div>
      <div class="tuile"><span class="nombre">${langue.pagesTouchees}</span><span>pages concernées sur ${langue.pages.length}</span></div>
      <div class="tuile"><span class="nombre">${pagesLang.length}</span><span>pages sans <code>lang="fr"</code></span></div>
    </div>
    ${langue.textes.length ? `
    <div class="tableau"><table>
      <thead><tr><th>Texte</th><th>Langue probable</th><th>Type</th><th>Pages</th><th>Exemple de page</th></tr></thead>
      <tbody>${lignes}</tbody>
    </table></div>` : '<p>Aucun texte non français détecté sur les pages analysées.</p>'}
  </section>`;
}

export function genererRapport({ site, date, pages, erreurs, a11y, langue }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport ${echapper(new URL(site).hostname)}</title>
<style>
  :root { --fond:#fff; --texte:#1a1a1a; --doux:#5c5c5c; --bord:#ddd; --carte:#f6f6f4; --lien:#0b57d0;
          --critique:#b3261e; --grave:#c25e00; --modere:#7a6400; --mineur:#3d5a80; }
  @media (prefers-color-scheme: dark) { :root { --fond:#141414; --texte:#eee; --doux:#aaa; --bord:#333; --carte:#1f1f1f; --lien:#8ab4f8;
          --critique:#f28b82; --grave:#fcad70; --modere:#e6cc5c; --mineur:#9ec5f8; } }
  body { margin:0; background:var(--fond); color:var(--texte); font:16px/1.5 system-ui, sans-serif; }
  main { max-width:960px; margin:0 auto; padding:24px 16px 64px; }
  h1 { font-size:1.6rem; margin:0 0 4px; } h2 { margin-top:40px; border-bottom:1px solid var(--bord); padding-bottom:6px; }
  a { color:var(--lien); } .petit { font-size:.85rem; color:var(--doux); }
  .note { background:var(--carte); border-left:4px solid var(--grave); padding:10px 14px; border-radius:4px; }
  .tuiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin:16px 0; }
  .tuile { background:var(--carte); border-radius:8px; padding:12px; display:flex; flex-direction:column; }
  .nombre { font-size:1.8rem; font-weight:700; }
  .regle { border:1px solid var(--bord); border-radius:8px; padding:10px 14px; margin:8px 0; }
  .regle summary { cursor:pointer; display:flex; flex-wrap:wrap; gap:8px; align-items:baseline; }
  .compte { color:var(--doux); font-size:.85rem; margin-left:auto; }
  .badge { font-size:.75rem; font-weight:700; padding:2px 8px; border-radius:99px; border:1px solid currentColor; }
  .critical { color:var(--critique); } .serious { color:var(--grave); } .moderate { color:var(--modere); } .minor { color:var(--mineur); }
  pre { white-space:pre-wrap; word-break:break-all; background:var(--carte); padding:8px; border-radius:4px; font-size:.8rem; }
  code { word-break:break-all; }
  .exemples { padding-left:18px; }
  .tableau { overflow-x:auto; } table { border-collapse:collapse; width:100%; font-size:.9rem; }
  th, td { border-bottom:1px solid var(--bord); padding:6px 8px; text-align:left; vertical-align:top; }
</style>
</head>
<body><main>
  <h1>Rapport d'analyse</h1>
  <p class="petit">Site : <a href="${echapper(site)}">${echapper(site)}</a> · Date : ${echapper(date)} ·
  ${pages.length} page(s) analysée(s)${erreurs.length ? ` · ${erreurs.length} page(s) ignorée(s) ou en erreur` : ''}</p>
  ${sectionAccessibilite(a11y)}
  ${sectionLangue(langue)}
  <section>
    <h2>Pages analysées</h2>
    <ul>${pages.map((p) => `<li><a href="${echapper(p)}">${echapper(p)}</a></li>`).join('')}</ul>
    ${erreurs.length ? `<h3>Pages ignorées ou en erreur</h3><ul>${erreurs.map((e) => `<li>${echapper(e.url)} : ${echapper(e.message)}</li>`).join('')}</ul>` : ''}
  </section>
  <p class="petit">Rapport généré automatiquement. Il ne constitue pas un avis juridique.</p>
</main></body></html>`;
}
