# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Athletia is a Vue 3 SPA frontend for a sports-coaching platform ("Plateforme de suivi sportif"). It's a PWA (installable, offline-cached via Workbox) that talks to a separate backend API (not in this repo) over REST/JSON. There are three user roles — `athlete`, `prepa` (physical trainer), `admin` — each with its own dashboard and JWT-encoded role claim.

## Commands

```sh
npm install       # install deps
npm run dev       # start Vite dev server
npm run build     # production build (outputs to dist/)
npm run preview   # preview the production build locally
npm run lint      # oxlint --fix, then eslint --fix --cache (run-s, so oxlint runs first)
npm run format    # prettier --write on src/
```

There is no test suite/runner configured in this repo.

## Architecture

**Auth flow**: `LoginView.vue` POSTs form-encoded credentials directly via `fetch` (not the `useApi` helper, since no token exists yet) to `/auth/login`, decodes the JWT payload client-side to read `role`, fetches `/users/me`, then calls `authStore.setAuth(token, role, user)` and redirects to `/athlete`, `/prepa`, or `/admin` based on role. `stores/auth.js` (Pinia) persists `token`/`role`/`user` to `localStorage` and rehydrates from it on load. There is no route-guard middleware in `router/index.js` — access control is purely: users land on the dashboard matching their JWT role.

**API layer**: `services/api.js` exports `useApi()`, a composable returning `{ get, post, patch, del }`. It injects the `Authorization: Bearer <token>` header from the auth store, and on any `401` response it force-logs-out and redirects to `/` (login). `BASE_URL` comes from `VITE_API_URL` (`.env.local` → `http://localhost:8000`, `.env.production` → `https://athletia.espacenum.fr/api`). Every view/component that needs data calls `useApi()` itself — there's no central data-fetching/store layer beyond `auth.js`.

**Routing**: Four flat routes in `router/index.js` (`/`, `/athlete`, `/prepa`, `/admin`), each mapping 1:1 to a top-level view in `src/views/`. Non-login routes are lazy-loaded.

**View/component structure**: Each role dashboard (`DashboardAthlete.vue`, `DashboardPrepa.vue`, `DashboardAdmin.vue`) wraps its content in `components/AppLayout.vue`, which provides the header, mobile hamburger drawer, avatar/profile dropdown (with password-change modal), and PWA install banners (Android/Chrome `beforeinstallprompt` + iOS manual-instructions banner). Layout exposes `#nav` and `#actions` slots for role-specific navigation/buttons. Role-specific sub-components live in subfolders under `src/components/` (e.g. `components/prepa/ProgrammeForm.vue`, `components/prepa/AssignerAthleteModal.vue`) — follow this folder-per-role convention when adding new components.

Dashboards use the Options API `setup()` pattern throughout (not `<script setup>`) — all refs/computed/methods are declared in `setup()` and explicitly returned in a big object at the end. Match this style rather than converting to `<script setup>`.

**Domain model (prepa dashboard)**: Programmes (`programme`) contain séances (`seance`, typed as `musculation` | `natation` | `athletisme` | `pliometrie`) organized by `semaine` (week number) and `jour`. Séances contain exercices, which can be grouped into supersets/bisets via a shared `groupe` number. Exercices have séries (`serie`) whose fields vary by séance type (reps/poids/rm/tempo for musculation; metres/intensite for natation/athletisme; bonds/intensite for pliométrie), always with a shared `temps_repos`. Athlete logs (`/logs/...`) compare prescribed vs. realized values per série for progress tracking.

**Styling**: No component library — hand-rolled CSS in scoped `<style>` blocks per component, using CSS custom properties defined in `src/assets/tokens.css` (colors, spacing) imported once in `main.js`. Icons are Tabler Icons via a CDN webfont link in `index.html` (`<i class="ti ti-*">`), not an npm package. Primary brand color is `#7F77DD` / `#534AB7`. UI text and identifiers (variable names like `programmeActif`, `mettreAJourSeance`) are in French — follow this convention for new code in this domain.

**Path alias**: `@` maps to `src/` (configured in both `vite.config.js` and `jsconfig.json`).

**Linting**: `.oxlintrc.json` drives `eslint-plugin-oxlint`, which is composed into `eslint.config.js` — oxlint handles correctness rules, ESLint adds Vue-specific rules (`flat/essential`) and defers formatting to Prettier (`eslint-config-prettier`). Prettier config: no semicolons, single quotes, 100-char print width.

## Deployment

`.github/workflows/deploy.yml` deploys on every push to `main`: SSHes into a VPS, `git pull`s, runs `npm run build`, and reloads nginx. There is no CI test/lint gate before deploy — verify locally before pushing to `main`.
