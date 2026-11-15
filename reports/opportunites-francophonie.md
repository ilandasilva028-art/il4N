# Opportunités de sites web dans les pays francophones

Date : 2026-11-15 · Suite de `reports/opportunites.md`

## Avertissement méthodologique

- **Aucune idée n'est validée commercialement.** Ce sont des hypothèses à tester, pas des affaires rentables.
- Recherche faite uniquement avec WebSearch. Certains sites sont bloqués par le réseau de la session (`pr.com`, `hn.nuxt.dev`). Aucun fil Reddit n'est remonté.
- Beaucoup de sources sont des **prestataires qui vendent leurs services** (agences, éditeurs, blogs SEO). Leurs chiffres ne sont **pas vérifiés**. Les sources officielles (DGCCRF, OQLF, SPF Finances, DGFiP) n'ont pas été lues directement.
- Pays couverts : France, Belgique, Québec, Afrique de l'Ouest francophone (Sénégal, Côte d'Ivoire, Mali, Burkina Faso). **Non étudiés** : Maghreb, Afrique centrale (hors une mention RDC), Suisse, Luxembourg, Haïti.
- Rien de ce rapport n'est un conseil juridique.

## Vue d'ensemble : pourquoi ces trois marchés

Trois types de déclencheurs reviennent :
1. **Une obligation légale récente** : accessibilité EAA (UE, juin 2025), Loi 96 au Québec (seuil de 25 employés depuis juin 2025), facturation électronique (Belgique en 2026, France en 2026-2027).
2. **Un manque d'outils adaptés aux paiements locaux** : le mobile money en Afrique de l'Ouest.
3. **Un retard numérique des petites entreprises** : un communiqué non vérifié avance que 61 % des petites entreprises françaises auraient un site en 2025, contre 70 % auparavant (https://www.pr.com/press-release/972958 ; source non lue, chiffre à recouper).

---

## Idée 1 — Boutique-lien « WhatsApp + Wave/Orange Money » pour vendeurs d'Afrique de l'Ouest

**Problème.** Beaucoup de petits commerçants vendent déjà sur WhatsApp, Instagram, Facebook et TikTok. Ils gèrent les commandes à la main, et les plateformes internationales prennent mal en charge le mobile money.

**Public cible.** Vendeurs individuels et TPE au Sénégal et en Côte d'Ivoire (puis Mali, Burkina Faso) : mode, cosmétiques, alimentaire. Ils vendent déjà via les réseaux sociaux et encaissent en Wave ou Orange Money.

**Preuves et sources.**
- Vente sans boutique, via WhatsApp/Facebook/Instagram, et sous-exploitation du digital par les PME (intervenante sénégalaise) : https://www.casafrica.es/sites/default/files/contents/document/Intervention-table-ronde-Awa%20G.B.pdf
- Shopify Payments n'est pas disponible en Côte d'Ivoire ; frais supplémentaires sans lui (source prestataire) : https://kolonell.com/fr/blog/creer-boutique-en-ligne-abidjan-guide-complet-2026
- Wave Business offre une API de checkout web avec webhook ; le coût caché cité est l'intégration et la réconciliation, plus que le pourcentage (source prestataire) : https://kolonell.com/fr/blog/integrer-wave-orange-money-site-web-senegal-guide-technique-2026 ; https://kolonell.com/fr/blog/cout-integration-mobile-money-api-comparatif-pays-2026
- Wave lance une carte virtuelle pour payer en ligne (janvier 2026) : https://fr.allafrica.com/stories/202601260227.html
- Programme public au Burkina Faso pour des sites web à bas coût pour les PME (signal d'un besoin reconnu) : https://www.wearetech.africa/fr/fils/breves/breves-simple/burkina-faso-la-maison-de-l-entreprise-et-l-abdi-s-associent-pour-offrir-des-site-web-a-moindre-cout-aux-pme
- Limite : **aucune statistique fiable** sur la part de PME sans site dans ces pays. Le baromètre CPCCAF 2025 existe mais n'a pas été lu en détail : https://cpccaf.org/wp-content/uploads/2026/01/25_CPCCAF-Barometre-de-lopinion-des-entreprises-africaines-francophones.pdf

**Concurrents.** Vendly (Côte d'Ivoire, plan gratuit jusqu'à 10 produits avec mobile money selon un guide), Kolonell (intégrateur), Shopify, WooCommerce, Wix, le catalogue WhatsApp Business natif. Agrégateurs de paiement : CinetPay, PayDunya.

**Solution proposée.** Une page boutique ultra-légère, faite pour le mobile : catalogue, panier, puis commande envoyée sur WhatsApp avec un récapitulatif, et lien de paiement Wave/Orange Money. Un tableau de bord liste les commandes et leur statut (payé, livré).

**MVP.** Site statique + petite base (Supabase ou Cloudflare D1, offres gratuites). Paiement **manuel** au départ : le vendeur colle son lien ou numéro Wave, et le client envoie la preuve de paiement. Pas d'intégration API avant d'avoir des utilisateurs. 1 à 2 semaines avec Claude Code/Codex.

**Monétisation possible.** Gratuit jusqu'à N produits ; abonnement mensuel en FCFA payé par Wave, avec nom de domaine propre et statistiques. Hypothèse **non testée** : 2 000 à 5 000 FCFA/mois. Autre option : la création de la boutique faite pour le client, payée une seule fois.

**Faisabilité gratuite.** Oui pour le MVP (hébergement gratuit, paiement manuel). L'intégration API Wave ou Orange Money demande un compte marchand avec vérification d'identité (KYC), probablement une entité locale.

**Risques.**
- Concurrence locale déjà présente (Vendly) et agences.
- Faible pouvoir d'achat ; difficulté à faire payer un abonnement.
- Encaissement pour le compte de tiers = réglementation des services de paiement (BCEAO) : **ne jamais détenir les fonds** des vendeurs dans le MVP.
- Données personnelles : lois locales (ex. Sénégal, Côte d'Ivoire) à vérifier.
- Le terrain compte : il faut des relais locaux pour la distribution.

**Premier test commercial gratuit.** Créer à la main 10 boutiques-liens pour 10 vendeurs Instagram/WhatsApp de Dakar ou d'Abidjan, contactés via leurs pages publiques, avec un message personnalisé et non automatisé. Mesurer sur 30 jours : commandes reçues via le lien, et combien acceptent de payer le mois suivant. Seuil indicatif : ≥3 vendeurs sur 10 paient.

---

## Idée 2 — Pré-audit d'accessibilité pour e-commerçants français et belges (EAA)

**Problème.** Depuis le 28 juin 2025, l'European Accessibility Act impose l'accessibilité aux sites de commerce en ligne dans l'UE. La DGCCRF a commencé ses contrôles, notamment après plaintes. Beaucoup de petits e-commerçants ne savent pas s'ils sont concernés ni par où commencer.

**Public cible.** E-commerçants de France, Belgique et Luxembourg **au-dessus du seuil de micro-entreprise**. Seuil à vérifier : les microentreprises (<10 salariés **et** ≤2 M€) seraient exemptées pour les services, et les sources se contredisent. Cibles : boutiques Shopify, WooCommerce et PrestaShop.

**Preuves et sources.**
- Entrée en application et obligations e-commerce, contrôles de la DGCCRF, note de décembre 2025 (cabinet Bird & Bird) : https://cm.twobirds.com/en/insights/2026/france/accessibilit-numrique--ce-qui-change-pour-les-sites-e-commerce-depuis-juin-2025
- Information gouvernementale : https://www.monparcourshandicap.gouv.fr/index.php/actualite/accessibilite-numerique-et-handicap-entree-en-vigueur-de-leaa ; https://entreprendre.service-public.gouv.fr/actualites/A18669?lang=en
- Bilan un an après : https://informations.handicap.fr/a-accessibilite-numerique-dans-l-ue-un-an-apres-quel-bilan-39387.php
- Belgique (Forbes BE) : https://www.forbes.be/fr/accessibilite-numerique-en-2025-nouvelles-regles-pour-le-secteur-prive/
- Limite : je n'ai trouvé **aucune donnée sur le taux de non-conformité** des PME, ni de preuve de sanctions. Un blog parle de premières poursuites en France, sans confirmation : https://testparty.ai/blog/first-european-accessibility-act-lawsuits-france-2025

**Concurrents.** Outils gratuits (Lighthouse, axe, WAVE, Asqatasun), agences d'accessibilité et auditeurs RGAA, surcouches de type accessiBe (critiquées : elles ne rendent pas un site conforme), plateformes SaaS (Siteimprove, etc.), iubenda et autres outils de conformité.

**Solution proposée.** Un site où l'on colle l'URL de sa boutique. Il produit un **pré-audit automatique en français** : erreurs détectables (contrastes, textes alternatifs, formulaires, navigation clavier), priorités, correctifs par plateforme (Shopify, WooCommerce), et modèle de déclaration d'accessibilité. L'outil indique clairement qu'un audit automatique ne couvre qu'une partie des critères.

**MVP.** Moteur axe-core + Playwright sur 5 pages types (accueil, catégorie, fiche produit, panier, paiement). Rapport HTML/PDF en français. Tourne sur une machine gratuite ou à bas coût. ~1 à 2 semaines.

**Monétisation possible.** Scan d'une page gratuit ; rapport complet payant à l'unité (hypothèse : 49–149 €), puis surveillance mensuelle (hypothèse : 19–49 €/mois). Mise en relation avec des auditeurs humains, en partenariat. **Prix non testés.**

**Faisabilité gratuite.** Oui : outils open source et hébergement gratuit pour un faible volume.

**Risques.**
- **Ne jamais promettre la « conformité »** : un outil automatique ne peut pas la garantir. Sinon, risque de pratique commerciale trompeuse.
- Marché déjà équipé d'outils gratuits ; la valeur doit venir des explications en français et des correctifs pas à pas.
- La pression dépend de contrôles réels et visibles ; s'ils restent rares, la demande sera faible.
- Scanner un site tiers : se limiter aux pages publiques et respecter robots.txt et les CGU.

**Premier test commercial gratuit.** Analyser 30 boutiques publiques (après vérification légale), puis envoyer à chacune un résumé personnalisé avec 3 problèmes concrets, en proposant le rapport complet. En B2B, la prospection par e-mail est encadrée (RGPD, CNIL) : utiliser des adresses professionnelles génériques et un lien de désinscription. Seuil indicatif : ≥3 rapports payés ou ≥10 % de réponses intéressées.

---

## Idée 3 — Vérificateur de français pour sites d'entreprises visant le Québec (Loi 96)

**Problème.** Au Québec, les sites web et communications commerciales des entreprises qui y exercent doivent être disponibles en français. La Charte modifiée s'applique largement, et la francisation concerne les entreprises de 25 employés et plus depuis le 1er juin 2025. Beaucoup de sites ont des pages, formulaires ou fiches produits restés en anglais.

**Public cible.** PME québécoises, et entreprises canadiennes hors Québec ou étrangères (e-commerce, SaaS) qui vendent au Québec.

**Preuves et sources.**
- Seuil abaissé à 25 employés depuis le 1er juin 2025 ; obligation d'informer et de servir en français, y compris sur le web (cabinets d'avocats) : https://www.blg.com/fr/insights/2025/ri/quebecs-new-language-law-changes-is-your-business-compliant ; https://gowlingwlg.com/fr/insights-resources/articles/2023/bill-96-s-french-first-rule-takes-effect
- FCEI (fédération des PME) : demande de délais par les détaillants, signe que la conformité est vécue comme une contrainte : https://www.cfib-fcei.ca/fr/medias/francisation-les-détaillants-québécois-réitèrent-leur-appel-à-un-délai-raisonnable?hs_amp=true ; https://www.cfib-fcei.ca/en/site/qc-law-14-bill-96
- Affichage, amendes jusqu'à 90 000 $ (selon Time Out, à vérifier) : https://www.timeout.com/fr/montreal/nouvelles/nouvelle-regle-affichage-en-francais-obligatoire-au-quebec-avec-des-amendes-pouvant-aller-jusqua-90000-060225
- Offres de services de traduction ciblant la Loi 96 (signal de marché) : https://www.rws.com/media/fr/Images/Quebec-Bill-96-service-sheet-rws-fr-ca-2025_tcm216-276203.pdf
- Limite : obligations exactes des sites (périmètre, exceptions) **non vérifiées auprès de l'OQLF**.

**Concurrents.** Weglot, Localize, plugins de traduction (WPML), agences de traduction (RWS, etc.), cabinets d'avocats, ressources gratuites de l'OQLF.

**Solution proposée.** Un site qui parcourt les pages publiques d'un domaine et détecte la langue de chaque bloc de texte, y compris boutons, formulaires, courriels transactionnels fournis et PDF. Il produit une liste des contenus non disponibles en français, triée par importance, avec une estimation de l'effort de traduction.

**MVP.** Robot d'exploration limité (≤100 pages) + détection de langue open source. Rapport par page ; export CSV pour le traducteur. ~1 semaine.

**Monétisation possible.** Scan de 10 pages gratuit ; rapport complet payant (hypothèse : 49–99 $ CA) ; surveillance mensuelle des nouvelles pages (hypothèse : 15–29 $ CA/mois) ; commission de partenariat avec des traducteurs. **Prix non testés.**

**Faisabilité gratuite.** Oui.

**Risques.**
- Dire « conforme » serait un conseil juridique : l'outil se limite à la **détection de contenu non français**.
- Weglot et ses concurrents peuvent ajouter une fonction similaire.
- Marché plus petit (Québec ≈ 8,5 millions d'habitants), mais à fort pouvoir d'achat.
- Respect des CGU et de robots.txt des sites analysés.

**Premier test commercial gratuit.** Publier un scanner gratuit limité à 10 pages, et le présenter dans des groupes d'entrepreneurs québécois et auprès de traducteurs indépendants (canal de distribution : ils revendent le rapport). Seuil indicatif : ≥50 scans et ≥5 demandes de rapport complet en 30 jours.

---

## Pistes écartées (pour l'instant)

| Piste | Pays | Pourquoi écartée |
|---|---|---|
| Outil de facturation électronique | France (réception obligatoire depuis le 1/09/2026, émission pour les TPE en 09/2027), Belgique (Peppol B2B depuis le 1/01/2026) | Il faut être plateforme agréée en France. Solutions gratuites existantes (CMA + Abby). Marché dominé par des éditeurs. Possible angle secondaire : contenu ou guide pour les ~20 % d'indépendants belges en retard (https://www.dhnet.be/conso/argent/2026/04/22/facturation-electronique-malgre-lobligation-20-des-independants-resistent-toujours-au-reseau-peppol-la-transition-a-ete-trop-abrupte-XUJ4NTM7ZREKJO5WH77SXEIFDA/). Sources France : https://banque.meilleurtaux.com/banque-en-ligne/actualites/2026-avril/facturation-electronique-reception-obligatoire-des-le-1er-septembre.html ; https://www.artisanat.fr/media/3163/download |
| Sites vitrines pour artisans | France | Marché saturé (agences, Wix, Pages Jaunes / Solocal) ; c'est un service, pas un SaaS récurrent. |
| Gestion de flotte pour PME africaines | Afrique francophone | Signal relevé (https://www.digitalbusiness.africa/digitalisation-de-la-gestion-de-flotte-des-vehicules-le-chantier-oublie-des-pme-africaines-francophones/), mais matériel GPS et vente terrain : pas réalisable gratuitement. |

## Classement

| Rang | Idée | Atout principal | Faiblesse principale |
|---|---|---|---|
| 1 | Boutique-lien WhatsApp + mobile money (Afrique de l'Ouest) | Besoin visible, comportements d'achat déjà en place, MVP gratuit | Payer un abonnement est difficile ; distribution sur le terrain ; réglementation des paiements |
| 2 | Pré-audit d'accessibilité EAA (FR/BE) | Obligation légale active, clients solvables | Outils gratuits déjà là ; pression réelle incertaine ; risque de promesse trompeuse |
| 3 | Vérificateur français Loi 96 (Québec) | Créneau étroit et clair, partenariat possible avec des traducteurs | Marché plus petit ; périmètre légal à vérifier |

L'ordre peut s'inverser selon ton accès au terrain : sans contacts à Dakar ou Abidjan, l'idée 2 ou 3 est plus simple à tester à distance.

## Étapes suivantes suggérées

1. Choisir **une** idée et lancer son test gratuit avant de coder plus que le MVP.
2. Lire les sources officielles : DGCCRF/RGAA (idée 2), OQLF (idée 3), BCEAO et docs Wave Business (idée 1).
3. Étendre la recherche au Maghreb (Maroc, Tunisie, Algérie) et à la Suisse romande, non couverts ici.
