// Mise en scène d'un prono gagné (BET-62) : l'avatar joue sa célébration équipée, avec l'effet de victoire (confettis ou fumigènes aux couleurs du club) et l'ambiance sonore si le joueur l'a achetée ET activée.
// Chargé à la demande par app.js ; les règles (gains non vus, plan, palette, partitions, particules) sont dans victory.js. Three.js n'est chargé que s'il y a quelque chose à fêter.
import { clubPalette, equippedAssets, nextSeen, seenKey, setSoundEnabled, soundDuration, soundEnabled, soundScore, spawnParticles, stepParticles, unseenWins, victoryPlan } from './victory.js';
import { avatarMarkup } from './avatar-view.js';
import { sanitizeAvatar } from './avatar-config.js';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* stockage indisponible : on rejouera peut-être la célébration */ } };

// Couleurs du club de cœur (API publique d'ESPN, déjà décrite dans Confidentialité), gardées 30 jours dans le navigateur ; repli sur les couleurs du site.
async function clubColors(club, slugsOf) {
  if (!club?.id || !/^\d{1,8}$/.test(String(club.id))) return clubPalette(null);
  const key = `betmaster-club-color:${club.id}`;
  try { const hit = JSON.parse(read(key) || 'null'); if (hit && Date.now() - hit.at < 30 * 864e5) return clubPalette(hit.color, hit.alt); } catch { /* cache illisible */ }
  for (const slug of (slugsOf?.(club.id) ?? []).filter(value => /^[a-z0-9._-]+$/i.test(value)).slice(0, 3)) {
    try {
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${ESPN}/${slug}/teams/${club.id}/roster`, { signal: controller.signal }); clearTimeout(timer);
      if (!response.ok) continue;
      const team = (await response.json()).team ?? {};
      if (/^[0-9a-f]{6}$/i.test(team.color ?? '')) { write(key, JSON.stringify({ color: team.color, alt: /^[0-9a-f]{6}$/i.test(team.alternateColor ?? '') ? team.alternateColor : null, at: Date.now() })); return clubPalette(team.color, team.alternateColor); }
    } catch { /* club ou compétition indisponible : on essaie la suivante */ }
  }
  return clubPalette(null);
}

// Son synthétisé avec WebAudio : un contexte par lecture, fermé à la fin. Le navigateur peut le laisser suspendu tant que le joueur n'a pas touché la page ; la lecture démarre alors au premier geste.
function playScore(kind) {
  const Context = typeof window === 'undefined' ? null : window.AudioContext || window.webkitAudioContext;
  if (!Context) return { stop() {} };
  const context = new Context(), master = context.createGain(); master.gain.value = .9; master.connect(context.destination);
  const resume = () => { if (context.state === 'suspended') context.resume().catch(() => {}); };
  resume(); addEventListener('pointerdown', resume, { once: true }); addEventListener('keydown', resume, { once: true });
  const noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate), data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  for (const note of soundScore(kind)) {
    const start = context.currentTime + .05 + note.at, end = start + note.dur, gain = context.createGain();
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(note.gain, start + Math.min(.04, note.dur / 3)); gain.gain.linearRampToValueAtTime(0, end);
    if (note.type === 'tone') { const osc = context.createOscillator(); osc.type = note.wave; osc.frequency.setValueAtTime(note.freq, start); if (note.to && note.to !== note.freq) osc.frequency.linearRampToValueAtTime(note.to, end); osc.connect(gain); osc.start(start); osc.stop(end + .02); }
    else { const source = context.createBufferSource(), filter = context.createBiquadFilter(); source.buffer = noise; source.loop = true; filter.type = 'bandpass'; filter.frequency.value = note.freq; filter.Q.value = note.q || 1; source.connect(filter); filter.connect(gain); source.start(start); source.stop(end + .02); }
    gain.connect(master);
  }
  const timer = setTimeout(() => context.close().catch(() => {}), (soundDuration(kind) + 1) * 1000);
  return { stop() { clearTimeout(timer); removeEventListener('pointerdown', resume); removeEventListener('keydown', resume); context.close().catch(() => {}); } };
}

// Couche de particules : un canvas plein écran qui laisse passer les clics ; s'arrête dès qu'il n'y a plus de particule.
function startParticles(canvas, effect, palette) {
  const context = canvas.getContext('2d'); let width = 0, height = 0, list = [], last = performance.now(), frame = 0, burst = 0;
  const fit = () => { const ratio = Math.min(devicePixelRatio || 1, 2); width = innerWidth; height = innerHeight; canvas.width = width * ratio; canvas.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0); };
  fit(); addEventListener('resize', fit);
  const add = () => { list = list.concat(spawnParticles(effect, palette, width, height, effect === 'smoke' ? 26 : 90)); };
  add();
  const draw = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now; list = stepParticles(list, dt, height); context.clearRect(0, 0, width, height);
    for (const p of list) {
      if (p.kind === 'smoke') { context.globalAlpha = p.alpha; const gradient = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); gradient.addColorStop(0, p.color); gradient.addColorStop(1, 'rgba(0,0,0,0)'); context.fillStyle = gradient; context.beginPath(); context.arc(p.x, p.y, p.r, 0, Math.PI * 2); context.fill(); }
      else { context.globalAlpha = Math.min(1, (p.ttl - p.life) * 2); context.save(); context.translate(p.x, p.y); context.rotate(p.rot); context.fillStyle = p.color; context.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); context.restore(); }
    }
    context.globalAlpha = 1;
    if (burst < 2 && list.length < 60) { burst++; add(); }
    if (list.length || burst < 2) frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return { stop() { cancelAnimationFrame(frame); removeEventListener('resize', fit); context.clearRect(0, 0, width, height); } };
}

// api.load() : lignes de equipped_items du joueur ; getLook() : avatar enregistré ; getClub() : club de cœur ({ id, name }) ; clubSlugs(id) : compétitions ESPN où joue le club.
export function initVictory({ api, getLook, getClub, clubSlugs, getUserId, isAuthenticated, html, toast }) {
  let playing = false, pending = false;
  const money = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  async function show(plan, assets, palette) {
    const look = sanitizeAvatar(getLook()), root = document.createElement('div'), opener = document.activeElement;
    root.className = 'victory'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Prono gagné');
    const hasSound = Boolean(assets.sound);
    root.innerHTML = `<canvas class="victory-canvas" aria-hidden="true"></canvas><div class="victory-card"><div class="victory-avatar" data-host>${avatarMarkup({ avatar_config: look }, { cls: 'avatar-3d', kind: 'full', userId: getUserId() })}</div><strong>${plan.preview ? 'Aperçu de votre célébration' : plan.count > 1 ? `${plan.count} pronos gagnés !` : 'Prono gagné !'}</strong><p>${plan.preview ? 'Voici ce que vous verrez à chaque prono gagné.' : plan.gain > 0 ? `+${html(money(plan.gain))} de gain` : 'Bien joué'}${plan.bestOdds >= 3 ? ` · cote ${html(plan.bestOdds.toFixed(2))}` : ''}</p><div class="victory-actions">${hasSound ? `<button class="button secondary" data-victory-sound aria-pressed="${soundEnabled(localStorage)}">${soundEnabled(localStorage) ? 'Son activé' : 'Activer le son'}</button>` : ''}<button class="button primary" data-victory-close>Fermer</button></div></div>`;
    document.body.append(root);
    let stage = null, particles = null, sound = null, closed = false, timer = 0;
    const close = () => {
      if (closed) return; closed = true; clearTimeout(timer); particles?.stop(); sound?.stop(); stage?.dispose?.(); root.remove(); document.removeEventListener('keydown', onKey); playing = false; opener?.focus?.();
    };
    const onKey = event => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    root.addEventListener('click', event => {
      if (event.target.closest('[data-victory-close]')) { close(); return; }
      const toggle = event.target.closest('[data-victory-sound]');
      if (toggle) { const on = toggle.getAttribute('aria-pressed') !== 'true'; setSoundEnabled(localStorage, on); toggle.setAttribute('aria-pressed', String(on)); toggle.textContent = on ? 'Son activé' : 'Activer le son'; sound?.stop(); sound = on ? playScore(assets.sound) : null; }
    });
    root.querySelector('[data-victory-close]').focus();
    if (plan.effect) particles = startParticles(root.querySelector('.victory-canvas'), plan.effect, palette);
    if (plan.sound) sound = playScore(plan.sound);
    timer = setTimeout(close, Math.max(9000, (plan.sound ? soundDuration(plan.sound) + 1 : 0) * 1000));
    try {
      const module = await import('./avatar.js');
      if (!closed && module.webglSupported()) {
        const host = root.querySelector('[data-host]'), fallback = host.innerHTML; host.innerHTML = '';
        try { stage = await module.createStage(host, { look, view: 'full', label: 'Votre avatar fête le prono gagné', interactive: false }); } catch (error) { host.innerHTML = fallback; throw error; }
        if (closed) { stage.dispose?.(); stage = null; return; }
        stage.celebrate(plan.celebration);
      }
    } catch { /* sans 3D : l'image enregistrée reste affichée */ }
  }

  // Prépare et joue la mise en scène : `wins` vide + `preview` pour l'aperçu de la boutique.
  async function run(wins, preview) {
    pending = true;
    try {
      const rows = await api.load().catch(() => []), assets = equippedAssets(rows);
      const plan = victoryPlan({ wins, assets, celebration: sanitizeAvatar(getLook()).celebration, reduced: reducedMotion(), soundOn: soundEnabled(localStorage) });
      if (!plan) { if (preview) toast('Animations réduites : la célébration est désactivée'); return; }
      const palette = plan.effect ? await clubColors(getClub(), clubSlugs) : clubPalette(null);
      playing = true; await show(preview ? { ...plan, preview: true } : plan, assets, palette);
    } catch (error) { playing = false; console.warn('Célébration indisponible', error?.message); } finally { pending = false; }
  }
  async function check(bets) {
    if (!isAuthenticated() || playing || pending) return;
    const userId = getUserId(); if (!userId) return;
    const key = seenKey(userId), stored = Number(read(key)), seenAt = Number.isFinite(stored) && stored > 0 ? stored : null, now = Date.now();
    const wins = unseenWins(bets, seenAt, now);
    // Première visite sur cet appareil : on note la date sans rejouer l'historique.
    write(key, String(nextSeen(bets, seenAt, now)));
    if (wins.length) await run(wins, false);
  }
  // Aperçu depuis la boutique : une victoire fictive avec les objets équipés.
  const preview = async () => { if (!isAuthenticated() || playing || pending) return; await run([{ status: 'won', stake: 0, returnAmount: 0, odds: 2 }], true); };
  return { check, preview };
}
