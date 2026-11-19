# Lancer Clip Factory sur ton Mac (le plus simple)

## Une seule fois : installer
1. Installe **Homebrew** si tu ne l'as pas : ouvre l'app **Terminal**, colle la commande affichée sur https://brew.sh, Entrée.
2. Dans le Terminal, copie-colle :
   ```bash
   cd ~ && git clone -b claude/pensive-maxwell-nxlmw9 https://github.com/ilandasilva028-art/il4N.git && open il4N/twitch-clips
   ```
   (le dépôt est privé : GitHub te demandera de te connecter).

## Chaque fois : lancer
- Dans le dossier `twitch-clips` qui s'est ouvert, **double-clique sur « Clip Factory.command »**.
  - La 1re fois, macOS peut bloquer le fichier : clic droit → **Ouvrir** → **Ouvrir**.
  - La 1re fois aussi, l'installation se fait toute seule (10-20 min : ffmpeg, Node, Python, modèles).
- Le tableau de bord s'ouvre dans ton navigateur.
- **Sur l'iPhone** (même Wi-Fi) : scanne le **QR code** affiché dans le Terminal avec l'appareil photo → connecté directement.
- Pour arrêter : double-clique sur **« Arrêter Clip Factory.command »**.

Le jeton d'accès est créé automatiquement (`output/.dashboard_token`) : sans lui, personne d'autre sur le Wi-Fi ne peut ouvrir ton tableau de bord.
