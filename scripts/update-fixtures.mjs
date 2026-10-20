import { mkdir, writeFile } from 'node:fs/promises';

const leagues = [
  ['eng.1', 'Premier League', 34], ['fra.1', 'Ligue 1', 30],
  ['esp.1', 'La Liga', 33], ['ita.1', 'Serie A', 31],
  ['ger.1', 'Bundesliga', 32], ['uefa.champions', 'Ligue des champions', 42],
  ['uefa.europa', 'Europa League', 28]
];
const giants = ['Real Madrid','Barcelona','Manchester City','Manchester United','Liverpool','Arsenal','Chelsea','Bayern','Paris Saint-Germain','Marseille','Internazionale','Milan','Juventus','Napoli','Atlético Madrid','Borussia Dortmund'];
const dateKey = date => date.toISOString().slice(0, 10).replaceAll('-', '');
const start = new Date(); start.setUTCHours(0, 0, 0, 0);
const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7);
const days = Array.from({ length: 8 }, (_, offset) => { const date = new Date(start); date.setUTCDate(date.getUTCDate() + offset); return dateKey(date); });

function model(home, away, priority) {
  const homeBig = giants.some(name => home.includes(name));
  const awayBig = giants.some(name => away.includes(name));
  const homeGoals = 1.45 + (homeBig ? .45 : 0) + (priority > 60 ? .15 : 0);
  const awayGoals = 1.15 + (awayBig ? .35 : 0) + (priority > 60 ? .1 : 0);
  const total = homeGoals + awayGoals;
  return {
    homeGoals, awayGoals,
    odds: {
      home: Number(Math.max(1.3, 3.45 / homeGoals).toFixed(2)),
      draw: Number((3.15 + Math.abs(homeGoals - awayGoals) * .55).toFixed(2)),
      away: Number(Math.max(1.45, 3.65 / awayGoals).toFixed(2)),
      over: Number(Math.max(1.45, 3.75 / total).toFixed(2)),
      btts: Number(Math.max(1.45, 2.75 / Math.min(homeGoals, awayGoals)).toFixed(2))
    }
  };
}

const results = await Promise.allSettled(leagues.map(async ([slug, label, weight]) => {
  const events = [];
  for (const day of days) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${day}&limit=100`;
    const response = await fetch(url, { headers: { 'User-Agent': 'BetMaster-Fixtures/1.0' } });
    if (!response.ok) throw new Error(`${slug}: HTTP ${response.status} (${day})`);
    const data = await response.json();
    events.push(...(data.events ?? []));
  }
  return events.map(event => {
    const competition = event.competitions?.[0];
    const homeTeam = competition?.competitors?.find(team => team.homeAway === 'home')?.team?.displayName;
    const awayTeam = competition?.competitors?.find(team => team.homeAway === 'away')?.team?.displayName;
    if (!homeTeam || !awayTeam) return null;
    const giantCount = giants.filter(name => homeTeam.includes(name) || awayTeam.includes(name)).length;
    const priority = weight + giantCount * 30;
    const kickoff = new Date(event.date);
    return {
      id: `espn-${event.id}`, date: kickoff.toISOString().slice(0, 10),
      time: kickoff.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }),
      league: label, home: homeTeam, away: awayTeam,
      priority, featured: priority >= 75, status: event.status?.type?.description ?? 'Programmé',
      ...model(homeTeam, awayTeam, priority)
    };
  }).filter(Boolean);
}));

const matches = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
const failures = results.flatMap((result, index) => result.status === 'rejected' ? [`${leagues[index][0]}: ${result.reason?.message ?? 'échec inconnu'}`] : []);
const unique = [...new Map(matches.map(match => [match.id, match])).values()]
  .filter(match => match.date >= start.toISOString().slice(0, 10) && match.date <= end.toISOString().slice(0, 10))
  .sort((a, b) => a.date.localeCompare(b.date) || b.priority - a.priority);
await mkdir('data', { recursive: true });
await writeFile('data/fixtures.json', `${JSON.stringify({ generatedAt: new Date().toISOString(), source: 'ESPN public scoreboard', providerStatus: failures.length ? 'partial' : 'ok', failures, matches: unique }, null, 2)}\n`);
console.log(`${unique.length} rencontres officielles enregistrées (${results.filter(r => r.status === 'fulfilled').length}/${leagues.length} compétitions).`);
if (failures.length) console.warn(failures.join('\n'));
