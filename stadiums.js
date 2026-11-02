// Catalogue éditorial : clés ESPN uniquement, jamais de rapprochement par nom.
// Chaque photo activée doit être locale et accompagnée de ses droits vérifiés.
export const STADIUMS=Object.freeze({});
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function stadiumFor(match,catalog=STADIUMS){
  if(match.neutralSite===true)return null;
  const venueId=match.venue?.id==null?null:String(match.venue.id),homeId=match.homeId==null?null:String(match.homeId);
  // Un lieu explicite prime sur le stade habituel, y compris un stade temporaire.
  const entry=venueId?Object.values(catalog).find(entry=>entry.venueId===venueId):null;
  const photo=entry??(venueId?null:catalog[homeId]);
  if(!photo||!/^stadiums\/[a-z0-9-]+\.webp$/.test(photo.image)||!photo.author||!photo.license||!/^https:\/\//.test(photo.source)||!/^https:\/\//.test(photo.licenseUrl))return null;
  return {...photo,confirmed:Boolean(venueId)};
}
export function stadiumMarkup(match,catalog=STADIUMS){
  const photo=stadiumFor(match,catalog);if(!photo)return '';
  const label=photo.confirmed?photo.name:`Stade habituel de ${match.home} · lieu du match non confirmé`;
  return `<img class="match-stadium-photo" src="${escape(photo.image)}" width="960" height="540" alt="" loading="lazy" decoding="async"><details class="stadium-credit"><summary>Photo du stade</summary><span>${escape(label)} · ${escape(photo.author)} · <a href="${escape(photo.source)}" target="_blank" rel="noopener noreferrer">Source</a> · <a href="${escape(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escape(photo.license)}</a> · image redimensionnée et recadrée</span></details>`;
}
const watched=new WeakSet();
export function bindStadiumImages(root){
  if(!root?.querySelectorAll)return;
  root.querySelectorAll('.match-stadium-photo').forEach(img=>{if(watched.has(img))return;watched.add(img);const show=()=>img.parentElement.classList.toggle('stadium-ready',img.naturalWidth>0),fail=()=>{img.parentElement.classList.remove('stadium-ready');img.hidden=true};img.addEventListener('load',show);img.addEventListener('error',fail);if(img.complete){if(img.naturalWidth)show();else fail()}});
}
export function venueFromCompetition(competition){
  const venue=competition?.venue;
  return {neutralSite:competition?.neutralSite===true,venue:venue?.id!=null?{id:String(venue.id),name:String(venue.fullName??'')}:null};
}
