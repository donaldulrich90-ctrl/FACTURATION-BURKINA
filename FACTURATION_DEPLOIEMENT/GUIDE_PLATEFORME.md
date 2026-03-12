# Guide de la plateforme FasoMarchés

## Vue d'ensemble

**FasoMarchés** est une plateforme de gestion pour les entreprises au Burkina Faso et dans l'espace UEMOA. Elle centralise la facturation, les quittances (QSL), la mercuriale des prix, les marchés publics, les documents administratifs et bien d'autres modules métier.

---

## Démarrage

### Lancement rapide

1. Double-cliquez sur **`LANCER.bat`** à la racine du projet.
2. Le script va :
   - Vérifier Node.js
   - Libérer les ports 3001 (API) et 5173 (Frontend)
   - Installer les dépendances si nécessaire
   - Créer la base de données SQLite et les données initiales
   - Démarrer l'API et le frontend
3. Le navigateur s'ouvre automatiquement sur **http://localhost:5173**

### Connexion par défaut

- **Email :** `admin@plateforme.com`
- **Mot de passe :** `admin123`

---

## Rôles et accès

| Rôle | Accès | Description |
|------|-------|-------------|
| **Super Admin** | `/admin` | Gestion globale : entreprises, abonnements, plans tarifaires, mercuriale de référence |
| **Company Admin** (Gérant) | `/company` + `/app` | Administration de l'entreprise, utilisateurs, en-tête de facture, tâches assignées |
| **Company User** | `/app` | Accès aux modules selon les tâches assignées par le gérant |

---

## Structure des pages

### 1. Page Super Admin (`/admin`)

- **Entreprises** : Création, modification, suppression d'entreprises
- **Abonnements** : Gestion des abonnements (actif, expiré, annulé), gains totaux
- **Plans tarifaires** : Création et édition des forfaits (gratuit, standard, pro, etc.)
- **Mercuriale** : Import CSV/Word des prix de référence par région
- **Régions** : 17 régions du Burkina (Ouagadougou, Bobo-Dioulasso, etc.)

### 2. Page Company Admin (`/company`)

- **Profil entreprise** : Nom, IFU, RCCM, régime fiscal, adresse, contact, gérant
- **En-tête de facture** : Logo, signature, cachet (images base64)
- **Utilisateurs** : Ajout, modification des collaborateurs
- **Tâches assignées** : Attribution des modules accessibles à chaque utilisateur (Facturation, Mercuriale, Marchés, RH, etc.)

### 3. Page principale – Facturation (`/app`)

Module central avec **12 onglets** :

| Onglet | Description |
|--------|-------------|
| **Tableau de bord** | Annonces du gérant, alertes, chiffre d'affaires, factures récentes |
| **Appels d'Offres BF** | Consultation des appels d'offres publics au Burkina |
| **Simulation & estimation** | Simulation de marchés, dépenses, marges bénéficiaires |
| **Mercuriale Prix** | Base de prix par région, import CSV/Word, recherche, ajout à la facture |
| **Facturation** | Création de factures (proforma, définitive, BL), clients, lignes, TVA, AIRSI |
| **Suivi Paiements** | Liste des factures, statuts (brouillon, envoyée, payée), édition |
| **Documents administratifs** | Demande d'attestations (fiscale, RCCM, CNSS, etc.) |
| **Montage DAO** | Modèles de Dossiers d'Appel d'Offres (fourniture, prestations, travaux) |
| **Gestion RH** | Effectifs, contrats, congés, paie |
| **Gestion Comptabilité** | Journal, plan comptable, balance, rapports |
| **Impôts & droits Burkina** | TVA, IUTS, CNSS, RTS, droit du travail, liens officiels |
| **Archives marchés exécutés** | Marchés archivés avec documents scannés |

### 4. Page Quittances (`/quittances`)

- **Quittances QSL** : Preuve de paiement liée à une facture
- Création de quittances (date, montant, mode de paiement, référence bancaire)
- Liste des quittances émises

---

## Flux de travail principaux

### Facturation

1. **Carnet d'adresses** : Créer des clients (raison sociale, IFU, RCCM, direction)
2. **Mercuriale** : Charger les prix par région, rechercher un article, l'ajouter à la facture
3. **Créer une facture** : Proforma → Définitive → Bon de livraison (chaîne de documents)
4. **Calculs automatiques** : TVA (18 %), AIRSI (0 %, 2 %, 5 %), totaux HT/TTC
5. **Export PDF** : Téléchargement de la facture au format PDF

### Quittances

1. Une facture peut avoir **une quittance** (preuve de paiement)
2. Saisir : facture concernée, date de paiement, montant, mode (virement, espèces, chèque)
3. La quittance est liée à la facture pour le suivi

### Marchés et simulation

1. **Marché** : Référence, titre, entité (donneur d'ordre), budget estimé, région
2. **Dépenses** : Enregistrement, timbres, papiers admin, etc.
3. **Simulation** : Articles avec prix d'achat / prix de vente pour calcul de marge

---

## Base de données

- **SQLite** (`server/prisma/dev.db`) en développement
- **Prisma** pour le schéma et les migrations
- Modèles principaux : `Company`, `User`, `Facture`, `FactureItem`, `Quittance`, `Client`, `Marche`, `MercurialeArticle`, `Region`, etc.

---

## API (serveur)

- **Port** : 3001
- **Routes** : `/api/auth`, `/api/companies`, `/api/factures`, `/api/quittances`, `/api/mercuriale`, `/api/marches`, `/api/clients`, `/api/simulations`, `/api/announcements`, `/api/chat`, etc.
- **Authentification** : JWT (token dans les en-têtes)
- **WebSocket** : Socket.io pour le chat en temps réel

---

## Fichiers importants

| Fichier | Rôle |
|---------|------|
| `LANCER.bat` | Script de démarrage tout-en-un |
| `src/App.jsx` | Routes et protection des pages |
| `src/pages/Facturation.jsx` | Page principale avec tous les onglets |
| `src/pages/Quittances.jsx` | Module Quittances QSL |
| `server/prisma/schema.prisma` | Schéma de la base de données |
| `server/src/index.js` | Point d'entrée de l'API |
| `src/api/client.js` | Client API (fetch) |
| `src/context/AuthContext.jsx` | Contexte d'authentification |
| `src/context/MercurialeContext.jsx` | Contexte mercuriale (prix par région) |

---

## Mise à jour depuis le dépôt distant

```bash
git pull origin main
```

Si des conflits apparaissent, résolvez-les puis :

```bash
git add .
git commit -m "Résolution des conflits"
```

---

## Mode démo / hors ligne

Si le serveur n'est pas accessible, l'application fonctionne en **mode démo** avec des données locales limitées. Les fonctionnalités complètes nécessitent que le serveur soit lancé (via `LANCER.bat`).

---

## Assistant IA

Un assistant virtuel (chatbot) répond aux questions des utilisateurs et les guide dans l'utilisation de la plateforme :

- **Page de connexion** : pour les prospects qui veulent découvrir FasoMarchés
- **Une fois connecté** : pour guider les utilisateurs dans leurs tâches

**Activation :** Ajoutez `OPENAI_API_KEY` dans `server/.env` (clé créée sur https://platform.openai.com/api-keys). Sans clé, un message invitera à consulter le guide.

---

## PWA (Progressive Web App)

La plateforme est installable comme une application sur mobile ou bureau. Un bandeau propose l'installation lorsque les conditions sont remplies.

---

*Document généré pour FasoMarchés – Plateforme de gestion Burkina Faso / UEMOA*
