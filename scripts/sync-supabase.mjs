// Synchronise les matchs avec Supabase puis règle les paris certifiés en attente (BET-52).
// Lancé par les workflows après la mise à jour de data/fixtures.json ; sans SUPABASE_SERVICE_ROLE_KEY il ne fait rien.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { settleTicket } from '../model.js';
import { createAdmin } from './supabase-admin.mjs';

const MARKETS = ['home', 'draw', 'away', 'over', 'btts'];
const STALE_DAYS = 10;
// Ligne de la table fixtures pour un match de data/fixtures.json.
export function fixtureRow(match, now = new Date()) {
  const odds = Object.fromEntries(MARKETS.filter(key => Number(match.odds?.[key]) > 1).map(key => [key, Number(match.odds[key])]));
  return { id: match.id, league: match.league, round: match.round ?? null, home: match.home, away: match.away, home_id: match.homeId ?? null, away_id: match.awayId ?? null,
    kickoff: match.kickoff ?? `${match.date}T12:00:00Z`, status: match.status ?? 'Programmé', completed: match.completed === true, voided: match.voided === true,
    home_score: Number.isFinite(match.homeScore) ? match.homeScore : null, away_score: Number.isFinite(match.awayScore) ? match.awayScore : null,
    odds, odds_source: Object.fromEntries(Object.keys(odds).map(key => [key, match.realOddsMarkets?.includes(key) ? 'real' : 'estimated'])), updated_at: now.toISOString() };
}
// Résultats utilisables par settleTicket : scores terminés, matchs annulés, et matchs jamais joués au bout de STALE_DAYS jours.
export function buildResults(settlements, fixtureRows = [], now = Date.now()) {
  const byId = new Map();
  for (const item of settlements ?? []) if (item.completed || item.voided) byId.set(item.id, { id: item.id, home: item.home, away: item.away, homeScore: item.homeScore, awayScore: item.awayScore, completed: item.completed === true, voided: item.voided === true });
  for (const row of fixtureRows) {
    if (byId.has(row.id)) continue;
    if (row.voided || (!row.completed && Date.parse(row.kickoff) < now - STALE_DAYS * 864e5)) byId.set(row.id, { id: row.id, voided: true });
    else if (row.completed && Number.isFinite(row.home_score) && Number.isFinite(row.away_score)) byId.set(row.id, { id: row.id, home: row.home, away: row.away, homeScore: row.home_score, awayScore: row.away_score, completed: true });
  }
  return [...byId.values()];
}
// Décisions de règlement pour les paris en attente. Les sélections sont rapprochées par identifiant de match uniquement.
export function planSettlements(bets, results) {
  const plan = [];
  for (const bet of bets) {
    const items = (bet.selections ?? []).map(({ home, away, match, ...rest }) => rest);
    const outcome = settleTicket({ betType: bet.bet_type, stake: bet.stake, items, systemLines: bet.system_lines ?? [] }, results);
    if (outcome.status !== 'pending') plan.push({ id: bet.id, status: outcome.status, payout: outcome.payout });
  }
  return plan;
}
export async function syncFixtures(admin, matches, now = new Date()) {
  await admin.upsert('fixtures', matches.filter(match => match.id && match.home && match.away).map(match => fixtureRow(match, now)));
  return matches.length;
}
export async function settleServerBets(admin, settlements, now = Date.now()) {
  const pending = await admin.select('bets', 'status=eq.pending&select=id,bet_type,stake,selections,system_lines&order=placed_at.asc&limit=1000');
  if (!pending.length) return 0;
  const since = new Date(now - 60 * 864e5).toISOString();
  const rows = await admin.select('fixtures', `kickoff=gte.${since}&select=id,home,away,kickoff,completed,voided,home_score,away_score&limit=5000`);
  let settled = 0;
  for (const decision of planSettlements(pending, buildResults(settlements, rows, now)))
    if (await admin.rpc('settle_bet', { p_bet_id: decision.id, p_status: decision.status, p_payout: decision.payout })) settled++;
  return settled;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const admin = createAdmin();
  if (!admin) { console.log('Supabase (service_role) non configuré : synchronisation des matchs et règlement des paris ignorés.'); process.exit(0); }
  const data = JSON.parse(await readFile('data/fixtures.json', 'utf8'));
  const synced = await syncFixtures(admin, data.matches ?? []);
  const settled = await settleServerBets(admin, data.settlements ?? []);
  console.log(`${synced} matchs synchronisés, ${settled} paris certifiés réglés.`);
}
