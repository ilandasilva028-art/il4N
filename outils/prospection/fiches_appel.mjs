#!/usr/bin/env node
// Génère une fiche d'appel par entreprise à partir d'un CSV que TU fournis.
// Colonnes attendues (séparateur ;) : nom;ville;telephone;site;note
// Usage : node fiches_appel.mjs contacts.csv [fiches.md]
import { readFile, writeFile } from 'node:fs/promises';

const [, , entree, sortie = 'fiches_appel.md'] = process.argv;
if (!entree) {
  console.log('Usage : node fiches_appel.mjs contacts.csv [fiches.md]');
  process.exit(1);
}

function lireCsv(texte) {
  const [entete, ...lignes] = texte.trim().split(/\r?\n/);
  const cles = entete.split(';').map((c) => c.trim().toLowerCase());
  return lignes.filter(Boolean).map((l) => {
    const v = l.split(';');
    return Object.fromEntries(cles.map((c, i) => [c, (v[i] ?? '').trim()]));
  });
}

// Garde seulement les contacts sans site, avec un numéro.
function aPrioriser(c) {
  return c.nom && c.telephone && !c.site;
}

const SCRIPT = (c) => `**Ouverture (5 s)**
Bonjour, je m'appelle [prénom], je travaille sur les sites d'entreprises de [ville]. Je vous appelle pour une seule question : avez-vous déjà un site internet ?

**Si non**
Je vois que votre fiche Google est active, mais je ne trouve pas de site. Beaucoup de clients cherchent d'abord un site avant de venir. Je peux vous proposer une page de présentation simple. Est-ce que vous seriez intéressé par une maquette gratuite, sans engagement ?

**Si oui**
Merci, je vais regarder. Auriez-vous besoin d'une mise à jour, d'une réservation en ligne ou d'un paiement ?

**Si intéressé**
Parfait. Quel est le meilleur moyen de vous envoyer la maquette : e-mail ou WhatsApp ?

**Si refus**
Je comprends, merci de votre temps. Puis-je vous envoyer un message une seule fois, par e-mail, si cela vous est utile plus tard ?

**Après l'appel**
Noter : intérêt (oui / non / plus tard), moyen de contact, date de relance.`;

const texte = await readFile(entree, 'utf8');
const contacts = lireCsv(texte);
const retenus = contacts.filter(aPrioriser);

const date = new Date().toISOString().slice(0, 10);
const blocs = retenus.map((c, i) => `## ${i + 1}. ${c.nom}

- **Ville :** ${c.ville || '—'}
- **Téléphone :** ${c.telephone}
- **Note :** ${c.note || '—'}
- **Résultat :** ☐ intéressé  ☐ plus tard  ☐ non  ☐ pas de réponse
- **Relance le :** ____

${SCRIPT(c)}
`);

const entete = `# Fiches d'appel — ${date}

${retenus.length} contact(s) retenu(s) sur ${contacts.length} (sans site, avec un numéro).

Rappels : appelle uniquement des entreprises, dis qui tu es, et respecte les demandes de retrait (ne plus rappeler).

---

`;
await writeFile(sortie, entete + blocs.join('\n---\n\n'));
console.log(`${retenus.length} fiche(s) écrite(s) dans ${sortie}`);
