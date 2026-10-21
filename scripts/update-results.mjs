import { readFile, writeFile } from 'node:fs/promises';

const leagues = ['eng.1','fra.1','esp.1','ita.1','ger.1','uefa.champions','uefa.europa'];
const dateKey = date => date.toISOString().slice(0, 10).replaceAll('-', '');
const today = new Date(); today.setUTCHours(0, 0, 0, 0);
const yesterday = new Date(today); yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const days = [yesterday, today].map(dateKey);
const settlements = [];

for (const league of leagues) {
  for (const day of days) {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${day}&limit=100`, { headers:{'User-Agent':'BetMaster-Results/1.0'} });
    if (!response.ok) throw new Error(`${league}: HTTP ${response.status}`);
    const data = await response.json();
    for (const event of data.events ?? []) {
      const competition = event.competitions?.[0];
      const home = competition?.competitors?.find(team => team.homeAway === 'home');
      const away = competition?.competitors?.find(team => team.homeAway === 'away');
      if (!event.status?.type?.completed || home?.score == null || away?.score == null) continue;
      settlements.push({ id:`espn-${event.id}`, date:event.date.slice(0,10), home:home.team?.displayName, away:away.team?.displayName, homeScore:Number(home.score), awayScore:Number(away.score), completed:true });
    }
  }
}

const file = 'data/fixtures.json';
const data = JSON.parse(await readFile(file, 'utf8'));
const merged = new Map((data.settlements ?? []).map(result => [result.id, result]));
for (const result of settlements) merged.set(result.id, result);
data.settlements = [...merged.values()].sort((a,b) => b.date.localeCompare(a.date));
data.scoresUpdatedAt = new Date().toISOString();
data.coverage = {...data.coverage, settlements:data.settlements.length};
await writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(`${settlements.length} résultats contrôlés, ${data.settlements.length} disponibles pour régler les paris.`);
