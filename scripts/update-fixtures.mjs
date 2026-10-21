import { mkdir, writeFile } from 'node:fs/promises';

const leagues = [
  ['eng.1', 'Premier League', 34], ['fra.1', 'Ligue 1', 30],
  ['esp.1', 'La Liga', 33], ['ita.1', 'Serie A', 31],
  ['ger.1', 'Bundesliga', 32], ['uefa.champions', 'Ligue des champions', 42],
  ['uefa.europa', 'Europa League', 28]
];
const providerMap = {
  'Premier League': ['PL', 'soccer_epl'], 'Ligue 1': ['FL1', 'soccer_france_ligue_one'],
  'La Liga': ['PD', 'soccer_spain_la_liga'], 'Serie A': ['SA', 'soccer_italy_serie_a'],
  'Bundesliga': ['BL1', 'soccer_germany_bundesliga'],
  'Ligue des champions': ['CL', 'soccer_uefa_champs_league'],
  'Europa League': [null, 'soccer_uefa_europa_league']
};
const giants = ['Real Madrid','Barcelona','Manchester City','Manchester United','Liverpool','Arsenal','Chelsea','Bayern','Paris Saint-Germain','Marseille','Internazionale','Milan','Juventus','Napoli','Atlético Madrid','Borussia Dortmund'];
const dateKey = date => date.toISOString().slice(0, 10).replaceAll('-', '');
const start = new Date(); start.setUTCHours(0, 0, 0, 0);
const historyStart = new Date(start); historyStart.setUTCDate(historyStart.getUTCDate() - 3);
const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7);
const days = Array.from({ length: 15 }, (_, index) => { const date = new Date(start); date.setUTCDate(date.getUTCDate() + index - 7); return dateKey(date); });

function model(home, away, priority) {
  const homeBig = giants.some(name => home.includes(name));
  const awayBig = giants.some(name => away.includes(name));
  const homeGoals = 1.45 + (homeBig ? .45 : 0) + (priority > 60 ? .15 : 0);
  const awayGoals = 1.15 + (awayBig ? .35 : 0) + (priority > 60 ? .1 : 0);
  const total = homeGoals + awayGoals;
  const overProbability = 1 - Math.exp(-total) * (1 + total + total ** 2 / 2);
  const bttsProbability = (1 - Math.exp(-homeGoals)) * (1 - Math.exp(-awayGoals));
  const fairOdd = probability => Number(Math.min(4.5, Math.max(1.15, 1 / (probability * .95))).toFixed(2));
  return {
    homeGoals, awayGoals,
    odds: {
      home: Number(Math.max(1.3, 3.45 / homeGoals).toFixed(2)),
      draw: Number((3.15 + Math.abs(homeGoals - awayGoals) * .55).toFixed(2)),
      away: Number(Math.max(1.45, 3.65 / awayGoals).toFixed(2)),
      over: fairOdd(overProbability),
      btts: fairOdd(bttsProbability)
    }
  };
}

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\b(fc|afc|cf|ac|ssc|calcio|football|club|de|the)\b/g, '').replace(/[^a-z0-9]/g, '');
const sameTeam = (a, b) => { const x = normalize(a), y = normalize(b); return x === y || (x.length > 5 && y.length > 5 && (x.includes(y) || y.includes(x))); };
const clamp = value => Math.max(.3, Math.min(3.5, value));

async function footballHistory() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('secret FOOTBALL_DATA_TOKEN absent');
  const dateFrom = new Date(start); dateFrom.setUTCDate(dateFrom.getUTCDate() - 90);
  const codes = [...new Set(Object.values(providerMap).map(([code]) => code).filter(Boolean))];
  const responses = [];
  for (const code of codes) {
    const url = `https://api.football-data.org/v4/competitions/${code}/matches?dateFrom=${dateFrom.toISOString().slice(0,10)}&dateTo=${start.toISOString().slice(0,10)}&status=FINISHED`;
    const response = await fetch(url, { headers: { 'X-Auth-Token': token } });
    if (response.status === 429) { await new Promise(resolve => setTimeout(resolve, 6500)); continue; }
    if (!response.ok) throw new Error(`football-data ${code}: HTTP ${response.status}`);
    const data = await response.json(); responses.push(...(data.matches ?? []));
  }
  return responses;
}

async function bookmakerOdds(upcomingMatches) {
  const key = process.env.THE_ODDS_API_KEY;
  if (!key) throw new Error('secret THE_ODDS_API_KEY absent');
  const sports = [...new Set(Object.values(providerMap).map(([, sport]) => sport))];
  const responses = [];
  for (const sport of sports) {
    const params = new URLSearchParams({ apiKey:key, regions:'eu', markets:'h2h', oddsFormat:'decimal', dateFormat:'iso' });
    const response = await fetch(`https://api.the-odds-api.com/v4/sports/${sport}/odds?${params}`);
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`The Odds API ${sport}: HTTP ${response.status}`);
    responses.push(...(await response.json()).map(event => ({...event, _sport:sport})));
  }
  const featured = upcomingMatches.filter(match=>!match.completed).slice().sort((a,b) => b.priority-a.priority).map(match => responses.find(event => sameTeam(event.home_team,match.home)&&sameTeam(event.away_team,match.away))).filter(Boolean).slice(0,5);
  for (const event of featured) {
    const params = new URLSearchParams({ apiKey:key, regions:'eu', markets:'btts,totals', oddsFormat:'decimal', dateFormat:'iso' });
    const response = await fetch(`https://api.the-odds-api.com/v4/sports/${event._sport}/events/${event.id}/odds?${params}`);
    if (!response.ok) continue;
    const extra = await response.json();
    for (const bookmaker of extra.bookmakers ?? []) {
      const target = event.bookmakers?.find(item => item.key === bookmaker.key);
      if (target) target.markets.push(...(bookmaker.markets ?? []));
      else event.bookmakers?.push(bookmaker);
    }
  }
  return responses;
}

function teamForm(team, history) {
  const games = history.filter(game => sameTeam(game.homeTeam?.name ?? '', team) || sameTeam(game.awayTeam?.name ?? '', team))
    .sort((a,b) => new Date(b.utcDate) - new Date(a.utcDate)).slice(0, 6);
  let scored = 0, conceded = 0;
  const form = games.map(game => {
    const home = sameTeam(game.homeTeam.name, team), own = Number(game.score?.fullTime?.[home?'home':'away'] ?? 0), opp = Number(game.score?.fullTime?.[home?'away':'home'] ?? 0);
    scored += own; conceded += opp; return own > opp ? 'V' : own === opp ? 'N' : 'D';
  });
  return { sample:games.length, form:form.join(''), avgScored:games.length?scored/games.length:null, avgConceded:games.length?conceded/games.length:null };
}

function consensus(match, oddsEvents) {
  const event = oddsEvents.find(item => sameTeam(item.home_team, match.home) && sameTeam(item.away_team, match.away));
  if (!event) return null;
  const offers = [];
  for (const bookmaker of event.bookmakers ?? []) {
    const offer = { name: bookmaker.title };
    const h2h = bookmaker.markets?.find(item => item.key === 'h2h');
    for (const outcome of h2h?.outcomes ?? []) {
      if (sameTeam(outcome.name, match.home)) offer.home = outcome.price;
      else if (sameTeam(outcome.name, match.away)) offer.away = outcome.price;
      else if (outcome.name === 'Draw') offer.draw = outcome.price;
    }
    const btts = bookmaker.markets?.find(item => item.key === 'btts');
    offer.btts = btts?.outcomes?.find(outcome => /^(yes|oui)$/i.test(outcome.name))?.price;
    const totals = bookmaker.markets?.find(item => item.key === 'totals');
    offer.over = totals?.outcomes?.find(outcome => /^over$/i.test(outcome.name) && Number(outcome.point) === 2.5)?.price;
    if (offer.home || offer.draw || offer.away || offer.btts || offer.over) offers.push(offer);
  }
  if (!offers.length) return null;
  const prices = key => offers.map(offer => Number(offer[key])).filter(price => Number.isFinite(price) && price > 0);
  const average = key => { const values=prices(key); return values.length ? Number((values.reduce((sum,price)=>sum+price,0)/values.length).toFixed(2)) : null };
  const counts = Object.fromEntries(['home','draw','away','over','btts'].map(key=>[key,prices(key).length]));
  return { offers, counts, home:average('home'), draw:average('draw'), away:average('away'), over:average('over'), btts:average('btts') };
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
    const homeCompetitor = competition?.competitors?.find(team => team.homeAway === 'home');
    const awayCompetitor = competition?.competitors?.find(team => team.homeAway === 'away');
    const homeTeam = homeCompetitor?.team?.displayName;
    const awayTeam = awayCompetitor?.team?.displayName;
    if (!homeTeam || !awayTeam) return null;
    const giantCount = giants.filter(name => homeTeam.includes(name) || awayTeam.includes(name)).length;
    const priority = weight + giantCount * 30;
    const kickoff = new Date(event.date);
    return {
      id: `espn-${event.id}`, date: kickoff.toISOString().slice(0, 10),
      time: kickoff.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }),
      league: label, home: homeTeam, away: awayTeam,
      priority, featured: priority >= 75, status: event.status?.type?.description ?? 'Programmé',
      completed: event.status?.type?.completed === true,
      homeScore: homeCompetitor?.score == null ? null : Number(homeCompetitor.score),
      awayScore: awayCompetitor?.score == null ? null : Number(awayCompetitor.score),
      ...model(homeTeam, awayTeam, priority)
    };
  }).filter(Boolean);
}));

const matches = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
const failures = results.flatMap((result, index) => result.status === 'rejected' ? [`${leagues[index][0]}: ${result.reason?.message ?? 'échec inconnu'}`] : []);
const allUnique = [...new Map(matches.map(match => [match.id, match])).values()];
const unique = allUnique
  .filter(match => match.date >= historyStart.toISOString().slice(0, 10) && match.date <= end.toISOString().slice(0, 10))
  .sort((a, b) => a.date.localeCompare(b.date) || b.priority - a.priority);
const settlements = allUnique.filter(match => match.completed && Number.isFinite(match.homeScore) && Number.isFinite(match.awayScore))
  .map(({id,date,home,away,homeScore,awayScore,completed})=>({id,date,home,away,homeScore,awayScore,completed}));
const providerFailures = [...failures];
let history = [], oddsEvents = [];
try { history = await footballHistory(); } catch (error) { providerFailures.push(error.message); }
try { oddsEvents = await bookmakerOdds(unique); } catch (error) { providerFailures.push(error.message); }
const enriched = unique.map(match => {
  const homeStats = teamForm(match.home, history), awayStats = teamForm(match.away, history);
  if (homeStats.sample >= 2 && awayStats.sample >= 2) {
    match.homeGoals = Number(clamp(((homeStats.avgScored + awayStats.avgConceded) / 2) * 1.08).toFixed(2));
    match.awayGoals = Number(clamp(((awayStats.avgScored + homeStats.avgConceded) / 2) * .92).toFixed(2));
    match.statsSource = 'football-data.org'; match.homeStats = homeStats; match.awayStats = awayStats;
  }
  const realOdds = consensus(match, oddsEvents);
  if (realOdds) {
    const realMarkets = ['home','draw','away','over','btts'].filter(key => realOdds[key]);
    match.odds = {...match.odds,...Object.fromEntries(realMarkets.map(key => [key,realOdds[key]]))};
    match.oddsSource = 'The Odds API'; match.bookmakerOffers = realOdds.offers; match.bookmakerCount = realOdds.offers.length; match.oddsBookmakerCounts = realOdds.counts; match.realOddsMarkets = realMarkets;
  }
  return match;
});
await mkdir('data', { recursive: true });
await writeFile('data/fixtures.json', `${JSON.stringify({ generatedAt: new Date().toISOString(), source: 'ESPN + football-data.org + The Odds API', providerStatus: providerFailures.length ? 'partial' : 'ok', failures: providerFailures, coverage:{historicalMatches:history.length,oddsEvents:oddsEvents.length,statsMatches:enriched.filter(x=>x.statsSource).length,oddsMatches:enriched.filter(x=>x.oddsSource).length,settlements:settlements.length}, settlements, matches: enriched }, null, 2)}\n`);
console.log(`${enriched.length} rencontres, ${settlements.length} résultats récents, ${history.length} historiques, ${oddsEvents.length} événements cotés.`);
if (providerFailures.length) console.warn(providerFailures.join('\n'));
