import test from 'node:test';import assert from 'node:assert/strict';
// BET-62 · complément : célébration d'un prono gagné, effets de victoire, ambiances sonores, carte joueur personnalisée
const V=await import('./victory.js'),C=await import('./card-style.js'),S=await import('./shop.js');
const won=(id,at,extra={})=>({id,status:'won',certified:true,settledAt:at,stake:10,returnAmount:25,odds:2.5,...extra});
const NOW=Date.parse('2026-10-28T12:00:00Z');
test('seuls les pronos gagnés réglés depuis la dernière visite sont fêtés, du plus ancien au plus récent',()=>{
  const bets=[won('a','2026-10-28T09:00:00Z'),won('b','2026-10-27T09:00:00Z'),{...won('c','2026-10-28T10:00:00Z'),status:'lost'},{...won('d','2026-10-28T11:00:00Z'),status:'pending',settledAt:null},won('e','2026-10-28T11:30:00Z')];
  assert.deepEqual(V.unseenWins(bets,Date.parse('2026-10-27T12:00:00Z'),NOW).map(b=>b.id),['a','e']);
  assert.deepEqual(V.unseenWins(bets,Date.parse('2026-10-28T11:30:00Z'),NOW),[],'rien de neuf : rien à fêter');
});
test('la première visite ne rejoue pas l’historique, et un gain trop ancien n’est jamais rejoué',()=>{
  assert.deepEqual(V.unseenWins([won('a','2026-10-28T09:00:00Z')],null,NOW),[]);
  assert.deepEqual(V.unseenWins([won('old','2026-10-01T09:00:00Z')],Date.parse('2026-09-01T00:00:00Z'),NOW),[]);
  assert.deepEqual(V.unseenWins([won('x','2026-10-28T09:00:00Z',{certified:false})],1,NOW),[],'ancien pari du navigateur exclu');
});
test('la date de dernière visite avance avec les règlements, ne recule jamais et ignore le futur',()=>{
  const bets=[won('a','2026-10-28T09:00:00Z'),{...won('b','2026-10-28T10:00:00Z'),status:'lost'}];
  assert.equal(V.nextSeen(bets,null,NOW),Date.parse('2026-10-28T10:00:00Z'));
  assert.equal(V.nextSeen(bets,Date.parse('2026-10-28T11:00:00Z'),NOW),Date.parse('2026-10-28T11:00:00Z'));
  assert.equal(V.nextSeen([],null,NOW),NOW,'première visite sans pari : on part de maintenant');
  assert.equal(V.nextSeen([won('f','2027-01-01T00:00:00Z')],null,NOW),NOW);
});
test('le plan de célébration : coupé si « réduire les animations », son seulement s’il est acheté ET activé',()=>{
  const wins=[won('a','2026-10-28T09:00:00Z'),won('b','2026-10-28T10:00:00Z',{stake:5,returnAmount:20,odds:4})],assets={victoryfx:'smoke',sound:'siren'};
  assert.equal(V.victoryPlan({wins,assets,reduced:true,soundOn:true}),null);assert.equal(V.victoryPlan({wins:[],assets}),null);
  const plan=V.victoryPlan({wins,assets,celebration:'celeb-flip',soundOn:false});
  assert.deepEqual([plan.count,plan.gain,plan.bestOdds,plan.celebration,plan.effect,plan.sound],[2,30,4,'celeb-flip','smoke',null]);
  assert.equal(V.victoryPlan({wins,assets,soundOn:true}).sound,'siren');assert.equal(V.victoryPlan({wins,assets:{},soundOn:true}).sound,null);
  assert.equal(V.victoryPlan({wins,assets:{victoryfx:'inconnu',sound:'inconnu'},soundOn:true}).effect,null);
});
test('le son est coupé par défaut et ne s’active que par un choix explicite du joueur',()=>{
  const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
  assert.equal(V.soundEnabled(storage),false);V.setSoundEnabled(storage,true);assert.equal(V.soundEnabled(storage),true);V.setSoundEnabled(storage,false);assert.equal(V.soundEnabled(storage),false);
  assert.equal(V.soundEnabled({getItem(){throw new Error('bloqué')}}),false);assert.equal(V.soundEnabled(null),false);
});
test('les objets équipés sont lus dans le catalogue : seuls les effets de victoire et les sons, dans le bon emplacement',()=>{
  const rows=[{slot:'victoryfx',item_id:'victoryfx-confetti'},{slot:'sound',item_id:'sound-chants'},{slot:'frame',item_id:'frame-gold'},{slot:'sound',item_id:'victoryfx-smoke'},{slot:'sound',item_id:'inconnu'}];
  assert.deepEqual(V.equippedAssets(rows),{victoryfx:'confetti',sound:'chants'});assert.deepEqual(V.equippedAssets(null),{});
});
test('la palette suit les couleurs du club, avec repli sur celles du site',()=>{
  const palette=V.clubPalette('011F68');assert.equal(palette.length,4);assert.equal(palette[0],'#011f68');assert.ok(palette.every(c=>/^#[0-9a-f]{6}$/.test(c)));assert.equal(V.clubPalette('011F68','ffcc00')[2],'#ffcc00');
  for(const bad of [null,'','xyz','12345','<script>'])assert.deepEqual(V.clubPalette(bad),V.DEFAULT_PALETTE);
});
test('les partitions sonores sont synthétisées, bornées et durent quelques secondes',()=>{
  for(const kind of ['siren','chants']){const score=V.soundScore(kind);assert.ok(score.length>0);assert.ok(score.every(n=>['tone','noise'].includes(n.type)&&n.at>=0&&n.dur>0&&n.gain>0&&n.gain<=.3));assert.ok(V.soundDuration(kind)>2&&V.soundDuration(kind)<6)}
  assert.deepEqual(V.soundScore('inconnu'),[]);assert.equal(V.soundDuration('inconnu'),0);
});
test('les particules : confettis au-dessus de l’écran qui tombent, fumigènes sous l’écran qui montent, tout disparaît avec le temps',()=>{
  let seed=7;const rng=()=>(seed=(seed*16807)%2147483647)/2147483647,palette=['#111111','#222222'];
  const confetti=V.spawnParticles('confetti',palette,800,600,50,rng),smoke=V.spawnParticles('smoke',palette,800,600,20,rng);
  assert.equal(confetti.length,50);assert.ok(confetti.every(p=>p.y<0&&p.vy>0&&palette.includes(p.color)));assert.ok(smoke.every(p=>p.y>=.9*600&&p.vy<0));
  const moved=V.stepParticles(confetti,.5,600);assert.ok(moved.every((p,i)=>p.life===.5));assert.deepEqual(V.stepParticles(confetti,10,600),[]);
  const faded=V.stepParticles(smoke,1,600);assert.ok(faded.every(p=>p.alpha<.5&&p.r>20));assert.deepEqual(V.stepParticles(smoke,10,600),[]);
});
test('la carte joueur : fond, police et effet viennent d’une liste fermée, une valeur inconnue est ignorée',()=>{
  const style=C.cardStyle({cardbg:{asset:'aurora'},cardfont:{asset:'serif'},cardfx:{asset:'holo'}});
  assert.deepEqual(style.classes,['card-bg-aurora','card-font-serif','card-fx-holo']);assert.deepEqual(style.bg,C.CARD_BACKGROUNDS.aurora.stops);assert.equal(style.font.family,C.CARD_FONTS.serif.family);assert.equal(style.fx,'holo');
  assert.deepEqual(C.cardStyle({cardbg:{asset:'"><img src=x onerror=alert(1)>'},cardfont:{asset:'__proto__'},cardfx:{asset:'constructor'}}).classes,[]);assert.deepEqual(C.cardStyle(undefined).classes,[]);assert.deepEqual(C.cardStyle({frame:{asset:'gold'}}).classes,[]);
});
test('les objets de carte, les effets de victoire et les sons du catalogue : prix valides, assets connus, équipables',()=>{
  const cards=S.CATALOG.filter(e=>['cardbg','cardfont','cardfx'].includes(e.category));
  assert.equal(cards.length,11);assert.ok(cards.every(e=>C.swatchClass(e)!==''),'chaque objet de carte a un style défini');assert.ok(cards.every(e=>S.DISPLAYABLE.includes(e.category)));
  const victory=S.CATALOG.filter(e=>e.category==='victoryfx'),sounds=S.CATALOG.filter(e=>e.category==='sound');
  assert.deepEqual(victory.map(e=>e.asset).sort(),['confetti','smoke']);assert.deepEqual(sounds.map(e=>e.asset).sort(),['chants','siren']);
  assert.ok([...victory,...sounds].every(e=>S.EQUIPPABLE.includes(e.category)&&!S.DISPLAYABLE.includes(e.category)),'jouées chez le propriétaire seulement, jamais publiées avec la carte');
  assert.ok(S.CATALOG.filter(e=>[...S.EQUIPPABLE].includes(e.category)).every(S.validPrice));
  assert.equal(C.swatchClass({category:'cardbg',asset:'inconnu'}),'');assert.equal(C.swatchClass({category:'kit',asset:'pitch'}),'');
});
