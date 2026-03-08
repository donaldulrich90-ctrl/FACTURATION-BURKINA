# Guide de sécurisation FasoMarchés

## Mesures déjà implémentées

- **Helmet** : en-têtes de sécurité (X-Content-Type-Options, X-Frame-Options, etc.)
- **Rate limiting** : 5 tentatives de connexion / 15 min, 200 requêtes API / 15 min par IP
- **Politique mot de passe** : minimum 8 caractères pour le changement
- **JWT_SECRET** : refus de démarrage en production si non défini ou valeur par défaut

---

## Mesures à appliquer

### 1. Variables d'environnement (obligatoire en production)

Créez ou modifiez `server/.env` :

```env
# OBLIGATOIRE en production — générez une clé forte (ex: openssl rand -base64 32)
JWT_SECRET=votre-cle-secrete-tres-longue-et-aleatoire

# Optionnel
JWT_EXPIRES_IN=7d
PORT=3001
DATABASE_URL="file:./dev.db"
NODE_ENV=production
```

**Ne jamais** commiter le fichier `.env` (déjà dans .gitignore).

---

### 2. Mot de passe Super Admin

Le compte `admin@plateforme.com` est créé par le seed avec le mot de passe `admin123`.

**À faire immédiatement après la première connexion :**
1. Cliquez sur l'icône clé (changer mot de passe)
2. Choisissez un mot de passe fort (12+ caractères, majuscules, chiffres, symboles)

---

### 3. Politique des mots de passe

- **Minimum 8 caractères** (recommandé : 12+)
- Mélanger lettres, chiffres et symboles
- Ne pas réutiliser d'anciens mots de passe

---

### 4. HTTPS en production

En production, servez l'application **uniquement en HTTPS** :
- Utilisez un reverse proxy (Nginx, Caddy) avec certificat SSL (Let's Encrypt)
- Ou un hébergeur qui gère HTTPS (Render, Railway, etc.)

---

### 5. CORS

En production, restreignez les origines autorisées dans `server/src/index.js` :

```javascript
// Au lieu de origin: true (toutes origines)
app.use(cors({ origin: ['https://votre-domaine.com'], credentials: true }));
```

---

### 6. Limitation des tentatives de connexion (rate limiting)

Installez `express-rate-limit` et limitez les requêtes sur `/api/auth/login` pour éviter les attaques par force brute.

---

### 7. En-têtes de sécurité (Helmet)

Utilisez le package `helmet` pour ajouter automatiquement des en-têtes de sécurité (X-Content-Type-Options, X-Frame-Options, etc.).

---

### 8. Stockage du token JWT

Actuellement le token est dans `localStorage` (vulnérable au XSS). En production avec HTTPS, les **cookies HttpOnly** sont plus sûrs. Cela nécessite des modifications côté API et frontend.

---

### 9. Sauvegardes

- Sauvegardez régulièrement `server/prisma/dev.db`
- En production, utilisez PostgreSQL ou MySQL plutôt que SQLite pour plus de robustesse

---

### 10. Mises à jour

- Mettez à jour régulièrement les dépendances : `npm audit` et `npm update`
- Surveillez les vulnérabilités connues

---

## Checklist rapide

- [ ] JWT_SECRET fort et unique en production
- [ ] Mot de passe Super Admin changé après première connexion
- [ ] HTTPS activé en production
- [ ] CORS restreint aux domaines autorisés
- [ ] Rate limiting sur le login
- [ ] Helmet activé
- [ ] .env jamais versionné
- [ ] Sauvegardes de la base de données
