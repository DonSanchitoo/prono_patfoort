# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

BetMaster / BotPari : application web **statique** (HTML + JS vanilla en module ES, sans framework, sans build, sans dépendance npm) d'aide à la décision pour des paris sportifs **virtuels**. Hébergée sur GitHub Pages. Toute l'interface et les textes sont en français.

## Commandes

```bash
npm start          # python3 -m http.server 4173 → http://localhost:4173
npm test           # node --test (exécute app.test.js)
node --test --test-name-pattern="combiné" app.test.js   # un seul test (filtre sur le nom)
node scripts/update-fixtures.mjs   # régénère data/fixtures.json (requiert FOOTBALL_DATA_TOKEN et THE_ODDS_API_KEY, sinon données partielles)
node scripts/update-results.mjs    # met à jour uniquement les scores ESPN (sans clé)
```

Aucun linter ni formateur n'est configuré.

## Architecture

Trois morceaux qui communiquent uniquement par le fichier `data/fixtures.json` :

1. **Pipeline de données (Node 20, GitHub Actions)**
   - `scripts/update-fixtures.mjs` (workflow `update-fixtures.yml`, toutes les 2 h) : calendriers ESPN (7 ligues, J-7 à J+7, conservés J-3 à J+7), historique football-data.org pour la forme des équipes (remplace `homeGoals`/`awayGoals` si au moins 2 matchs par équipe), cotes The Odds API (moyenne des bookmakers par marché, avec `bookmakerOffers`, `realOddsMarkets`, `oddsBookmakerCounts`). Sans cotes réelles, les cotes viennent d'un modèle interne (`model()`). Compare avec le fichier précédent pour calculer `oddsMovement` (significatif à ±5 %), et fige `suggestedPick` une fois le match terminé pour que le pronostic affiché a posteriori soit celui proposé avant le match.
   - `scripts/update-results.mjs` (workflow `update-results.yml`, toutes les heures) : relit `data/fixtures.json`, fusionne les scores ESPN des 4 derniers jours dans `settlements` et marque les `matches` correspondants comme terminés.
   - Les deux workflows commitent `data/fixtures.json` (commits `chore: actualise les …` du bot, d'où des commits fréquents sur `main` : faire `git pull --rebase` avant de pousser) puis redéploient Pages. `pages.yml` redéploie à chaque push sur `main`. Ils partagent le groupe de concurrence `betmaster-pages`.
   - Les identifiants de match sont `espn-<id>` ; le rapprochement des équipes entre fournisseurs passe par `normalize()`/`sameTeam()`.

2. **Front (`app.js`, `index.html`, `styles.css`)**
   - `model.js` contient les calculs purs, sans DOM, importés à la fois par `app.js` et par `scripts/update-fixtures.mjs` (qui s'en sert pour figer `suggestedPick`) : `poisson`, `analyseMatch` (Poisson sur grille 0–8 buts → probabilités 1N2, +2,5 buts, BTTS et `value = proba × cote − 1`), `recommendedMarket`, `optimizeCombo` (recherche exhaustive sur 18 candidats max, profils `safe`/`balanced`/`bold`), `selectionResult`, `settleBet`. Changer la logique de pronostic ici change donc à la fois le site et les pronostics enregistrés par le pipeline.
   - `app.js` est le reste de l'interface : rendu par `innerHTML` à partir d'un objet `state` global, avec `render()` qui redessine tout. Il est écrit en style très compact (une fonction par ligne), tout comme `model.js` : garder ce style en les modifiant.
   - Chargement : cache `localStorage` (`betmaster-fixtures-cache-v2`) appliqué immédiatement, puis `fetch('data/fixtures.json')` toutes les 5 min. Sans données, repli sur `DEFAULT_MATCHES` (démo).
   - État utilisateur (bankroll, historique des paris, matchs personnalisés) uniquement dans `localStorage` (`betmaster-state-v1`) ; thème dans `betmaster-theme`. Pas de backend.
   - Règlement automatique : la mise est débitée au placement ; `settlePendingBets` règle chaque ticket `pending` une seule fois contre `settlements` + matchs terminés (gagné → crédit `mise × cote`). Le rapprochement se fait par `matchId`, sinon par noms d'équipes (les IDs peuvent changer).

3. **Tests (`app.test.js`)** : `node:test`. Les calculs sont testés depuis `model.js`. Un test charge aussi `app.js` après avoir simulé `localStorage`, `location` et `document`, car le module exécute du code DOM au chargement : tout nouvel accès global au DOM ou au navigateur au niveau module doit rester compatible avec ces stubs (ou être protégé par `typeof window !== 'undefined'`).

## Contraintes

- Les secrets `FOOTBALL_DATA_TOKEN` et `THE_ODDS_API_KEY` n'existent que dans GitHub Actions ; rien ne doit les exposer dans `data/fixtures.json` ni côté navigateur.
- Les marchés +2,5 buts et BTTS sont souvent des estimations internes ; l'interface distingue cotes réelles (« MOYENNE · n bookmakers ») et estimées. Conserver cette distinction et les mentions « paris virtuels / 18+ / aucune garantie ».
