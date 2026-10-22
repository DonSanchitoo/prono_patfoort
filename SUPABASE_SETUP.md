# Activer les comptes BetMaster

La synchronisation utilise l'offre gratuite de Supabase. Les données de chaque compte sont isolées par les règles RLS de la base.

1. Créez un projet sur [supabase.com](https://supabase.com/), puis ouvrez **SQL Editor** et exécutez le contenu de `supabase-schema.sql`.
   Pour activer les profils, avatars et classements de la V3, exécutez ensuite `supabase-v3-schema.sql` dans le même éditeur. Le script est réexécutable : relancez-le après une mise à jour de ces fonctions.
   Exécutez enfin `supabase-v4-schema.sql` (annuaire des joueurs) : il crée un profil public pour chaque compte, à l'inscription et pour les comptes existants, et rend le pseudo unique sans tenir compte de la casse. Ensuite `supabase-v5-schema.sql` (tickets certifiés) : paris, bankroll et statistiques passent côté serveur. Ordre à respecter : `supabase-schema.sql` (v1), `supabase-v3-schema.sql`, `supabase-v4-schema.sql`, `supabase-v5-schema.sql`, `supabase-v6-schema.sql` (points de ligue et quota hebdomadaire). Jouez ensuite la recette de sécurité `supabase-v5-recette.sql`.
   Contrôle après exécution (doit renvoyer 0) : `select count(*) from auth.users u left join public.profiles p on p.user_id = u.id where p.user_id is null;`
2. Dans **Authentication > URL Configuration**, renseignez :
   - Site URL : `https://patfoort47-gif.github.io/prono_patfoort/`
   - Redirect URL : `https://patfoort47-gif.github.io/prono_patfoort/`
3. Dans le dépôt GitHub, ouvrez **Settings > Secrets and variables > Actions > Variables**, puis ajoutez :
   - `SUPABASE_URL` : l'URL du projet Supabase ;
   - `SUPABASE_ANON_KEY` : la clé publique `anon` / `publishable` du projet.
   Le déploiement accepte également ces valeurs dans **Secrets**. Si Supabase affiche une clé au nouveau format, vous pouvez la nommer `SUPABASE_PUBLISHABLE_KEY`.
4. Relancez le workflow **Deploy GitHub Pages** ou poussez un commit sur `main`.

La clé `service_role` n'est jamais utilisée par le site ni écrite dans le dépôt. Elle sert uniquement aux workflows : ajoutez-la comme **Secret** GitHub Actions nommé `SUPABASE_SERVICE_ROLE_KEY` (Settings > Secrets and variables > Actions > Secrets) pour que `scripts/sync-supabase.mjs` envoie les matchs et règle les paris certifiés. Sans ce secret, les paris restent en attente. La clé `anon` est publique ; la confidentialité repose sur les politiques RLS et les fonctions des scripts SQL.
