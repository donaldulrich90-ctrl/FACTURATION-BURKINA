# Synchroniser les mercuriales locales vers la plateforme en ligne

Ce guide explique comment transférer les mercuriales que vous avez importées en local vers la plateforme déployée (Render).

## Prérequis

- LANCER.bat a été utilisé pour importer des mercuriales (CSV, Word) en local
- La plateforme en ligne est déployée et accessible (ex. https://facturation-burkina.onrender.com)
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
ONLINE_URL=https://facturation-burkina.onrender.com
JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Remplacez l’URL par celle de votre plateforme et collez le token copié.

### 3. Lancer la synchronisation

Dans un terminal, à la racine du projet :

```bash
cd server
npm run sync:mercuriale-online
```

Ou directement :

```bash
cd server
node scripts/sync-mercuriale-to-online.js
```

### 4. Résultat

Le script affiche le nombre d’articles synchronisés par région. Les mercuriales locales (template) sont envoyées vers la plateforme en ligne.

## Notes

- **Token expiré** : Le JWT expire après 7 jours. En cas d’erreur 401, reconnectez-vous en ligne et récupérez un nouveau token.
- **Régions** : Seules les régions ayant des articles en local sont synchronisées.
- **Remplacement** : Les données en ligne sont remplacées par celles du local pour chaque région synchronisée.
