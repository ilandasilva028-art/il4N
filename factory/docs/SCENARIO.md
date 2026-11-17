# Écrire un scénario qui retient (méthode de la série « Toi contre toi »)

Une vidéo de 25-30 s n'est pas une liste de slogans : c'est une **mini-histoire** avec un héros (« Toi »,
bandeau rouge), un problème que le spectateur connaît, un obstacle, un retournement, et une leçon
applicable. Chaque film exporte `SCRIPT` (voir le modèle `films/j20261116-foule2.js`). Un contrôle
automatique (`engine/agents/scriptCheck.ts`) vérifie la structure : indicatif, pas un score.

## 1. Les 7 temps d'une histoire courte

| Temps | Durée | Rôle | Exemple (« Ceux qui rient ») |
|---|---|---|---|
| **Ouverture « in medias res »** | 2-3 s | Montrer la fin ou le moment fort d'abord : on veut savoir comment on en est arrivé là | Sur scène, sous les applaudissements. « JOUR 180. » |
| **Retour en arrière** | 1 s | Rembobinage (`rewind()`), « 180 JOURS PLUS TÔT… » | Bandes VHS, ◀◀ |
| **Conflit** | 3-4 s | Une situation que le spectateur a vécue, avec des **répliques réelles** en bulles | « TOI ? SPORTIF ? » « T'ARRÊTERAS LUNDI. » |
| **Effort + conseil 1** | 3-4 s | Le héros agit, un conseil concret s'affiche | 5 h 00, pompes. « N'ANNONCE PAS TES PLANS. » |
| **Obstacle** | 3 s | Le moment où il pourrait abandonner (pluie, fatigue, zéro envie) + comment il s'en sort | « JOUR 63. ZÉRO ENVIE. » → « 5 MINUTES QUAND MÊME. » |
| **Progression + conseil 3** | 3-4 s | Le résultat de la constance, pendant que les autres n'ont pas bougé | Course de nuit ; eux scrollent sur un banc |
| **Retournement + chute** | 4-5 s | Ceux du conflit reviennent, la situation s'inverse ; la chute **rappelle l'accroche** | Le même moqueur : « COMMENT T'AS FAIT ? » — « J'AI PAS ARRÊTÉ. » |

## 1 bis. Première seconde (règle obligatoire)
Une action dès l'image 0 : chute, occasion ratée, temps perdu ou obstacle. Pas d'intro, pas de logo. Le champ `premiere` du `SCRIPT` indique laquelle.

## 2. Règles d'écriture
- **Accroche ≤ 6 mots**, qui crée une question : contradiction, chiffre, provocation ou fin montrée d'abord.
- **Spécificité** : une heure (« 5 H 00 »), un jour (« JOUR 63 »), un objet (réveil, banc, barre), une réplique entendue en vrai. Le spécifique fait vrai ; le vague fait « citation Pinterest ».
- **2 à 4 conseils applicables**, à l'impératif, 6 mots maximum : quoi faire, pas quoi ressentir.
- **Un obstacle** : sans moment de doute, pas d'histoire. Le conseil le plus utile est souvent celui qui répond à l'obstacle.
- **Des personnages qui parlent** : 2 à 4 bulles de dialogue (`bubble()`), 5 mots maximum chacune.
- **Rappel final** : la chute reprend un mot ou une image de l'accroche (la boucle en devient naturelle).
- **Jamais** : chiffre, étude ou témoignage inventés présentés comme réels ; insultes ; promesse de résultat (« tu seras riche »).

## 3. Format de `SCRIPT` (exporté par chaque film)
```js
export const SCRIPT = {
  premiere: 'chute',   // chute | raté | perte de temps | obstacle
  accroche: ['JOUR 180.', 'ILS APPLAUDISSENT.'],
  structure: ['ouverture', 'retour', 'conflit', 'effort', 'obstacle', 'progression', 'retournement', 'chute'],
  dialogues: ['TOI ? SPORTIF ?', 'T’ARRÊTERAS LUNDI.', 'COMMENT T’AS FAIT ?', 'J’AI PAS ARRÊTÉ.'],
  conseils: ['N’ANNONCE PAS TES PLANS.', 'JOURS SANS : 5 MINUTES.', 'NOTE CHAQUE SÉANCE.'],
  details: ['5 H 00', 'JOUR 63', 'réveil', 'banc', 'barre'],
  chute: ['LAISSE-LES RIRE.', 'CONTINUE.'],
};
```
