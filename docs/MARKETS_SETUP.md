# Marchés prioritaires (BET-153)

## Activation par étapes

Installer `supabase/migrations/supabase-v36-schema.sql` après V35 et déployer le nouveau code de règlement avant d’activer la collecte supplémentaire. Les paris existants gardent leurs identifiants, libellés et cotes enregistrés. La migration ne réécrit aucune sélection.

La variable Actions `PROPLINE_MARKET_STAGE` vaut **0 par défaut**. Elle sélectionne :

- **0** : 1N2, Over exactement 2,5, BTTS Oui (BET-152).
- **1** : ajoute BTTS Non, Under 2,5, Over et Under 1,5 et 3,5. Même requête et même fréquence.
- **2** : ajoute double chance 1N/N2/12, domicile/extérieur remboursé si nul et totaux par équipe sur les demi-lignes 0,5 à 5,5 effectivement fournies. Une ligne non prise en charge reste ignorée, sans arrondi ni substitution d’une ligne voisine.

Utiliser d’abord le workflow de diagnostic avec l’étape choisie. Il reste sans écriture et sans déploiement ; il vérifie les prix réels. Ne pas passer la variable de production à 1 ou 2 tant que le diagnostic correspondant et la migration SQL ne sont pas validés. Les marchés indisponibles ne sont ni inventés ni proposés ; les cinq marchés historiques conservent leur repli estimé. Un nouveau marché doit avoir une cote réelle côté serveur.

## Calcul et règlement

Chaque clé identifie le marché, le sens et la ligne. Les probabilités sont calculées depuis la même grille de scores de Poisson ; les totaux équipe utilisent uniquement les buts de l’équipe nommée. Pour le remboursé si nul, la probabilité affichée est celle d’une victoire, le remboursement est affiché séparément et la value vaut `P(victoire) × cote + P(nul) - 1`. Un nul vaut une sélection remboursée, retirée du produit des cotes ; le calcul vaut aussi pour chaque ligne de système. Match annulé : même règle. Aucun ajout de deux choix d’un même match à un combiné.

Les recommandations automatiques restent limitées aux cinq marchés historiques, en attendant une évaluation des nouveaux marchés. Une cote disponible et une probabilité calculée ne constituent pas une validation prédictive. Les nouvelles options sont des choix manuels.

Les cartes gardent les cinq choix essentiels visibles. Les choix supplémentaires sont répartis dans Résultat, Buts et Équipes, dépliables. La comparaison utilise les mêmes clés et lignes que le ticket. Les moyennes, compteurs, dates, provenance et indicateurs de cache sont calculés par sélection, sans mélanger les lignes ni les équipes.

## Recette

`npm test`, `node scripts/prepare-pages.mjs`, puis `PGLITE_MODULE=… node scripts/check-markets-sql.mjs` pour la recette SQL isolée. Tester à 320 et 1280 px : ouverture des familles, sélection, conservation lors d’une nouvelle sélection, comparaison horizontale et absence de débordement de la page. Vérifier dans le diagnostic réel les lignes exactes, les variantes régionales et les moyennes. Le contrôle du compte fournisseur peut refuser certains nouveaux marchés : garder alors l’étape précédente active.

Après prolongation ou tirs au but, les nouveaux marchés utilisent seulement les deux premières périodes ESPN. Si ces scores manquent, leur règlement attend une vérification ; il ne reprend pas le score final. Le champ `fixtures.regulation` conserve cette information. Les cinq marchés historiques conservent leur traitement existant.

## Validation réelle du 2 novembre 2026

Étape 1 : [diagnostic réussi](https://github.com/Patfoort47-gif/BetOptimum/actions/runs/41434367481), 13 rencontres, quatre compétitions, plusieurs bookmakers sur chaque sélection supplémentaire.

Étape 2 : [diagnostic réussi](https://github.com/Patfoort47-gif/BetOptimum/actions/runs/41434955697), doubles chances et remboursé si nul confirmés sur 13 rencontres de quatre compétitions. Aucune ligne `team_totals` renvoyée dans ces réponses : les totaux par équipe restent absents de la collecte réelle observée. Le parseur et le règlement sont testés avec des données simulées ; leur couverture réelle reste à vérifier lorsqu’une ligne est fournie.
