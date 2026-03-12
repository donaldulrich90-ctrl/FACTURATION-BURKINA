# Mettre FasoMarchés en ligne (lien de test)

Pour partager un **lien** permettant de tester l’application en ligne, vous pouvez déployer sur un hébergeur gratuit. Une seule URL servira à la fois l’interface et l’API.

---

## Option 1 : Render (gratuit, recommandé)

1. **Compte**  
   Créez un compte sur [render.com](https://render.com) (gratuit).

2. **Nouveau Web Service**  
   - Dashboard → **New** → **Web Service**
   - Connectez votre dépôt **GitHub** (ou importez le projet)
   - Choisissez le dépôt **FACTURATION** (FasoMarchés)

3. **Paramètres du service**
   - **Name** : `fasomarches` (ou autre)
   - **Region** : Frankfurt (ou le plus proche)
   - **Branch** : `main` (ou votre branche)
   - **Root Directory** : laisser vide (racine du projet)
   - **Runtime** : `Node`
   - **Build Command** :  
     `npm install && npm run build && cd server && npm install && npx prisma generate && npx prisma db push`
   - **Start Command** :  
     `cd server && node src/index.js`
   - **Variables d’environnement** (Environment) :
     - `NODE_ENV` = `production`
     - `DATABASE_URL` = `file:./dev.db` (SQLite par défaut)
     - `JWT_SECRET` = clé longue et aléatoire (obligatoire)
     - `SUBSCRIPTION_EXPIRE_INTERVAL_MS` = `3600000` (optionnel : expiration auto des abonnements)

4. **Déploiement**  
   Cliquez sur **Create Web Service**. Render build puis démarre l’app.

5. **Lien**  
   Une fois le déploiement terminé, Render vous donne une URL du type :  
   **https://fasomarches-xxxx.onrender.com**  
   C’est ce lien que vous pouvez partager pour tester.

**Important** : Sur l’offre gratuite Render, le serveur “s’endort” après inactivité. Le premier chargement peut prendre 30–60 secondes. Les données SQLite peuvent être réinitialisées lors d’un redéploiement (pour un vrai environnement persistant, il faudrait une base PostgreSQL).

**Extraction Word (mercuriale)** : Pour une extraction plus fiable des tableaux Word, installez Python avec `python-docx`, `pandas` et `tqdm`. Le serveur utilisera automatiquement `convertisseur.py` en priorité. Sinon, l'extraction mammoth (Node.js) est utilisée.

---

## Option 2 : Lancer en local et exposer avec un tunnel (test rapide)

Si vous voulez juste un lien temporaire sans créer de compte :

1. **Installer un outil de tunnel** (une fois) :
   - [ngrok](https://ngrok.com) : `ngrok http 3001`
   - ou [localtunnel](https://localtunnel.github.io/www/) : `npx localtunnel --port 3001`

2. **Démarrer l’app en “production” sur votre PC** :
   ```bash
   npm run build
   cd server
   set NODE_ENV=production
   node src/index.js
   ```
   (Sous Linux/Mac : `export NODE_ENV=production` puis `node src/index.js`.)

3. **Lancer le tunnel** (dans un autre terminal) :
   ```bash
   npx localtunnel --port 3001
   ```
   Vous obtiendrez une URL du type **https://xxx.loca.lt** à partager.  
   Tant que votre PC et le tunnel restent ouverts, le lien fonctionne.

---

## Option 3 : Railway (gratuit avec limite)

1. Compte sur [railway.app](https://railway.app).
2. **New Project** → **Deploy from GitHub** → sélectionnez le dépôt.
3. **Variables** : `NODE_ENV=production`.
4. **Build** : même commande que Render. **Start** : `cd server && node src/index.js`.
5. Railway fournit une URL publique (ex. `https://votre-app.up.railway.app`).

---

## Résumé

| Méthode        | Lien permanent | Effort | Idéal pour           |
|----------------|----------------|--------|----------------------|
| **Render**     | Oui            | Moyen  | Partager un lien de test |
| **Tunnel (ngrok/lt)** | Non (temporaire) | Faible | Test très rapide     |
| **Railway**    | Oui            | Moyen  | Alternative à Render |

Après déploiement, envoyez simplement l’URL (ex. **https://votre-app.onrender.com**) aux personnes qui doivent tester ; elles pourront se connecter et utiliser l’application comme en local.
