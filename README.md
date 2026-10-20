# BetMaster / BotPari

Application web statique d’aide à la décision pour des paris sportifs **virtuels**. Elle analyse des matchs avec une distribution de Poisson, repère les écarts de valeur, construit des combinés et suit une bankroll locale.

## Lancer le projet

```bash
npm start
```

Ouvrir ensuite `http://localhost:4173`. Aucun build, compte ou secret n’est nécessaire.

## Tests

```bash
npm test
```

Les données utilisateur sont conservées uniquement dans `localStorage`. Les probabilités sont indicatives et ne garantissent aucun résultat. 18+ — jouez de façon responsable.

## Données sportives

Le workflow `Actualiser les matchs` consolide chaque jour les calendriers ESPN, les résultats historiques de football-data.org et les cotes 1N2 de The Odds API. Il enregistre les sept prochains jours dans `data/fixtures.json`, puis republie GitHub Pages. Les cotes 1N2 réellement disponibles sont identifiées par le nombre de bookmakers ; les marchés Over et BTTS restent des estimations internes.

Deux secrets GitHub Actions sont requis : `FOOTBALL_DATA_TOKEN` et `THE_ODDS_API_KEY`. Ils ne sont jamais envoyés au navigateur ni écrits dans les données publiées.
