export const SECONDARY_ODDS_INTERVAL_HOURS = 6;
export const SECONDARY_ODDS_WINDOW_HOURS = 48;

export function shouldRefreshSecondaryOdds(lastRefresh, now = Date.now()) {
  const previous = new Date(lastRefresh).getTime();
  return !Number.isFinite(previous) || now - previous >= SECONDARY_ODDS_INTERVAL_HOURS * 3600000;
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
