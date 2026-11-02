// Bounded read-only diagnostic, executed in Actions with the provider secret.
import {readFile,writeFile} from 'node:fs/promises';
import {collectPropLine} from './propline-odds.mjs';
import {isInSecondaryOddsWindow,summarizeOffers} from '../odds-cache.js';
if(!process.env.PROPLINE_API_KEY)throw new Error('Secret PROPLINE_API_KEY absent');
const sports={'Premier League':'soccer_epl','Ligue 1':'soccer_france_ligue_one','La Liga':'soccer_spain_la_liga','Serie A':'soccer_italy_serie_a','Bundesliga':'soccer_germany_bundesliga','Ligue des champions':'soccer_uefa_champs_league','Europa League':'soccer_uefa_europa_league','Conference League':'soccer_uefa_europa_conference_league'};
const data=JSON.parse(await readFile('data/fixtures.json','utf8')),matches=data.matches.filter(m=>sports[m.league]&&isInSecondaryOddsWindow(m));
if(!matches.length)throw new Error('Aucun match dans la fenêtre de 48 h');
const result=await collectPropLine(matches,sports);
const rows=[...result.offersByMatch].map(([matchId,offers])=>({matchId,league:matches.find(m=>m.id===matchId).league,offers,...summarizeOffers(offers)}));
const validated=rows.filter(row=>['home','draw','away','over','btts'].every(key=>row.counts[key]>=2));
const report={capturedAt:new Date().toISOString(),requested:result.requested,succeeded:result.succeeded,failures:result.failures,matches:rows,validatedMatches:validated.length,validatedLeagues:[...new Set(validated.map(row=>row.league))]};
await writeFile('french-odds-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(result.failures.length||validated.length<2||report.validatedLeagues.length<2)throw new Error('Validation PropLine incomplète : plusieurs rencontres et compétitions avec cinq sélections et plusieurs bookmakers requises');
