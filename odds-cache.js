export const SECONDARY_ODDS_WINDOW_HOURS = 48;
export const ODDS_REFRESH_HOURS = [7, 14, 19];

export function nextOddsRefresh(hours = ODDS_REFRESH_HOURS, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone:'Europe/Paris', hour:'2-digit', minute:'2-digit', hour12:false }).formatToParts(now).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
  const next = hours.find(hour => hour * 60 > parts.hour * 60 + parts.minute);
  return { hour: next ?? hours[0], tomorrow: next == null };
}

export function isInSecondaryOddsWindow(match, now = Date.now()) {
  const kickoff = new Date(match?.kickoff).getTime();
  return !match?.completed && Number.isFinite(kickoff) && kickoff >= now && kickoff <= now + SECONDARY_ODDS_WINDOW_HOURS * 3600000;
}

export function mergeCachedSecondaryOffers(currentOffers = [], previousOffers = []) {
  const offers = currentOffers.map(offer => ({ ...offer }));
  for (const previous of previousOffers) {
    let offer = offers.find(item => item.name === previous.name);
    for (const market of ['over', 'btts']) {
      const cached = Number(previous[market]);
      if (!Number.isFinite(cached) || cached <= 1 || Number(offer?.[market]) > 1) continue;
      if (!offer) { offer = { name: previous.name }; offers.push(offer); }
      offer[market] = cached;
      offer[`${market}Cached`] = true;
    }
  }
  return offers;
}
