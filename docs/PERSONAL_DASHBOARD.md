# Mes paris : cockpit certifié (BET-168)

Appliquer V37 après V36 avant publication. `my_bet_dashboard` ne lit que `auth.uid()` et refuse les sessions anonymes. Aucune écriture sur les tickets, résultats, cotes ou comptes. Pagination serveur de 20, ordre date décroissante puis UUID ; page bornée si les résultats changent. Recherche littérale insensible à la casse dans les sélections, 100 caractères maximum. Synthèse indépendante des filtres de statut et recherche, mais commune à la période.

Le chargement courant des paris utilisés par les quotas et défis ne demande plus tout l’historique : il se limite à la semaine en cours (borne conservatrice d’une heure en hiver, règles de semaine Paris maintenues). Le profil reçoit ses agrégats historiques du serveur.

## Lecture des montants

- Mises, statuts et engagements : date de prise du ticket dans la période.
- Retours et net réalisé : date de règlement dans la période, y compris tickets pris avant celle-ci. Remboursements : retour égal à la mise, net zéro, exclus du taux de réussite. Un système gagnant peut avoir un net négatif.
- Bankroll : solde enregistré dans `player_accounts`. La courbe est calculée côté serveur depuis les mouvements certifiés, ancrée sur ce solde, regroupée par jour Paris. Les apports sont nommés et marqués. Variation du solde et pourcentage incluent les apports ; division par zéro évitée.
- La base d’ouverture est le solde serveur moins les mouvements certifiés connus. Les anciens états migrés ne permettent pas de reconstituer des mouvements antérieurs absents de la base. Aucun mouvement fictif n’est ajouté. Les paris historiques sans date de règlement ne peuvent pas être placés dans la courbe ni le bilan daté.
- Cote totale : cote enregistrée du simple/combiné. Systèmes : pas de cote synthétique ; cotes fidèles de chaque sous-pari dans le détail.

## Vérifications

`npm test` : affichage des montants, potentiel séparé et rendu des tickets.
`PGLITE_MODULE=../work/ui/node_modules/@electric-sql/pglite/dist/index.js node scripts/check-personal-dashboard.mjs` après installation locale de `@electric-sql/pglite` sous `work/ui` : migration réelle sur PostgreSQL local, 25 tickets, pages 20 + 5, recherche littérale, statuts, remboursement, système partiel, solde et isolation de deux joueurs, refus anonyme. Aucun compte de production créé.

Captures `docs/recette/BET-168-*.png` : recette navigateur avec réponses de l’API simulées issues du jeu SQL (données fictives explicitement réservées aux tests). Desktop et 320 px clair/sombre ; navigation, erreur et reprise, absence de débordement. Les graphiques exposent leurs valeurs en texte dépliable et leurs infobulles SVG ; les statuts ont chacun nom et nombre.

À compléter avant clôture : recette de bout en bout avec un compte de démonstration autorisé et captures avant/après de son historique réel, lecteur d’écran réel. Les captures de test ne valent pas validation d’un compte connecté en production.

Production : V37 appliquée et vérification en transaction annulée sur trois comptes existants : nombre de tickets, limite de 20, solde exact et dernier point de courbe identique au compte. Droit EXECUTE présent pour authenticated, absent pour anon. Aucun résultat de pari ni solde modifié.

La RPC est déclarée STABLE : le compte et les mouvements sont lus dans le même snapshot PostgreSQL, même si un règlement concurrent intervient pendant la requête.
