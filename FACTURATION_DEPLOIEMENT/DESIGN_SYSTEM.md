# FasoMarchés — Design System

Thème officiel pour la plateforme marchés publics Burkina Faso. Style semi-minimaliste, sobre et institutionnel.

## Couleurs principales

| Usage | Hex | Classe Tailwind |
|-------|-----|-----------------|
| **Background principal (dark)** | #0F1C2E | `bg-faso-bg` |
| **Background light** | #F4F7FB | `bg-faso-bg-light` |
| **Sidebar gradient** | #0F1C2E → #123B2F | `from-faso-sidebar-start to-faso-sidebar-end` |
| **Bouton principal (Vert Faso)** | #1E7F3C | `bg-faso-primary` |
| **Bouton principal hover** | #17652F | `hover:bg-faso-primary-hover` |
| **Bouton secondaire (Rouge Faso)** | #C60C30 | `bg-faso-secondary` |
| **Accent (Jaune Or)** | #FCD116 | `bg-faso-accent` / `text-faso-accent` |
| **Texte principal** | #0B1624 | `text-faso-text-primary` |
| **Texte secondaire** | #5B6B7C | `text-faso-text-secondary` |
| **Bordures** | #E3E8EF | `border-faso-border` |
| **Cards** | #FFFFFF | `bg-faso-card` |
| **Hover background** | #F0F4F8 | `bg-faso-hover-bg` |

## Statuts (marchés publics)

| Statut | Fond | Texte |
|--------|------|-------|
| Validé | #E6F4EA | #1E7F3C |
| En attente | #FFF4D6 | #B58100 |
| Rejeté | #FDEAEA | #C60C30 |
| Brouillon | #E8EEF5 | #5B6B7C |

## Composants UI

- **Sidebar** : Dégradé bleu → vert, icônes blanches, menu actif = fond vert + bordure gauche jaune or (4px)
- **Header** : Fond blanc, ombre légère, badge vert pour entreprise validée
- **Bouton profil** : Cercle fond bleu nuit
- **Cards** : Fond blanc, ombre `0 4px 12px rgba(0,0,0,0.05)`
- **Coins arrondis** : 8px (faso) à 12px (faso-lg)

## Interdictions

- Pas de violet
- Pas de couleurs saturées inutiles
- Pas de dégradés excessifs
- Pas d'effet startup flashy

## Variables CSS

Voir `src/index.css` pour les variables `:root` (--faso-*).

## Fichier thème

Voir `src/theme.js` pour l'export des constantes.
