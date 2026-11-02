# Composition des matchs et du ticket (BET-157 à BET-159)

BET-157 regroupe les choix supplémentaires en Résultat et Buts. Les marchés par équipe rejoignent Buts. Les cinq choix prioritaires, leur tri, leurs sources et leur sélection restent conservés. Le panneau redondant des sources disparaît.

BET-158 conserve le nombre de rencontres et une fraîcheur courte. Les dates du calendrier, des scores et du flux de cotes sont accessibles dans Détails des données. Les seuils de fraîcheur restent ceux de data-freshness.js.

BET-159 présente trois étapes : trouver des sélections, ajuster le ticket, mise et confirmation. La recherche remplit le ticket et le conserve en l'absence de résultat. Les cotes et la confiance sont distinctes ; les modes ont un état aria-pressed. Un ticket vide affiche zéro engagement et zéro gain potentiel. Aucun algorithme de recherche, règle de règlement ou contrôle serveur n'est modifié.

## Vérifications

- `npm test` : 271 tests réussis dans l'environnement autorisant les sous-processus.
- `node scripts/prepare-pages.mjs` : préparation réussie.
- Serveur local sur 4173, puis `NODE_PATH=/tmp/bet-ui-tools/node_modules node scripts/check-composition-ui.cjs` : 320, 390 et 1280 px, tous les marchés accessibles sans doublon, DNB et totaux équipe, navigation clavier des détails, recherche, modes, mise et engagement, ticket vide, absence de résultat, absence d'erreur JS et de débordement, audit axe de la carte.
- `NODE_PATH=/tmp/bet-ui-tools/node_modules node scripts/check-ticket-ux.cjs` : 320, 360, 390, 430 et 1280 px, clair et sombre, interactions ticket et historique, montants, tiroir mobile et audit axe de la page.

Tests navigateur réalisés avec des données et un compte simulés, sans placement de pari réel ni appel au fournisseur. Chromium uniquement.

Les branches individuelles partent de main. La branche BET-157-159-integration contient les trois changements réunis et leurs résolutions de conflits dans app.js et styles/components.css. Utiliser la pull request d'intégration pour une fusion unique.
