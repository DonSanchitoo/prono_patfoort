# Validation juridique du Club (BET-63)

Document à remettre à un juriste avant la mise en production des jetons et de la boutique. Il résume ce que fait le site et pose les cinq questions du ticket BET-63. Un avis écrit sur les points 1 à 4 est obligatoire avant de lancer les jetons et la boutique ; l'état du suivi figure en bas de page.

## Ce que fait BetMaster

- Pronostics de football **virtuels** : aucune mise réelle, aucun gain réel, aucun lot. Site réservé aux 18 ans et plus, hébergé sur GitHub Pages, comptes sur Supabase.
- Ligues (générale, spéciales, privées) classées selon des points calculés sur des paris virtuels, avec montées et descentes mensuelles.
- Les **jetons** sont une monnaie fictive distribuée en fin de saison, en fin de compétition et dans des défis hebdomadaires. Ils servent seulement dans le jeu : boutique d'objets virtuels (revente à 30 % du prix), bouclier de série, recharge de bankroll fictive, duels entre amis, entrée d'éventuelles ligues premium. Ils ne s'achètent pas avec de l'argent, ne s'échangent pas, ne se transfèrent pas et ne se convertissent ni en argent ni en lots (règlement du club, page « Règlement du club »).
- Les calculs sont faits par le serveur (RLS Supabase, fonctions `security definer`) : le navigateur ne peut écrire ni bankroll, ni statistique, ni jeton.

## Questions à faire valider

1. **Jetons fictifs et ANJ.** Les jetons sont sans valeur, jamais achetables avec de l'argent réel, non revendables à d'autres joueurs, non échangeables, non convertibles. Les cagnottes de fin de saison, les duels entre amis (mise de jetons, le meilleur pronostic remporte le tout) et d'éventuelles ligues premium payées en jetons font-ils de BetMaster un jeu d'argent soumis à l'ANJ ? Faut-il changer le vocabulaire (« cagnotte », « mise ») ou supprimer les duels ?
2. **Ligues premium.** Aucune n'existe au lancement (le champ prix en jetons est prévu, inutilisé). Si l'accès devient un jour payant en euros, sans aucun gain à la clé, quelles conditions faut-il (CGV, droit de rétractation, TVA, mentions) ?
3. **Marques.** Les objets et les stades de la boutique portent des noms génériques (« Ballon doré », « Soulier doré », « Stade de Rio » ... avec des designs inspirés). Choisir entre noms génériques avec designs inspirés et licences officielles. Points sensibles : « Ballon d'Or » et « Soulier d'or » (marques déposées), noms de stades, apparence des stades. Le catalogue du site (`shop.js`) ne contient aucun nom de marque ni de stade réel ; un test l'impose.
4. **Logos ESPN.** Les logos des compétitions et des clubs (blasons ESPN) sont affichés dans les ligues spéciales, le club de cœur et la boutique, chargés en direct depuis `a.espncdn.com`. Cet usage est-il acceptable ? Faut-il un accord ou des visuels génériques ?
5. **RGPD.** Données publiques du profil (pseudo, avatar, division, statistiques, abonnements, fil d'activité, trophées, niveau, titre et cadre équipés), club de cœur facultatif, ligues privées visibles des seuls membres, connexion Google, suppression du compte (efface profil, paris, classements, XP, jetons), export des données en JSON, durée de conservation (tant que le compte existe). Les pages Confidentialité et Mentions légales décrivent ces traitements : faut-il les compléter (base légale, durée par catégorie, sous-traitants Supabase, Google, ESPN, jsDelivr, Google Fonts, transferts hors UE) ?

## Ce qui est déjà fait dans le site

- Page « Règlement du club » (pied de page) : points, quota, ligues, montées et descentes, ligues spéciales, jetons et boutique, contrôles.
- Mentions légales : nature du service, jetons sans valeur, logos et marques des tiers.
- Confidentialité : comptes, paris et bankroll sur le serveur, XP, trophées, jetons, boutique, duels, ligues privées, abonnements et fil d'activité publics, club de cœur, connexion Google, droits (export, suppression, pseudo, visibilité).
- Jeu responsable : mentions « paris virtuels · 18+ · aucune garantie de gain » conservées.

## Suivi

| Point | Avis écrit obtenu | Date | Remarques |
|-------|-------------------|------|-----------|
| 1. Jetons et ANJ | non | | Bloque la mise en production des jetons, des duels et de la boutique |
| 2. Ligues premium | non | | Aucune ligue premium n'est ouverte |
| 3. Marques et stades | non | | Noms génériques en attendant |
| 4. Logos ESPN | non | | |
| 5. RGPD | non | | Pages légales à relire |

Tant que les points 1 à 4 n'ont pas d'avis écrit, la décision de mise en production des jetons et de la boutique revient au propriétaire du projet.
