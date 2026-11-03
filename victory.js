// Célébration d'un prono gagné (BET-62) : détection des gains non vus, plan de célébration, palette du club, partitions sonores et particules. Fonctions pures, sans DOM ni réseau.
// victory-fx.js les joue (avatar 3D, canvas, WebAudio). Le son reste coupé tant que le joueur ne l'a pas activé lui-même ; « réduire les animations » coupe toute la mise en scène.
import { CATALOG } from './shop.js';

export const SOUND_KEY = 'betmaster-victory-sound', seenKey = userId => `betmaster-victory-seen:${userId}`;
export const MAX_AGE = 7 * 864e5;
// Assets des objets équipés (effets de victoire et sons) : les lignes de equipped_items ne portent que l'identifiant de l'objet.
export function equippedAssets(rows = []) {
  const assets = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const entry = CATALOG.find(item => item.id === row?.item_id);
    if (entry && (entry.category === 'victoryfx' || entry.category === 'sound') && entry.category === row.slot) assets[entry.category] = entry.asset;
  }
  return assets;
}
const settledMs = bet => { const at = Date.parse(bet?.settledAt ?? ''); return Number.isFinite(at) ? at : null; };
// Pronos gagnés réglés depuis la dernière visite (les plus anciens que MAX_AGE ne sont jamais rejoués) ; seenAt : date en millisecondes, ou null à la première visite.
export function unseenWins(bets = [], seenAt = null, now = Date.now()) {
  if (seenAt == null) return [];
  return bets.filter(bet => bet?.status === 'won' && bet.certified !== false && settledMs(bet) != null && settledMs(bet) > seenAt && now - settledMs(bet) <= MAX_AGE).sort((a, b) => settledMs(a) - settledMs(b));
}
// Nouvelle date de dernière visite : la plus récente date de règlement connue, sans jamais reculer ni dépasser l'instant présent.
export function nextSeen(bets = [], seenAt = null, now = Date.now()) {
  const latest = bets.map(settledMs).filter(at => at != null && at <= now).reduce((max, at) => Math.max(max, at), 0);
  return Math.max(seenAt ?? 0, latest || (seenAt == null ? now : 0));
}
// Plan de la mise en scène : null s'il n'y a rien à fêter ou si le joueur a demandé moins d'animations.
export function victoryPlan({ wins = [], assets = {}, celebration = 'celeb-jump', reduced = false, soundOn = false } = {}) {
  if (!wins.length || reduced) return null;
  const gain = wins.reduce((sum, bet) => sum + Math.max(0, Number(bet.returnAmount ?? 0) - Number(bet.stake ?? 0)), 0);
  return {
    count: wins.length, gain: Math.round(gain * 100) / 100, bestOdds: wins.reduce((max, bet) => Math.max(max, Number(bet.odds) || 0), 0), celebration,
    effect: ['confetti', 'smoke'].includes(assets.victoryfx) ? assets.victoryfx : null, sound: soundOn && ['siren', 'chants'].includes(assets.sound) ? assets.sound : null
  };
}
export const soundEnabled = storage => { try { return storage?.getItem(SOUND_KEY) === 'on'; } catch { return false; } };
export const setSoundEnabled = (storage, on) => { try { on ? storage?.setItem(SOUND_KEY, 'on') : storage?.removeItem(SOUND_KEY); } catch { /* stockage indisponible : le son reste coupé */ } };

// Palette aux couleurs du club : couleur principale ESPN (6 chiffres hexadécimaux), éclaircie, assombrie, plus blanc ; repli sur les couleurs du site.
export const DEFAULT_PALETTE = ['#c6ff3d', '#f4f7f2', '#7bb800', '#2f6bff'];
const mix = (rgb, target, share) => rgb.map((value, index) => Math.round(value + (target[index] - value) * share));
const hex = rgb => `#${rgb.map(value => value.toString(16).padStart(2, '0')).join('')}`;
export function clubPalette(color, alternate = null) {
  const parse = value => /^#?[0-9a-f]{6}$/i.test(String(value ?? '')) ? [1, 3, 5].map(i => parseInt(String(value).replace('#', '').slice(i - 1, i + 1), 16)) : null, main = parse(color);
  if (!main) return DEFAULT_PALETTE.slice();
  const second = parse(alternate);
  return [hex(main), hex(mix(main, [255, 255, 255], .45)), hex(second ?? mix(main, [0, 0, 0], .35)), '#ffffff'];
}

// Partitions sonores synthétisées (aucun fichier audio, donc aucun droit à régler) : { type: 'tone' | 'noise', at, dur, freq, to, wave, gain, q }, en secondes.
export function soundScore(kind) {
  const notes = [];
  if (kind === 'siren') {
    for (let i = 0; i < 6; i++) notes.push({ type: 'tone', at: i * .5, dur: .5, freq: i % 2 ? 980 : 720, to: i % 2 ? 720 : 980, wave: 'sawtooth', gain: .16, q: 0 });
    return notes;
  }
  if (kind === 'chants') {
    // Foule : souffle filtré qui gonfle, claquements de mains en rythme, puis des notes chantées simples (aucune mélodie existante).
    notes.push({ type: 'noise', at: 0, dur: 4.2, freq: 900, to: 0, wave: 'band', gain: .08, q: .7 });
    for (let i = 0; i < 8; i++) notes.push({ type: 'noise', at: .2 + i * .5, dur: .09, freq: 1800, to: 0, wave: 'band', gain: .22, q: 1.2 });
    [[.2, 196], [.7, 196], [1.2, 247], [2.2, 196], [2.7, 196], [3.2, 262]].forEach(([at, freq]) => notes.push({ type: 'tone', at, dur: .42, freq, to: freq, wave: 'triangle', gain: .09, q: 0 }));
    return notes;
  }
  return notes;
}
export const soundDuration = kind => soundScore(kind).reduce((max, note) => Math.max(max, note.at + note.dur), 0);

// Particules : confettis (pluie colorée) ou fumigènes (volutes qui montent et s'estompent). rng : () => [0, 1[ pour des tests reproductibles.
export function spawnParticles(effect, palette, width, height, count = effect === 'smoke' ? 46 : 140, rng = Math.random) {
  const pick = () => palette[Math.floor(rng() * palette.length) % palette.length], list = [];
  for (let i = 0; i < count; i++) {
    if (effect === 'smoke') list.push({ kind: 'smoke', x: width * (.1 + .8 * rng()), y: height * (.92 + .1 * rng()), vx: (rng() - .5) * 40, vy: -(60 + 90 * rng()), r: 26 + 30 * rng(), grow: 30 + 30 * rng(), alpha: .5, life: 0, ttl: 2.6 + 1.6 * rng(), color: pick() });
    else list.push({ kind: 'confetti', x: width * rng(), y: -20 - height * .4 * rng(), vx: (rng() - .5) * 160, vy: 120 + 200 * rng(), rot: rng() * Math.PI * 2, vr: (rng() - .5) * 12, w: 6 + 6 * rng(), h: 4 + 5 * rng(), life: 0, ttl: 3 + 2 * rng(), color: pick() });
  }
  return list;
}
// Un pas de simulation (dt en secondes) : renvoie les particules encore vivantes. Les confettis sortent par le bas ; la fumée s'estompe avec l'âge.
export function stepParticles(list, dt, height = 800) {
  const alive = [];
  for (const p of list) {
    const q = { ...p, life: p.life + dt, x: p.x + p.vx * dt, y: p.y + p.vy * dt };
    if (q.life >= q.ttl) continue;
    if (q.kind === 'smoke') { q.r += q.grow * dt; q.alpha = .5 * (1 - q.life / q.ttl); q.vx *= 1 - .4 * dt; }
    else { q.rot += q.vr * dt; q.vx *= 1 - .6 * dt; if (q.y > height + 30) continue; }
    alive.push(q);
  }
  return alive;
}
