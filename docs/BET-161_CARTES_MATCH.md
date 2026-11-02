# BET-161 : cartes de match immersives

La carte suit une lecture progressive : affiche du match sur un décor de stade vectoriel local, sélection du modèle et issue 1N2, cinq pronostics classés par confiance, marchés supplémentaires repliables, statistiques synthétiques puis accès à la fiche complète et comparaison des bookmakers. Le premier pronostic occupe deux rangées sur une carte large ; les alternatives passent sur deux colonnes sur téléphone.

Les calculs et les règles de pari sont conservés. Les cotes réelles/estimées, les offres anciennes ou sans date, la value et les favoris restent identifiables. Le décor SVG est local, décoratif, sans nouveau service tiers ni téléchargement photographique. Les titres et noms d’équipes restent du texte accessible. La confiance maximale est signalée sans animation.

## Vérification

- `npm test` : 271 tests réussis.
- `node scripts/prepare-pages.mjs` : 43 modules et ressources publiques préparés ; le décor est inclus dans `styles/`.
- `NODE_PATH=/tmp/bet-ui-tools/node_modules node scripts/check-match-cards.cjs` : Chromium local, largeurs 320, 390, 768 et 1440, thèmes clair et sombre. Pas de débordement horizontal, cinq pronostics, sélection principale et indicateurs visibles, ajout au ticket et favoris, absence d’erreur JavaScript, audit axe WCAG A/AA sur les cartes. Les dépendances de recette restent hors du dépôt (`playwright`, `axe-core`).
- Captures inspectées à 320 et 1440 px ; cotes maintenues sur une ligne, adaptations mobiles du compte à rebours et des noms d’équipes.

La recette utilise un compte simulé et des données de match contrôlées, sans placer de pari serveur. Les logos externes sont volontairement bloqués pour vérifier le repli sur les initiales.
