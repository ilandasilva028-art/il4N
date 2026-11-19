# Mettre Clip Factory en ligne 24 h/24 (gratuit, Oracle Cloud)

Durée : ~30 min la première fois. Coût : 0 € (offre « Always Free »). Une carte bancaire est demandée
pour vérifier l'identité ; rien n'est débité tant que tu restes dans l'offre gratuite.

## 1. Créer le compte
1. Va sur **https://signup.cloud.oracle.com** et crée un compte (choisis une région proche, ex. *France Central (Paris)*
   ou *Germany Central (Frankfurt)* ; on ne peut plus la changer ensuite).

## 2. Créer la machine
1. Menu ☰ → **Compute** → **Instances** → **Create instance**.
2. **Image** : *Canonical Ubuntu 24.04*.
3. **Shape** : *Change shape* → **Ampere** → `VM.Standard.A1.Flex` → **4 OCPU, 24 GB** (gratuit).
   S'il affiche « Out of capacity », réessaie plus tard ou prends 2 OCPU / 12 GB.
4. **Add SSH keys** : *Generate a key pair for me* → **télécharge la clé privée** (fichier `.key`), garde-la.
5. **Create**. Note l'**adresse IP publique** affichée (ex. `152.70.12.34`).

## 3. Ouvrir les ports 80 et 443 (sinon le site ne s'affiche pas)
1. Sur la page de l'instance : clique le **subnet** → **Security Lists** → *Default Security List*.
2. **Add Ingress Rules** : Source CIDR `0.0.0.0/0`, protocole TCP, **Destination port range `80,443`** → *Add*.

## 4. Se connecter à la machine (depuis le Mac)
Dans le **Terminal** du Mac (remplace le nom du fichier et l'IP) :
```bash
chmod 600 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@152.70.12.34
```
Réponds `yes` à la première question.

## 5. Installer Clip Factory (une seule commande)
Le dépôt est privé : crée d'abord un jeton GitHub en lecture seule
(GitHub → Settings → Developer settings → *Fine-grained tokens* → *Generate* → dépôt `il4N`, permission *Contents: Read*).
Puis, dans la session SSH :
```bash
git clone -b claude/pensive-maxwell-nxlmw9 https://github.com/ilandasilva028-art/il4N.git && cd il4N/twitch-clips && bash deploy/setup_server.sh
```
(quand Git demande le mot de passe, colle le **jeton GitHub**, pas ton mot de passe).

À la fin, le Terminal affiche **un lien https et un QR code** : scanne-le avec l'iPhone → tu es connecté.
Ajoute la page à l'écran d'accueil (Partager → *Sur l'écran d'accueil*) pour l'ouvrir comme une app.

## Ensuite
- Tout redémarre seul si la machine redémarre.
- Mettre à jour : `cd ~/il4N && git pull && cd twitch-clips && bash install.sh && sudo systemctl restart clipfactory-engine clipfactory-api clipfactory-web`
- Voir l'état : `sudo systemctl status clipfactory-*` ou la page Vue d'ensemble.
- Rappel : les chaînes restent en mode « repérage » tant que tu n'as pas l'accord des créateurs.
