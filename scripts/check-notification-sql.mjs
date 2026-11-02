// PGLITE_MODULE=/tmp/bet-ui-tools/node_modules/@electric-sql/pglite/dist/index.js node scripts/check-notification-sql.mjs
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite(),uid='00000000-0000-0000-0000-000000000001';
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select '${uid}'::uuid$$;create table public.player_accounts(user_id uuid,bankroll numeric);create table public.bets(id uuid,user_id uuid,status text,bet_type text,stake numeric,odds numeric,selections jsonb);create table public.user_states(user_id uuid primary key,state jsonb);insert into auth.users values('${uid}');`);
// V23 possède des extensions d’export sans rapport : prendre les tables et RPC notification.
let v23=await readFile('supabase/migrations/supabase-v23-schema.sql','utf8');v23=v23.slice(0,v23.indexOf('-- Étend l’export existant'))+'commit;';await db.exec(v23);
for(const v of [24,26,27,28,33,34])await db.exec(await readFile(`supabase/migrations/supabase-v${v}-schema.sql`,'utf8'));
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
await q(`insert into notification_endpoints(user_id,channel,encrypted) values($1,'email','demo')`,[uid]);
const p={enabled:true,channels:['email'],daily_briefing:true,briefing_minute:0,timezone:'Europe/Paris',quiet_start:600,quiet_end:1000,min_value:.05,min_confidence:.6,teams:[],leagues:[],max_per_hour:3};
await q('select save_notification_preferences($1)',[JSON.stringify(p)]);
assert.equal((await q('select quiet_start from notification_preferences'))[0].quiet_start,0);
const [{date_label:day}]=await q(`select (now() at time zone 'Europe/Paris')::date::text as date_label`),event={briefing:true,kinds:['daily'],daily_revision:0,date:day,kickoff:new Date(Date.now()+3600000).toISOString()};
const queue=async(e=event)=>(await q('select enqueue_notification_briefing($1,$2) ok',[uid,JSON.stringify(e)]))[0].ok;
assert.equal(await queue(),true);assert.equal(await queue(),false);
await q(`update notification_deliveries set status='cancelled'`);await q(`update notification_preferences set daily_revision=1`);
assert.equal(await queue({...event,daily_revision:1}),true);assert.equal((await q('select count(*)::int n from notification_deliveries'))[0].n,1);
await q(`update notification_preferences set quiet_start=0,quiet_end=1439`);
assert.equal((await q('select * from claim_notification_deliveries()')).length,1);
await q(`update notification_deliveries set status='sent'`);await q(`update notification_preferences set daily_revision=2`);
assert.equal(await queue({...event,daily_revision:2}),false);
await q(`insert into user_states values($1,'{"favoriteTeams":["Lille"],"favoriteLeagues":[]}')`,[uid]);
assert.deepEqual((await q('select notification_briefing_snapshot($1) s',[uid]))[0].s.favorites.teams,['Lille']);
await q(`update notification_preferences set enabled=false`);assert.equal(await queue({...event,daily_revision:2}),false);
await db.close();console.log('SQL : migrations, consentement, replanification, unicité et silence vérifiés.');
