// Communauté (BET-60, BET-61) : règles pures partagées par le site et les tests, sans DOM ni réseau.
// Ligues privées : code BM-XXXX (alphabet sans I, O, 0 ni 1), 5 ligues par joueur au plus, 50 membres au plus.
export const PRIVATE_LIMITS = { leaguesPerPlayer: 5, members: 50, nameMin: 3, nameMax: 30 };
export const PRIVATE_EMBLEMS = [['ball', '⚽'], ['trophy', '🏆'], ['star', '⭐'], ['bolt', '⚡'], ['shield', '🛡️'], ['flame', '🔥'], ['crown', '👑'], ['target', '🎯'], ['rocket', '🚀'], ['lion', '🦁'], ['eagle', '🦅'], ['wolf', '🐺']];
export const emblemOf = key => PRIVATE_EMBLEMS.find(([name]) => name === key)?.[1] ?? '⚽';
// Accepte « bm-ab2c », « BMAB2C » ou « BM-AB2C » : renvoie le code normalisé ou null.
export function normalizeCode(value) {
  const raw = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''), match = /^BM([A-HJ-NP-Z2-9]{4})$/.exec(raw);
  return match ? `BM-${match[1]}` : null;
}
export const privateLink = (code, base) => `${base}#ligue-privee-${code}`;
export function parsePrivateHash(hash) {
  const match = /^#ligue-privee-(.+)$/.exec(String(hash ?? ''));
  return match ? normalizeCode(decodeURIComponent(match[1])) : null;
}
export const validLeagueName = value => { const name = String(value ?? '').trim(); return name.length >= PRIVATE_LIMITS.nameMin && name.length <= PRIVATE_LIMITS.nameMax; };
// Avant d'envoyer : une ligue de plus est-elle possible, la ligue est-elle pleine ?
export const canCreateOrJoin = leaguesJoined => leaguesJoined < PRIVATE_LIMITS.leaguesPerPlayer;
export const isFull = members => members >= PRIVATE_LIMITS.members;
// Nouveau propriétaire quand le propriétaire quitte : le plus ancien membre restant (égalité : identifiant le plus petit). null = ligue supprimée.
export function nextOwner(members, leaving) {
  return members.filter(member => member.user_id !== leaving).sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at) || String(a.user_id).localeCompare(String(b.user_id)))[0]?.user_id ?? null;
}
