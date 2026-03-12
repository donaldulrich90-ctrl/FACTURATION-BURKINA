# Déploiement FasoMarchés sur ordinateur dédié (24h/24)

Ce guide explique comment transférer et installer FasoMarchés sur un ordinateur qui ne s'éteint jamais, pour avoir la plateforme accessible en ligne à tout moment.

---

## Étape 1 : Sur votre ordinateur actuel (préparation)

### 1.1 Lancer le script de préparation

Double-cliquez sur **`PREPARER_DEPLOIEMENT.bat`** à la racine du projet.

Ce script va :
- Créer un dossier `FACTURATION_DEPLOIEMENT` avec tout le nécessaire
- Copier le code source (sans node_modules pour alléger)
- **Inclure votre base de données actuelle** (dev.db) pour conserver vos factures, clients, etc.
- Construire le frontend (build)
- Créer le fichier de configuration serveur

### 1.2 Transférer le dossier

Copiez le dossier **`FACTURATION_DEPLOIEMENT`** sur l'autre ordinateur via :
- **Clé USB**
- **Partage réseau** (dossier partagé, OneDrive, etc.)
- **Disque externe**

---

## Étape 2 : Sur l'ordinateur dédié (installation)

### 2.1 Prérequis : Node.js

1. Téléchargez Node.js LTS : **https://nodejs.org**
2. Installez-le (cochez "Add to PATH" si proposé)
3. Redémarrez l'ordinateur si nécessaire
4. Vérifiez : ouvrez une invite de commandes et tapez `node -v` → doit afficher une version (ex. v20.x.x)

### 2.2 Installation et démarrage

1. Placez le dossier `FACTURATION_DEPLOIEMENT` où vous voulez (ex. `C:\FasoMarches`)
2. **Double-cliquez sur `INSTALLER_ET_LANCER.bat`**
3. Au premier lancement, le script va :
   - Installer les dépendances (npm install)
   - Créer la base de données si nécessaire
   - Démarrer le serveur

4. Une fenêtre noire s'ouvre : **gardez-la ouverte**. C'est le serveur.

### 2.3 Accéder à l'application

- **Sur la machine** : ouvrez un navigateur → **http://localhost:3001**
- **Depuis le réseau** : **http://IP_DE_LA_MACHINE:3001**  
  (Pour connaître l'IP : `ipconfig` dans l'invite de commandes, cherchez "Adresse IPv4")

**Connexion par défaut :**
- Email : `admin@plateforme.com`
- Mot de passe : `admin123`

---

## Étape 3 : Accès depuis Internet (optionnel)

Pour que des utilisateurs accèdent depuis l'extérieur (4G, autre bureau, etc.) :

### Option A : Redirection de port (MikroTik ou routeur)

1. Configurez votre routeur pour rediriger le port 3001 vers l'IP de l'ordinateur dédié
2. Voir **DEPLOIEMENT_MIKROTIK.md** pour les commandes MikroTik
3. Accès : `http://VOTRE_IP_PUBLIQUE:3001`

### Option B : Tunnel Cloudflare (sans ouvrir de port)

1. Téléchargez **cloudflared** : https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
2. Lancez : `cloudflared tunnel --url http://localhost:3001`
3. Vous obtiendrez une URL du type `https://xxx.trycloudflare.com` à partager

---

## Démarrage automatique au démarrage de Windows

Pour que FasoMarchés démarre automatiquement quand l'ordinateur s'allume :

### Méthode 1 : Dossier Démarrage (simple)

1. Appuyez sur **Win + R**, tapez `shell:startup`, Entrée
2. Créez un raccourci vers `INSTALLER_ET_LANCER.bat` dans ce dossier
3. Ou créez un fichier `.bat` dans le dossier Démarrage avec :

```batch
@echo off
cd /d "C:\FasoMarches"
start "FasoMarchés" cmd /k "cd server && set NODE_ENV=production && node src/index.js"
```

*(Remplacez `C:\FasoMarches` par le chemin réel du dossier)*

### Méthode 2 : Tâche planifiée

1. Ouvrez **Planificateur de tâches** (taskschd.msc)
2. Créer une tâche → Déclencheur : "Au démarrage"
3. Action : Démarrer un programme → `cmd.exe`  
   Arguments : `/c cd /d C:\FasoMarches\server && set NODE_ENV=production && node src/index.js`

---

## Sécurité recommandée

1. **Changez le mot de passe admin** après la première connexion
2. **JWT_SECRET** : modifiez `server\.env` et mettez une clé longue et aléatoire
3. **Sauvegardes** : copiez régulièrement `server\prisma\dev.db` vers un emplacement sûr
4. **Pare-feu** : autorisez le port 3001 (entrée) pour le serveur Node

---

## Dépannage

| Problème | Solution |
|----------|----------|
| Node.js introuvable | Installez Node.js depuis nodejs.org et redémarrez |
| Port 3001 déjà utilisé | Fermez l'autre instance ou changez PORT dans server\.env |
| npm install échoue | Essayez `npm install --legacy-peer-deps` |
| Page blanche | Vérifiez que `dist\index.html` existe (relancez `npm run build`) |
| Connexion refusée depuis le réseau | Pare-feu Windows : autorisez Node.js sur le port 3001 |

---

## Résumé

| Étape | Action |
|-------|--------|
| 1 | Sur PC actuel : lancer `PREPARER_DEPLOIEMENT.bat` |
| 2 | Transférer le dossier `FACTURATION_DEPLOIEMENT` |
| 3 | Sur PC dédié : installer Node.js |
| 4 | Double-cliquer sur `INSTALLER_ET_LANCER.bat` |
| 5 | Accéder à http://localhost:3001 ou http://IP:3001 |
