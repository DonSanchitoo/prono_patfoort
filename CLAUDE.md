# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

BetMaster / BotPari : application web **statique** (HTML + JS vanilla en module ES, sans framework, sans build, sans dépendance npm) d'aide à la décision pour des paris sportifs **virtuels**. Hébergée sur GitHub Pages. Toute l'interface et les textes sont en français.

## Commandes

```bash
npm start          # python3 -m http.server 4173 → http://localhost:4173
npm test           # node --test (exécute app.test.js, club.test.js et league.test.js)
node --test --test-name-pattern="combiné" app.test.js   # un seul test (filtre sur le nom)
node scripts/update-fixtures.mjs   # régénère data/fixtures.json (requiert FOOTBALL_DATA_TOKEN et THE_ODDS_API_KEY, sinon données partielles)
node scripts/update-results.mjs    # met à jour uniquement les scores ESPN (sans clé)
```

Aucun linter ni formateur n'est configuré.

## Architecture

Trois morceaux qui communiquent par le fichier `data/fixtures.json` (et, pour les comptes, les paris et les ligues, par la base Supabase, voir « Club » plus bas) :

1. **Pipeline de données (Node 20, GitHub Actions)**
   - `scripts/update-fixtures.mjs` (workflow `update-fixtures.yml`, à 7 h, 14 h et 19 h en heure de Paris) : calendriers ESPN (19 compétitions de la liste `leagues` : championnats, coupes d'Europe, coupes nationales et sélections ; J-7 à J+7, conservés J-3 à J+7). Les cotes réelles et la forme ne couvrent que les compétitions de `providerMap`, les autres gardent les cotes du modèle. La liste `leagues` de `scripts/update-results.mjs` et l'objet `LEAGUES` de `app.js` (logo, importance, famille) doivent suivre les mêmes libellés, historique football-data.org pour la forme des équipes (remplace `homeGoals`/`awayGoals` si au moins 2 matchs par équipe), cotes The Odds API (moyenne des bookmakers par marché, avec `bookmakerOffers`, `realOddsMarkets`, `oddsBookmakerCounts`). Toutes les cotes 1N2, BTTS et Over 2,5 sont actualisées ensemble, sans appel nocturne. BTTS et Over 2,5 couvrent les rencontres des prochaines 48 h, interrogent les régions `eu,uk` et conservent la dernière cote réelle de chaque bookmaker lorsqu'une réponse manque ; `odds-cache.js` porte les règles pures de fenêtre, horaires et fusion. Sans cotes réelles, les cotes viennent d'un modèle interne (`model()`). Compare avec le fichier précédent pour calculer `oddsMovement` (significatif à ±5 %), et fige `suggestedPick` une fois le match terminé pour que le pronostic affiché a posteriori soit celui proposé avant le match.
   - `scripts/update-results.mjs` (workflow `update-results.yml`, toutes les heures) : relit `data/fixtures.json`, fusionne les scores ESPN des 4 derniers jours dans `settlements` et marque les `matches` correspondants comme terminés.
   - Les deux workflows commitent `data/fixtures.json` (commits `chore: actualise les …` du bot, d'où des commits fréquents sur `main` : faire `git pull --rebase` avant de pousser) puis redéploient Pages. `pages.yml` redéploie à chaque push sur `main`. Ils partagent le groupe de concurrence `betmaster-pages`.
   - Les identifiants de match sont `espn-<id>` ; le rapprochement des équipes entre fournisseurs passe par `normalize()`/`sameTeam()`.

2. **Front (`app.js`, `index.html`, `styles.css`)**
   - `model.js` contient les calculs purs, sans DOM, importés à la fois par `app.js` et par `scripts/update-fixtures.mjs` (qui s'en sert pour figer `suggestedPick`) : `poisson`, `analyseMatch` (Poisson sur grille 0–8 buts → probabilités 1N2, +2,5 buts, BTTS et `value = proba × cote − 1`), `recommendedMarket`, `optimizeCombo` (recherche exhaustive sur 18 candidats max, profils `safe`/`balanced`/`bold`), `selectionResult`, `settleBet`. Changer la logique de pronostic ici change donc à la fois le site et les pronostics enregistrés par le pipeline.
   - `app.js` est le reste de l'interface : rendu par `innerHTML` à partir d'un objet `state` global, avec `render()` qui redessine tout. Il est écrit en style très compact (une fonction par ligne), tout comme `model.js` : garder ce style en les modifiant.
   - Logos : `scripts/update-fixtures.mjs` enregistre pour chaque match les adresses `homeLogo`, `awayLogo` `leagueLogo` et `leagueLogoDark` renvoyées par l'API ESPN. Le site les charge en direct depuis `a.espncdn.com`, après un contrôle par `safeLogo()`. Pour les compétitions, il prend la version sombre en thème sombre et se rabat sur l'identifiant de `LEAGUES`. Les blasons des clubs n'ont pas de version sombre. Si une image manque ou ne charge pas, il affiche les initiales.
   - Compétitions : la barre horizontale ne montre que celles qui ont des matchs sur la période affichée, triées par importance (`rankedLeagues()`). Le bouton « Compétitions » ouvre la liste complète.
   - Animations : un écran d'accueil s'affiche une fois par session (classe `intro` posée dans le `<head>`), puis la page entre en animation. Tout est coupé si le système demande moins d'animations.
   - Scores en direct : `pollLive()` interroge l'API ESPN depuis le navigateur toutes les 30 s, de 10 min avant à 2 h 30 après le coup d'envoi (champ `kickoff`). Les cotes sont alors fermées sur la fiche, et un match terminé est réglé tout de suite, sans attendre `update-results.mjs`. Le slug ESPN de chaque compétition est le 5e élément de `LEAGUES`.
   - Effets pendant la navigation : fil des matchs (`renderRail`, colonne à gauche dès 1200 px, bandeau collant en dessous), affiche du jour avec compte à rebours, apparition des fiches au défilement (`observeCards`, une seule fois par fiche grâce à `state.revealed`, car `renderMatches()` redessine la liste à chaque changement du ticket), liseré tournant sur les value bets, cote qui s'envole vers le ticket (`flyToTicket`).
   - Fiches détaillées (`details.js`, chargé à la demande par `app.js` comme `account.js`) : fiche équipe (clic sur une équipe : effectif, classements ou parcours en coupe, buteurs, matchs), détail du match (« Plus de détails » : compo, classement, buteurs, infos, et en direct ou après le match les stats et le fil du match) et section Classements (`#classements`). Une fiche ouverte depuis une autre s'empile : les flèches de l'en-tête et le bouton retour du navigateur parcourent cet historique (`stack`, une entrée `history` par fiche, toutes retirées à la fermeture). Tout vient de l'API publique d'ESPN, appelée depuis le navigateur avec un cache de quelques minutes. La compo probable est le dernier onze aligné dans la même compétition, sinon dans n'importe quelle compétition hors amicaux. Les buteurs d'une équipe viennent de la fiche de son prochain match dans la compétition, car le classement général d'ESPN s'arrête au top 50. ESPN ne fournit ni blessures, ni entraîneur en poste, ni buts attendus, et son commentaire détaillé est en anglais. L'équipe type de la fiche équipe reprend, sur les 5 derniers matchs officiels, le schéma le plus fréquent et le titulaire le plus aligné à chaque poste. L'adresse `teams/{id}` d'ESPN refuse les appels du navigateur (pas d'en-tête CORS) : les infos du club (couleur, logo, rang, bilan) viennent de `teams/{id}/roster`.
   - Thèmes : toutes les couleurs sont des variables CSS. Le thème sombre est sur `:root` et le thème clair sur `:root.light`. Utiliser `--accent` pour les aplats et `--accent-text` pour le texte et les traits, car le vert citron n'est pas lisible sur fond clair. Un script dans le `<head>` applique le thème choisi avant le premier affichage.
   - Chargement : cache `localStorage` (`betmaster-fixtures-cache-v2`) appliqué immédiatement, puis `fetch('data/fixtures.json')` toutes les 5 min. Sans données, repli sur `DEFAULT_MATCHES` (démo).
   - État utilisateur (bankroll, historique des paris, matchs personnalisés) uniquement dans `localStorage` (`betmaster-state-v1`) ; thème dans `betmaster-theme`. Pas de backend.
   - Règlement automatique : la mise est débitée au placement ; `settlePendingBets` règle chaque ticket `pending` une seule fois contre `settlements` + matchs terminés (gagné → crédit `mise × cote`). Le rapprochement se fait par `matchId`, sinon par noms d'équipes (les IDs peuvent changer).

3. **Tests (`app.test.js`, `club.test.js`)** : `node:test`. `club.test.js` couvre les règles du Club (règlement serveur, ligues, niveaux, jetons). Les calculs sont testés depuis `model.js`. Un test charge aussi `app.js` après avoir simulé `localStorage`, `location` et `document`, car le module exécute du code DOM au chargement : tout nouvel accès global au DOM ou au navigateur au niveau module doit rester compatible avec ces stubs (ou être protégé par `typeof window !== 'undefined'`).

## Club : comptes, paris certifiés et ligues (lots 8 à 10)

Les paris des joueurs connectés sont **enregistrés et réglés côté serveur** (Supabase). Le navigateur affiche et demande, il n'écrit plus aucune bankroll, aucun statut, aucune statistique.

- Scripts SQL à exécuter dans l'ordre par le propriétaire du projet Supabase (`SUPABASE_SETUP.md`) : `supabase-schema.sql`, `supabase-v3-schema.sql`, `supabase-v4-schema.sql` (annuaire, pseudo unique), `supabase-v5-schema.sql` (tickets certifiés), `supabase-v6-schema.sql` (points de ligue, quota de 10 paris libres par semaine, table `league_entries`), `supabase-v7-schema.sql` (défi du jour), `supabase-v8-schema.sql` (ligue générale). Tous sont réexécutables. `supabase-v5-recette.sql` est la recette de sécurité à jouer à la main.
- Tables `fixtures` (alimentée par le pipeline), `player_accounts`, `capital_events`, `bets`. RLS : lecture par le propriétaire seulement, aucune écriture directe. Écritures par RPC `security definer` : `ensure_player_account`, `add_capital`, `place_bet` (contrôle connexion, coup d'envoi, cotes à 2 % près, mise couverte) et, pour la clé `service_role` seulement, `settle_bet` (idempotent).
- `scripts/sync-supabase.mjs` (étape finale des workflows `update-fixtures.yml` et `update-results.yml`) envoie les matchs dans `fixtures` puis règle les paris en attente avec `settleTicket` de `model.js` (même logique que le site). Rapprochement par identifiant de match uniquement. Un match annulé (`voided`) rembourse la sélection ; un match jamais joué au bout de 10 jours est annulé. `scripts/supabase-admin.mjs` est le client REST `service_role` (sans dépendance npm).
- Côté site, `account.js` expose `placeBet`, `addCapital`, `refreshServer` ; `app.js` garde `state.serverBets` (paris certifiés) et `state.legacy` (anciens paris du navigateur, « avant saison 1 »), et reconstruit `state.history` avec `rebuildHistory()`. Les statistiques publiques viennent de la vue `public_profiles` (calculées depuis `bets`).
- Ligue générale : `leaguePoints` (mise fixe de 10, cote plafonnée à 10), `weekKey` (semaine de Paris), `leagueEligibility` dans `model.js`. Le serveur décide (déclencheur `bets_prepare_league`), le ticket affiche l'interrupteur « Compte en ligue » avec les mêmes règles.
- Défi du jour : `pickDailyChallenge` (model.js) choisit chaque jour (Paris) 4 matchs avec cotes 1N2 réelles (importance de la compétition, puis cotes les plus serrées), figés une fois publiés ; écrit dans `data/fixtures.json` (`dailyChallenge`) par `update-fixtures.mjs` et dans `daily_challenges` par `sync-supabase.mjs`. Pronos par la RPC `play_daily_pick` (avant le coup d'envoi), réglés par `settle_daily_pick` avec le barème de la ligue ; les points entrent dans `league_entries`. Carte `#daily-challenge` en tête de l'onglet Matchs.
- Ligue générale (`league.js`, pur et testé dans `league.test.js`) : 17 échelons (District III à Master), groupes de 10 à 20 en serpentin, saison = mois civil de Paris. `closeSeason` applique montées, descentes, barrages (défis du dernier week-end), placement, montée directe, saison de découverte, inactivité. `scripts/league-engine.mjs` recalcule les classements (`standings`, après chaque règlement via `sync-supabase.mjs`) et prépare la clôture, envoyée en une transaction par la RPC `apply_season_close` ; `close-season.yml` la lance chaque jour à 00 h 30 (idempotent). Le site affiche « Ma ligue » (`#my-league`) et l'écran de fin de saison (`#season-dialog`, une seule fois via `mark_season_seen`).
- Sans connexion au serveur de jeu, aucun pari n'est possible (le bouton l'indique) : il n'existe pas de pari « non certifié ».

## Contraintes

- Les secrets `FOOTBALL_DATA_TOKEN`, `THE_ODDS_API_KEY` et `SUPABASE_SERVICE_ROLE_KEY` n'existent que dans GitHub Actions ; rien ne doit les exposer dans `data/fixtures.json` ni côté navigateur.
- Les marchés +2,5 buts et BTTS sont souvent des estimations internes ; l'interface distingue cotes réelles (« MOYENNE · n bookmakers ») et estimées. Conserver cette distinction et les mentions « paris virtuels / 18+ / aucune garantie ».
- Les pages Confidentialité et Mentions légales (fenêtres en bas de `index.html`) décrivent les données réellement collectées et les services tiers contactés (Supabase, Google Fonts, ESPN, jsDelivr) : les mettre à jour à chaque nouveau service ou nouvelle donnée.
- Pas de tiret cadratin (—) ni demi-cadratin (–) dans les textes affichés : utiliser « · », « : » ou « - ».
- Le site doit rester utilisable sur téléphone (barre de navigation du bas sous 700 px) comme sur PC (colonne combiné fixe au-delà de 1100 px).

## Tickets et travail à deux

Le projet est développé à deux : l'un avec Claude Code (ce fichier), l'autre avec Codex (`AGENTS.md`). Les deux fichiers doivent rester cohérents : toute règle commune ajoutée ici va aussi dans `AGENTS.md`.

- **Tickets BetMaster uniquement dans la connexion MCP `youtrack-betoptimum`** (instance `betoptimum.youtrack.cloud`, projet `BET`). Ne jamais lire, créer ni modifier de ticket de ce dépôt avec la connexion `youtrack` ni avec une autre instance, et ne jamais citer dans ce dépôt ou dans YouTrack BetOptimum le contenu d'un autre YouTrack.
- Une branche par ticket, créée depuis `main` : `BET-<n>-<descriptif-court>` (ex. `BET-12-classement-buteurs`).
- Le numéro du ticket figure dans chaque message de commit et dans le titre de la pull request (ex. `BET-12 Ajoute le classement des buteurs`).
- Le ticket est fermé quand la pull request est fusionnée dans `main`.
- Aucun jeton YouTrack dans le dépôt : chacun garde le sien dans la configuration de son IA.
