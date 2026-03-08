# Installation FasoMarchés — Sur un autre ordinateur

Ce guide explique comment installer et lancer FasoMarchés sur un nouvel ordinateur.

---

## Prérequis

1. **Node.js** (version LTS recommandée)
   - Téléchargement : https://nodejs.org
   - Vérification : ouvrez un terminal et tapez `node -v`

2. **Optionnel** : Python (pour l’extraction de fichiers Word dans les imports mercuriale)

---

## Méthode 1 : Copier le dossier (la plus simple)

1. **Copiez le projet**  
   Copiez tout le dossier `FACTURATION` sur l’autre ordinateur (clé USB, partage réseau, etc.).

2. **Vous pouvez exclure** (optionnel, pour alléger) :
   - `node_modules/` et `server/node_modules/` (seront réinstallés automatiquement)
   - `dist/` (sera régénéré)
   - `server/prisma/dev.db` (base vide recréée automatiquement)

3. **Lancez l’installation**  
   Double-cliquez sur `LANCER.bat` à la racine du projet.  
   Le script va :
   - installer les dépendances frontend et serveur
   - créer la base de données
   - démarrer l’API et le frontend
   - ouvrir le navigateur sur http://localhost:5173

4. **Connexion par défaut**
   - Email : `admin@plateforme.com`
   - Mot de passe : `admin123`

---

## Méthode 2 : Avec Git (si le projet est versionné)

Sur le nouvel ordinateur :

```bash
git clone <URL_DU_DEPOT> FACTURATION
cd FACTURATION
```

Puis double-cliquez sur `LANCER.bat`.

---

## Méthode 3 : Déploiement en production (une seule URL)

Pour un usage en production (un seul port, une seule adresse) :

1. Créez `server/.env` avec par exemple :

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="votre-secret-long-et-securise"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=production
```

2. Lancez le build et le serveur :

```bash
npm run build
cd server
npx prisma generate
npx prisma db push
npm run db:seed
set NODE_ENV=production
node src/index.js
```

3. Accédez à l’application sur : **http://localhost:3001**

---

## Assistant IA (optionnel)

Pour activer l’assistant IA, ajoutez dans `server/.env` :

```
GROQ_API_KEY=votre_cle_groq
```

ou

```
OPENAI_API_KEY=votre_cle_openai
```

---

## Résumé rapide

| Étape | Action |
|-------|--------|
| 1 | Installer Node.js sur le nouvel ordinateur |
| 2 | Copier le dossier FACTURATION |
| 3 | Double-cliquer sur `LANCER.bat` |
| 4 | Se connecter avec `admin@plateforme.com` / `admin123` |

---

## Dépannage

- **Node.js introuvable** : installez Node.js depuis https://nodejs.org et redémarrez le terminal.
- **Port déjà utilisé** : `LANCER.bat` tente de libérer les ports 3001 et 5173. Fermez les autres instances de FasoMarchés avant de relancer.
- **Erreur npm install** : essayez `npm install --legacy-peer-deps` manuellement à la racine et dans `server/`.
