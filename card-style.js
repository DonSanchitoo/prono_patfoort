// Personnalisation de la carte joueur (BET-62) : fond, police du numéro, effet brillant. Fonctions pures, sans DOM ni réseau.
// Les styles se choisissent par le champ `asset` des objets de la boutique (cardbg-*, cardfont-*, cardfx-*) ; styles.css porte les classes card-bg-*, card-font-* et card-fx-*.
// Polices du système uniquement : aucun service tiers de plus (voir Confidentialité).
export const CARD_BACKGROUNDS = { pitch: { label: 'Pelouse', stops: ['#14532d', '#0a0c0b'] }, night: { label: 'Nuit de match', stops: ['#1e2a5a', '#05060f'] }, aurora: { label: 'Aurore', stops: ['#0f766e', '#4c1d95'] }, gold: { label: 'Or', stops: ['#8a6a14', '#1c1403'] } };
export const CARD_FONTS = { serif: { label: 'Empattements', family: 'Georgia, "Times New Roman", serif', style: 'normal' }, mono: { label: 'Machine', family: 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace', style: 'normal' }, slant: { label: 'Penché', family: '"Barlow Condensed", Impact, sans-serif', style: 'italic' }, impact: { label: 'Affiche', family: 'Impact, "Arial Narrow Bold", sans-serif', style: 'normal' } };
export const CARD_EFFECTS = { shine: { label: 'Reflet' }, sparkle: { label: 'Étincelles' }, holo: { label: 'Holographique' } };
const TABLES = { cardbg: ['bg', CARD_BACKGROUNDS], cardfont: ['font', CARD_FONTS], cardfx: ['fx', CARD_EFFECTS] };

// Style d'une carte à partir des objets équipés ({ cardbg: { asset }, cardfont: { asset }, cardfx: { asset } }, tel que renvoyé par public_equipped) :
// une valeur inconnue est ignorée, jamais injectée dans le HTML.
export function cardStyle(equipped = {}) {
  const style = { classes: [], bg: null, font: null, fx: null };
  for (const [slot, [prefix, table]] of Object.entries(TABLES)) {
    const asset = equipped?.[slot]?.asset;
    if (typeof asset !== 'string' || !Object.hasOwn(table, asset)) continue;
    style.classes.push(`card-${prefix}-${asset}`);
    if (slot === 'cardbg') style.bg = table[asset].stops; else if (slot === 'cardfont') style.font = table[asset]; else style.fx = asset;
  }
  return style;
}
// Classes d'une pastille d'aperçu dans la boutique (un objet de carte sur une mini-carte).
export const swatchClass = item => { const entry = TABLES[item?.category]; return entry && typeof item.asset === 'string' && Object.hasOwn(entry[1], item.asset) ? `card-${entry[0]}-${item.asset}` : ''; };
