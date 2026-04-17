# TimeTutor — Frontend

> Angular 17 PWA — Portail directeur + Page enseignant

## Stack technique

- **Angular 17+** — Standalone components
- **TailwindCSS** — Design system utilitaire
- **FullCalendar.js** — Calendrier interactif créneaux
- **Socket.io-client** — Temps réel (verrouillage créneaux)
- **PWA / Service Worker** — Cache offline pour enseignants

## Prérequis

- Node.js >= 20
- npm >= 9
- Angular CLI : `npm install -g @angular/cli`

## Installation

```bash
git clone https://github.com/TON_USERNAME/timetutor-frontend.git
cd timetutor-frontend
npm install
cp .env.example .env     # puis remplir les variables
ng serve
```

L'app tourne sur `http://localhost:4200`

## Structure du projet

```
src/
├── app/
│   ├── core/              # Guards, interceptors, services globaux
│   ├── features/
│   │   ├── director/      # Portail directeur (sessions, slots, dashboard)
│   │   ├── teacher/       # Page enseignant (calendrier, sélection créneaux)
│   │   ├── auth/          # Login directeur + magic link enseignant
│   │   └── landing/       # Landing page publique
│   └── shared/            # Composants, pipes, directives réutilisables
├── environments/
└── assets/
```

## Workflow Git — Règles fondamentales

### ⚠️ On ne commit JAMAIS directement sur `main`

`main` = branche stable, fonctionnelle, déployable en production.

### Cycle de travail

```bash
# 1. Se mettre à jour
git checkout main
git pull origin main

# 2. Créer sa branche de travail
git checkout -b feature/nom-de-la-feature

# 3. Développer + commits réguliers
git add .
git commit -m "feat: description claire de ce qui a été fait"

# 4. Envoyer sa branche
git push origin feature/nom-de-la-feature

# 5. Ouvrir une Pull Request sur GitHub → vers main
```

### Nommage des branches

| Type | Exemple |
|------|---------|
| Nouvelle fonctionnalité | `feature/login-directeur` |
| Correction de bug | `fix/calendrier-affichage-mobile` |
| Refactoring | `refactor/auth-service` |
| Tests | `test/slot-selection-specs` |

### Convention de commits

```
feat: ajout du composant calendrier enseignant
fix: correction bug sélection créneau mobile
refactor: découpage service auth en modules
test: specs pour le guard directeur
chore: mise à jour dépendances Angular
```

### Pull Request — ce qu'elle doit contenir

- ✅ Description claire de la feature/fix
- ✅ Screenshots si changement UI
- ✅ Tests OK (lint + build passants)
- ✅ Code review par au moins 1 autre dev avant merge

### Mise à jour de sa branche avec main

```bash
# Option recommandée — rebase (historique propre)
git checkout feature/ma-feature
git fetch origin
git rebase origin/main

# En cas de conflit : résoudre → git add . → git rebase --continue
```

## CI/CD — Pipeline

Le pipeline GitHub Actions (`.github/workflows/ci.yml`) se déclenche automatiquement à chaque push et PR.

**Ce qu'il vérifie :**
- ✅ Lint (`npm run lint`)
- ✅ Build (`npm run build`)
- 🔜 Tests unitaires (à activer quand les specs seront prêtes)
- 🔜 Déploiement automatique sur staging (sera configuré en S4)

**Règle :** Une PR ne peut être mergée que si le pipeline est ✅ vert.

Pour voir l'état du pipeline : onglet **Actions** sur GitHub.

## Fonctionnalités à développer (branches à créer)

Chaque feature = une branche propre :

```
feature/landing-page
feature/auth-directeur
feature/session-creation
feature/slot-grid-creation
feature/teacher-invite-csv
feature/teacher-calendar-view
feature/slot-selection-realtime
feature/director-dashboard
feature/conflict-management
feature/validation-export-pdf
feature/pwa-offline
feature/super-admin
```

## Scripts disponibles

```bash
ng serve          # Dev local (port 4200)
ng build          # Build production
npm run lint      # ESLint check
npm test          # Tests unitaires
```
