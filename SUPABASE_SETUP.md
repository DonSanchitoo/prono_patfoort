# Activer les comptes BetMaster

La synchronisation utilise l'offre gratuite de Supabase. Les données de chaque compte sont isolées par les règles RLS de la base.

1. Créez un projet sur [supabase.com](https://supabase.com/), puis ouvrez **SQL Editor** et exécutez le contenu de `supabase-schema.sql`.
   Pour activer les profils et classements de la V3, exécutez ensuite `supabase-v3-schema.sql` dans le même éditeur.
2. Dans **Authentication > URL Configuration**, renseignez :
   - Site URL : `https://patfoort47-gif.github.io/prono_patfoort/`
   - Redirect URL : `https://patfoort47-gif.github.io/prono_patfoort/`
3. Dans le dépôt GitHub, ouvrez **Settings > Secrets and variables > Actions > Variables**, puis ajoutez :
   - `SUPABASE_URL` : l'URL du projet Supabase ;
   - `SUPABASE_ANON_KEY` : la clé publique `anon` / `publishable` du projet.
   Le déploiement accepte également ces valeurs dans **Secrets**. Si Supabase affiche une clé au nouveau format, vous pouvez la nommer `SUPABASE_PUBLISHABLE_KEY`.
4. Relancez le workflow **Deploy GitHub Pages** ou poussez un commit sur `main`.

N'ajoutez jamais la clé `service_role` : elle est secrète et n'est ni nécessaire ni sûre dans une application web. La clé `anon` est publique ; la confidentialité repose sur les politiques RLS fournies dans le script SQL.
