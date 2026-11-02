# Profil : BET-145 à BET-149

Chaque ticket possède sa branche depuis main. `BET-145-149-integration` réunit les cinq modifications et résout les conflits de présentation dans `profile.js` et `styles/components.css`.

Validation sur l'intégration : 255 tests Node passent (`npm test`). La recette navigateur `NODE_PATH=/tmp/bet-ui-tools/node_modules node scripts/check-profile-ui.cjs` utilise Playwright et Chromium, un serveur lié à `127.0.0.1:4173`, des données fictives et bloque les services externes. Elle vérifie en 390 et 1366 px le repli de Saisons vers Aperçu, la série unique du radar, les compteurs 0/1, les listes et leurs liens, les quatre groupes de réglages, l'enregistrement et le rétablissement d'un réglage après erreur, la modification d'email et l'absence de débordement horizontal. Captures dans `work/`.

Avant publication : appliquer V35 après V34 pour BET-145. La migration est fournie, sans exécution sur la production. Les listes masquent les profils privés ; les compteurs reflètent toutes les relations réelles. La table `follows` conserve ses politiques RLS. Contrôler en base avec un profil public, son propriétaire et un autre utilisateur : compteurs exacts, pagination sans doublon, profil privé inaccessible à un tiers, personnes privées absentes des listes.

Le radar conserve les formules de la carte, documentées dans son volet « Comprendre les calculs ». Les notes sont bornées entre 20 et 99. Une donnée absente n'est plus transformée en note réelle : N/D et points connus seuls, sans polygone estimé. La comparaison des saisons reste disponible ; les archives ne sont pas supprimées.
