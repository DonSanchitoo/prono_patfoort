# BET-169 : proposition validée le 3 novembre 2026

Validation explicite reçue dans le chat et inscrite dans YouTrack le 3 novembre 2026. Implémentation et calendrier : `../RANKING_CONFIRMATION.md`.

Étude au 3 novembre 2026. Aucun moteur ni classement de production modifié par cette PR. Reproduction : `node scripts/study-league-scoring.mjs` (fixture réelle anonymisée versionnée, semaine du 2 novembre). Le deuxième argument permet une autre semaine : `node scripts/study-league-scoring.mjs docs/studies/BET-169-anonymized.json 2026-10-26`.

## Cas réellement observé

Les 25 entrées historiques anonymisées couvrent trois joueurs. La semaine étudiée compte 17 décisions. Un appel en lecture à `league_round_standings('2026-11-02')` confirme exactement 1/1 à 40,00, 2/5 à 3,02 et 5/11 à -8,10. Les identifiants, pseudos et mises privées ne sont pas exportés.

| Joueur | Gagnés / décidés | Actuel | Pertes à zéro | Pondéré k=10 | Proposition seuil 10 |
| --- | ---: | ---: | ---: | ---: | --- |
| J1 | 1 / 1 | 40,00 | 40,00 | 3,64 | Provisoire, 40,00 |
| J3 | 2 / 5 | 3,02 | 33,02 | 1,01 | Provisoire, 3,02 |
| J2 | 5 / 11 | -8,10 | 51,90 | -4,24 | Confirmé, -8,10 |

Cotes gagnantes exactes : J1 10,27703754 (plafond 5) ; J3 2,33 et 2,9722 ; J2 1,48, 2,38, 2,17, 2,01, 2,15. Les pertes valent -10 chacune. Les cotes perdantes sont conservées dans la fixture. La somme est arrondie au centième après le score de chaque entrée, comme le modèle courant.

Écart J3/J2 : 11,12 points actuellement ; 18,88 dans l’autre sens sans pertes ; 5,25 avec pondération, mais J1 reste devant tous les autres. Le nombre de bonnes réponses seul ne permet pas de comparer des cotes différentes : J3 a deux gains plus difficiles. La proposition ne transforme donc pas cet écart en points arbitraires.

## Analyse des quatre variantes

1. Actuel : explicable, les erreurs coûtent réellement des points, mais un gain plafonné à 40 peut dominer une petite série.
2. Pertes à zéro : J2 passe premier ; toute activité supplémentaire ne peut que faire monter ou conserver le score. Favorise donc le volume, même sans qualité supplémentaire. Écartée.
3. Brut × n/(n+k), k=10 : J1 reste premier dans le cas réel. Les scores négatifs sont rapprochés de zéro, ce qui avantage également les petites séries perdantes. La sensibilité k=5/10/20 figure dans le JSON. Écartée.
4. Seuil confirmé : empêche une victoire isolée d’occuper le premier rang confirmé, sans changer la valeur d’un gain ou d’une défaite. Proposition retenue pour validation, avec une zone provisoire distincte.

## Règle exacte proposée

Conserver la formule : gagné = arrondi au centième de `10 × (min(cote effective certifiée, 5) - 1)` ; perdu = -10 ; annulé/remboursé = 0. Les annulations de sélections d’un combiné utilisent la cote effective du règlement serveur, jamais la cote avant annulation. Systèmes exclus des ligues comme aujourd’hui, y compris gains partiels. Aucun changement aux tickets ou à la bankroll.

Un joueur devient confirmé à **10 décisions gagnées ou perdues dans le périmètre du classement consulté**. Les annulations et tickets en attente ne comptent pas. En dessous : zone « Provisoires · n/10 résultats », score brut visible, sans numéro de rang confirmé, podium ni titre de champion confirmé. Si personne n’atteint 10 : « Aucun classement confirmé pour le moment ». Aucun coefficient ajouté. Un joueur à 100 défaites conserve -1000 points ; le volume ne lui donne aucun bonus.

Justification du seuil : 5 confirmerait déjà J3 dans le cas réel ; 20 ne confirmerait personne. 10 correspond au minimum déjà utilisé pour la qualification en ligue générale. Il s’agit d’un choix produit raisonnable sur ce petit échantillon de trois joueurs, pas d’une preuve statistique universelle. Les contraintes de participation au défi et de promotion restent indépendantes et inchangées.

Départage des confirmés : points / ROI hors annulations / victoires / UUID, inchangé. Le module d’étude utilise le label anonyme pour simuler le dernier départage, pas pour proposer un nouveau départage en production. ROI de l’étude : points bruts / (10 × décisions), selon le périmètre courant de ligue. Le futur moteur devra continuer d’utiliser le ROI certifié existant, surtout lors d’annulations historiques.

## Recette contrôlée

Le JSON joint compare A 1/1, B 5/11 et C 10/20 à cote 2 : scores 10, -10 et 0. Seuls B et C sont confirmés, C précède B ; A reste provisoire. Les volumes 3/10/30/100 sont comparés à taux exactement identique de 100 % et 0 %. Une série à environ 33 % et des cotes 1,1 / 2 / 5 / 10 complètent la sensibilité. Le test couvre plafond, égalités, n=9/10, annulations, combiné à cote effective et exclusion des systèmes partiels. Les essais de pure étude ne remplacent pas la recette future SQL, écrans et clôtures.

## Transition proposée

Après validation explicite dans YouTrack : versionner cette règle de classement en V3, puis l’activer au début de la prochaine journée hebdomadaire suivant le déploiement pour la ligue générale. Ne pas recalculer les journées archivées, promotions ni récompenses. Stocker la version dans les snapshots de clôture. Les points numériques restent compatibles avec V2 ; seuls l’accès au rang confirmé et son affichage changent.

Pour les ligues privées et spéciales : même seuil dans chaque période, mais activation au début de leur prochaine période complète (journée pour le général, saison ou mois selon la ligue). Conserver leurs critères de titre existants en plus du rang confirmé. Pas d’activation au milieu d’une période, pas de changement rétroactif des rangs archivés. Vérifier les périodes courtes où atteindre 10 décisions est impossible et afficher l’absence de classement confirmé, plutôt qu’un faux champion. Ce compromis doit être accepté explicitement.

Exemples de règlement proposés : « Un résultat gagnant à 2,00 rapporte 10 points. Une défaite retire 10 points. Un match annulé rapporte 0 point. Le classement est provisoire avant 10 pronostics décidés sur la période ; les tickets en attente et les remboursements ne comptent pas dans ce seuil. »

## Validation demandée

Valider ou amender le **seuil de 10, les pertes à -10 conservées, la zone provisoire séparée et l’activation à la prochaine période sans réécriture des archives**. Le ticket impose : « Avant toute bascule, une validation explicite du comparatif et de la stratégie d’historique est obtenue dans le ticket. » Tant que cette validation manque, aucune migration de scoring ni bascule de classement ne doit être déployée et le ticket reste ouvert.
