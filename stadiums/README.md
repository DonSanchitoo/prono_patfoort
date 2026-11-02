# Photos des cartes de match (BET-162)

Le catalogue `stadiums.js` associe une photographie locale au `homeId` ESPN. Aucun rapprochement par nom, logo ou chaîne approximative n’est utilisé.

Le pipeline conserve `neutralSite` et `venue.id` fournis par ESPN. Un terrain neutre conserve toujours le décor générique. Un lieu explicite inconnu du catalogue conserve aussi ce décor : le stade habituel n’est jamais substitué à un stade temporaire connu. En l’absence de lieu, la photo est identifiée comme celle du stade habituel et ne constitue pas une confirmation du lieu de la rencontre. Les anciens calendriers restent compatibles.

Chaque entrée doit donner le nom, l’identifiant ESPN du stade lorsqu’il a été vérifié, le fichier WebP local, l’auteur, la page source, la licence et son URL. Le volet « Photo du stade » porte ces crédits sur chaque carte. Une image dont les droits ou l’association ne sont pas vérifiés ne doit pas être ajoutée. Les adaptations sous CC BY-SA gardent la licence d’origine.

Les fichiers sont redimensionnés à 960 pixels de large au maximum et encodés en WebP (objectif : moins de 100 Ko chacun). Le navigateur les recadre avec `object-fit: cover`, les décode de manière asynchrone et les charge en différé. Aucun hébergeur tiers n’est contacté pour les photos lors de la consultation. Le voile sombre est identique dans les deux thèmes. Les dimensions de l’en-tête restent définies par son contenu ; l’image absolue ne provoque aucun décalage. Les crédits sont placés dans l’en-tête sans modifier sa hauteur. En cas d’échec, seul le décor générique reste visible.

La publication doit inclure le dossier `stadiums/` et les crédits. Vérifier les cartes à 320/390/768/1440 px, dans les deux thèmes, ainsi que le terrain neutre, le stade inconnu, le stade temporaire, la réponse 404, les favoris, les sélections, les matchs terminés/annulés/en direct et le chargement hors écran.
