# Confirmation de compte (BET-167)

Le template `supabase/templates/confirmation.html` cible Supabase Auth « Confirm signup ».
Objet : `Bienvenue au Club BetOptimum : confirme ton adresse`.
Pré-en-tête inclus dans le HTML. Le fichier `.txt` fournit une alternative pour un fournisseur acceptant le multipart ; la configuration Auth ne propose pas de champ texte distinct. Aucun envoi de campagne, pixel ou changement de consentement.

Déployer uniquement `mailer_templates_confirmation_content` et `mailer_subjects_confirmation` via l’API Management `/v1/projects/{ref}/config/auth`. Ne pas toucher aux templates de récupération et changement d’adresse, ni au site URL ou aux redirections autorisées. Bouton et secours utilisent exclusivement `{{ .ConfirmationURL }}`.

## Expéditeur et limites

À l’inspection du projet, aucun SMTP personnalisé n’est configuré. Le template ne change donc pas l’adresse d’envoi Supabase. Pour une identité BetOptimum complète, fournir un domaine maîtrisé, un fournisseur SMTP, une adresse d’envoi et une adresse de réponse surveillée. Configurer le SMTP dans Auth sans commettre ses secrets. Installer les enregistrements SPF et DKIM du fournisseur, puis DMARC (commencer par une politique de surveillance et contrôler l’alignement). Vérifier les en-têtes Authentication-Results d’un message reçu. Ne pas prétendre supprimer l’avertissement Outlook.

## Recette restant à fournir

- Envoyer par inscription d’un compte de recette autorisé. Confirmer et vérifier l’activation, la redirection autorisée et la session ; tester renvoi, expiration et réutilisation sans publier de jeton.
- Captures Gmail, Outlook, Apple Mail, téléphone et ordinateur, images bloquées, clair et sombre. Un aperçu navigateur ne valide pas ces clients.
- Vérifier le domaine d’envoi et le Reply-To après configuration SMTP.
- Contrôler connexion et récupération indépendantes, consentements newsletter/alertes inchangés.

Ne fermer le ticket qu’après ces vérifications. Aucun compte ni destinataire de recette n’est inventé.
