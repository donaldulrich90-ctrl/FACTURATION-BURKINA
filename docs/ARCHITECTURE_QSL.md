# Architecture FasoMarchés - Base QSL (Quittances)

## Vue d'ensemble

Application **multi-utilisateurs** avec backend serveur et base PostgreSQL. Le module **QSL (Quittances)** est au cœur : preuve de paiement, suivi, conformité marchés publics.

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| **Backend** | Node.js, Express, Prisma |
| **Base de données** | PostgreSQL |
| **Auth** | JWT (access + refresh) |
| **Frontend** | React, Vite, Tailwind (existant) |

## Schéma de la base de données

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  companies  │────<│   users     │     │subscriptions│
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       ▼                    │                    │
┌─────────────┐             │             ┌──────┴──────┐
│   regions   │             │             │  companyId  │
└─────────────┘             │             └─────────────┘
       │                    │
       ▼                    │
┌─────────────────┐         │
│mercuriale_articles│        │
└─────────────────┘         │
       │                    │
       ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  factures   │────<│ facture_items│     │  quittances │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    ▲
       └────────────────────┴────────────────────┘
              (QSL : quittance liée à facture payée)
```

## Entités principales

### 1. Entreprises & utilisateurs
- **companies** : raison sociale, IFU, RCCM, adresse, email, téléphone
- **users** : email, mot de passe (hash), nom, rôle (super_admin, company_admin, company_user), companyId
- **subscriptions** : plan, dates, statut (active, expired)

### 2. Mercuriale (commune)
- **regions** : 14 régions Burkina Faso
- **mercuriale_articles** : code, désignation, conditionnement, prix_min/moyen/max, regionId, catégorie
- **mercuriale_pdfs** : région, nom fichier, blob ou chemin (stockage)

### 3. Facturation
- **factures** : numéro, client, date, montant HT, TVA, TTC, statut (brouillon, envoyée, payée), companyId, userId
- **facture_items** : designation, quantité, PU, total, factureId

### 4. QSL – Quittances (cœur du système)
- **quittances** : numéro, factureId, date paiement, montant, mode paiement, référence bancaire, statut (émise, validée), companyId, créée par userId

## Flux QSL

1. Facture créée → statut **brouillon** ou **envoyée**
2. Paiement reçu → création d’une **quittance** liée à la facture
3. Facture passe en **payée**, quittance = preuve
4. Suivi : liste des quittances par entreprise, export, vérification

## API REST prévues

| Méthode | Route | Description |
|---------|-------|--------------|
| POST | /api/auth/login | Connexion |
| POST | /api/auth/register | (optionnel) |
| GET | /api/companies | Liste entreprises (super_admin) |
| GET | /api/mercuriale/:regionId | Articles mercuriale par région |
| GET | /api/factures | Factures (filtré par entreprise) |
| POST | /api/factures | Créer facture |
| GET | /api/quittances | Liste quittances (QSL) |
| POST | /api/quittances | Émettre quittance (lors paiement) |
| GET | /api/quittances/:id | Détail quittance |
