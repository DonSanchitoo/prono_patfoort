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
