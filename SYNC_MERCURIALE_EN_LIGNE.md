# Synchroniser les données locales vers la plateforme en ligne

Ce guide explique comment transférer les mercuriales et les entreprises de votre base locale vers la plateforme déployée (Render).

## Prérequis

- LANCER.bat a été utilisé pour importer des mercuriales (CSV, Word) en local
- La plateforme en ligne est déployée et accessible (ex. https://fasomarche.duckdns.org ou https://facturation-burkina.onrender.com)
- Vous avez un compte Super Admin (admin@plateforme.com)

## Étapes

### 1. Obtenir le token JWT

1. Ouvrez la plateforme en ligne dans votre navigateur
2. Connectez-vous avec **admin@plateforme.com** / **admin123**
3. Appuyez sur **F12** (outils développeur)
4. Allez dans **Application** (Chrome) ou **Stockage** (Firefox)
5. Cliquez sur **Local Storage** → votre domaine
6. Trouvez la clé **fasomarches_token** et copiez sa valeur (le token commence souvent par `eyJ...`)

### 2. Configurer les variables

Ouvrez `server/.env` et ajoutez :

```
ONLINE_URL=https://fasomarche.duckdns.org
JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Remplacez l’URL par celle de votre plateforme et collez le token copié.

### 3. Lancer la synchronisation

**Mercuriales uniquement :**

```bash
cd server
npm run sync:mercuriale-online
```

**Entreprises uniquement :**

```bash
cd server
npm run sync:entreprises-online
```

**Tout (mercuriales + entreprises + données) :**

```bash
cd server
npm run sync:all-online
```

**Entreprises avec leurs données (clients, marchés, factures, quittances) :**

```bash
cd server
npm run sync:entreprises-donnees-online
```

### 4. Résultat

- **Mercuriales** : le script affiche le nombre d’articles synchronisés par région.
- **Entreprises** : chaque entreprise locale (hors template) est créée en ligne avec son admin et ses mercuriales copiées. Mot de passe temporaire : `ChangeMe123!` — les utilisateurs devront le changer à la première connexion.
- **Données** (avec `sync:entreprises-donnees-online` ou `sync:all-online`) : clients, marchés, factures et quittances sont également synchronisés pour chaque entreprise.

### 5. Accéder aux comptes synchronisés

Les comptes synchronisés existent **uniquement sur la plateforme en ligne**. Ne vous connectez **pas** sur localhost.

1. Ouvrez **https://fasomarche.duckdns.org** (ou votre URL de plateforme)
2. Utilisez l'**email admin** de chaque entreprise
3. Mot de passe temporaire : **`ChangeMe123!`**
4. Changez le mot de passe à la première connexion

Pour afficher les identifiants de toutes les entreprises :

```bash
cd server
npm run list:credentials
```

## Notes

- **Token expiré** : Le JWT expire après 7 jours. En cas d’erreur 401, reconnectez-vous en ligne et récupérez un nouveau token.
- **Mercuriales** : Seules les régions ayant des articles en local sont synchronisées. Les données en ligne sont remplacées par celles du local.
- **Entreprises** : Les entreprises déjà présentes en ligne (même email) sont ignorées. Ordre recommandé : lancer d'abord `sync:mercuriale-online`, puis `sync:entreprises-donnees-online` (ou `sync:all-online` pour tout faire).
