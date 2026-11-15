// Lecture minimale de robots.txt : règles Disallow/Allow du groupe « * ».
export function analyserRobots(contenu) {
  const regles = [];
  let groupeConcerne = false;
  let dansAgents = false;
  for (const brut of contenu.split(/\r?\n/)) {
    const ligne = brut.replace(/#.*/, '').trim();
    if (!ligne) continue;
    const i = ligne.indexOf(':');
    if (i < 0) continue;
    const cle = ligne.slice(0, i).trim().toLowerCase();
    const valeur = ligne.slice(i + 1).trim();
    if (cle === 'user-agent') {
      if (!dansAgents) groupeConcerne = false;
      dansAgents = true;
      if (valeur === '*') groupeConcerne = true;
    } else {
      dansAgents = false;
      if (!groupeConcerne) continue;
      if (cle === 'disallow' && valeur) regles.push({ autorise: false, chemin: valeur });
      if (cle === 'allow' && valeur) regles.push({ autorise: true, chemin: valeur });
    }
  }
  return regles;
}

function correspond(motif, chemin) {
  const echappe = motif
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  const fin = echappe.endsWith('\\$') ? echappe.slice(0, -2) + '$' : echappe;
  return new RegExp('^' + fin).test(chemin);
}

// La règle la plus longue qui correspond l'emporte (comme Google).
export function cheminAutorise(regles, chemin) {
  let meilleure = null;
  for (const r of regles) {
    if (correspond(r.chemin, chemin) && (!meilleure || r.chemin.length > meilleure.chemin.length)) {
      meilleure = r;
    }
  }
  return meilleure ? meilleure.autorise : true;
}
