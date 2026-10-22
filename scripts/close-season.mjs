// Clôture des saisons de la ligue générale terminées (BET-55). Lancé chaque jour par close-season.yml ; idempotent et relançable.
import { closeFinishedSeasons } from './league-engine.mjs';
import { awardSpecialTitles } from './special-engine.mjs';
import { createAdmin } from './supabase-admin.mjs';

const admin = createAdmin();
if (!admin) { console.log('Supabase (service_role) non configuré : clôture des saisons ignorée.'); process.exit(0); }
console.log(`${await closeFinishedSeasons(admin)} saison(s) clôturée(s), ${await awardSpecialTitles(admin)} titre(s) de ligue spéciale attribué(s).`);
