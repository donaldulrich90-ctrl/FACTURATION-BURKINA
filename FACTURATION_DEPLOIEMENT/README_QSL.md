# FasoMarchés — Version QSL (Base serveur multi-utilisateurs)

## Architecture

- **Backend** : Node.js + Express + Prisma + PostgreSQL
- **Frontend** : React + Vite + Tailwind
- **QSL** : Module Quittances (preuve de paiement) au cœur du système

## Prérequis

- Node.js 18+
- PostgreSQL 14+
- npm

## Installation

### 1. Base de données

Créez une base PostgreSQL :

```sql
CREATE DATABASE fasomarches;
```

### 2. Backend

```bash
cd server
cp .env.example .env
# Éditez .env : DATABASE_URL, JWT_SECRET

npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Le serveur tourne sur **http://localhost:3001**.

### 3. Frontend

```bash
cd ..
npm install
npm run dev
```

L’application tourne sur **http://localhost:5173**.

## Comptes de test (après seed)

| Rôle            | Email                 | Mot de passe |
|-----------------|-----------------------|--------------|
| Super Admin     | admin@plateforme.com  | admin123     |
| Admin entreprise| admin@alpha.bf       | alpha123     |

## API principales

| Méthode | Route                    | Description            |
|---------|--------------------------|------------------------|
| POST    | /api/auth/login          | Connexion              |
| GET     | /api/auth/me             | Utilisateur courant    |
| GET     | /api/companies           | Liste entreprises      |
| GET     | /api/mercuriale/:regionId| Articles mercuriale    |
| GET     | /api/factures            | Liste factures         |
| POST    | /api/factures            | Créer facture          |
| GET     | /api/quittances          | Liste quittances (QSL) |
| POST    | /api/quittances          | Émettre quittance      |

## Module QSL (Quittances)

1. Créer une facture (onglet Facturation)
2. Quand le client paie : **Quittances QSL** → Émettre une quittance
3. La facture passe automatiquement en statut « payée »
4. La quittance sert de preuve de paiement

## Structure des dossiers

```
FACTURATION/
├── server/           # Backend Node.js
│   ├── prisma/       # Schéma DB + seed
│   └── src/
│       ├── routes/   # API (auth, companies, mercuriale, factures, quittances)
│       └── middleware/
├── src/              # Frontend React
│   ├── api/          # Client API
│   ├── context/
│   └── pages/
└── docs/
```
