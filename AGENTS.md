# AGENTS.md

Consignes pour Codex (et tout agent qui lit `AGENTS.md`) dans ce dépôt. Le projet est développé à deux : l'un avec Codex, l'autre avec Claude Code, qui lit `CLAUDE.md`. Les deux fichiers portent les mêmes règles communes et doivent rester cohérents : toute règle commune ajoutée ici va aussi dans `CLAUDE.md`.

**Avant toute modification, lis `CLAUDE.md`** : il décrit en détail l'architecture (pipeline de données, front, fiches détaillées, tests). Ce fichier en reprend l'essentiel.

## Projet

BetMaster / BotPari : application web **statique** (HTML + JS vanilla en module ES, sans framework, sans build, sans dépendance npm) d'aide à la décision pour des paris sportifs **virtuels**. Hébergée sur GitHub Pages. Toute l'interface et les textes sont en français.

## Commandes

```bash
npm start          # python3 -m http.server 4173 → http://localhost:4173
npm test           # node --test (exécute app.test.js)
node --test --test-name-pattern="combiné" app.test.js   # un seul test
node scripts/update-results.mjs    # met à jour uniquement les scores ESPN (sans clé)
```

Aucun linter ni formateur n'est configuré. Lance `npm test` avant chaque commit.

## Repères d'architecture

- `data/fixtures.json` est le seul lien entre le pipeline (`scripts/*.mjs`, lancé par GitHub Actions) et le front. Il est régénéré et commité par un bot plusieurs fois par heure : fais `git pull --rebase` avant de pousser, et ne le modifie pas à la main.
- `model.js` : calculs purs (Poisson, value, combinés, règlement), importés à la fois par `app.js` et par `scripts/update-fixtures.mjs`. Changer la logique de pronostic ici change le site **et** les pronostics enregistrés par le pipeline.
- `app.js` : interface, rendu par `innerHTML` depuis un objet `state` global. `details.js` et `account.js` sont chargés à la demande.
- `app.js` et `model.js` sont écrits en style très compact (une fonction par ligne) : garder ce style.
- `app.test.js` charge `app.js` avec des stubs de `localStorage`, `location` et `document` : tout nouvel accès au DOM ou au navigateur au niveau module doit rester compatible (ou être protégé par `typeof window !== 'undefined'`).
- La liste `leagues` de `scripts/update-fixtures.mjs`, celle de `scripts/update-results.mjs` et l'objet `LEAGUES` de `app.js` doivent garder les mêmes libellés.
- Thèmes : couleurs en variables CSS, sombre sur `:root`, clair sur `:root.light`. `--accent` pour les aplats, `--accent-text` pour le texte et les traits.

## Contraintes

- Les secrets `FOOTBALL_DATA_TOKEN` et `THE_ODDS_API_KEY` n'existent que dans GitHub Actions ; rien ne doit les exposer dans `data/fixtures.json` ni côté navigateur.
- L'interface distingue cotes réelles (« MOYENNE · n bookmakers ») et estimées. Conserver cette distinction et les mentions « paris virtuels / 18+ / aucune garantie ».
- Les pages Confidentialité et Mentions légales (bas de `index.html`) décrivent les données collectées et les services tiers contactés (Supabase, Google Fonts, ESPN, jsDelivr) : les mettre à jour à chaque nouveau service ou nouvelle donnée.
- Pas de tiret cadratin ni demi-cadratin dans les textes affichés : utiliser « · », « : » ou « - ».
- Le site doit rester utilisable sur téléphone (barre de navigation du bas sous 700 px) comme sur PC (colonne combiné fixe au-delà de 1100 px).

## Tickets et travail à deux

- **Tickets BetMaster uniquement dans le YouTrack BetOptimum** (`betoptimum.youtrack.cloud`, projet `BET`), via le serveur MCP YouTrack configuré dans Codex. N'utilise aucune autre instance YouTrack pour ce dépôt.
- Une branche par ticket, créée depuis `main` : `BET-<n>-<descriptif-court>` (ex. `BET-12-classement-buteurs`).
- Le numéro du ticket figure dans chaque message de commit et dans le titre de la pull request (ex. `BET-12 Ajoute le classement des buteurs`).
- Le ticket est fermé quand la pull request est fusionnée dans `main`.
- Aucun jeton YouTrack ni autre secret dans le dépôt : chacun garde le sien dans la configuration de son IA (`~/.codex/config.toml` pour Codex).
