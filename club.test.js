import test from 'node:test';import assert from 'node:assert/strict';
const {settleTicket,settleBet,selectionResult}=await import('./model.js');
const {fixtureRow,buildResults,planSettlements,settleServerBets,syncFixtures}=await import('./scripts/sync-supabase.mjs');
const {createAdmin}=await import('./scripts/supabase-admin.mjs');
// BET-52 · tickets certifiés : règlement côté serveur
const done=(id,homeScore,awayScore)=>({id,completed:true,homeScore,awayScore}),leg=(matchId,key,odd)=>({matchId,key,odd});
test('un pari simple gagné crédite mise × cote, un perdu ne crédite rien',()=>{
  assert.deepEqual(settleTicket({betType:'single',stake:10,items:[leg('a','home',1.9)]},[done('a',2,0)]),{status:'won',payout:19});
  assert.deepEqual(settleTicket({betType:'single',stake:10,items:[leg('a','home',1.9)]},[done('a',0,1)]),{status:'lost',payout:0});
  assert.equal(settleTicket({betType:'single',stake:10,items:[leg('a','home',1.9)]},[]).status,'pending');
});
test('un match annulé rembourse la mise d’un pari simple',()=>{
  assert.deepEqual(settleTicket({betType:'single',stake:25,items:[leg('a','home',2)]},[{id:'a',voided:true}]),{status:'void',payout:25});
  assert.equal(settleBet({items:[leg('a','home',2)]},[{id:'a',voided:true}]),'void');
});
test('un combiné retire la sélection annulée et garde les autres cotes',()=>{
  const bet={betType:'combined',stake:10,items:[leg('a','home',2),leg('b','over',1.5),leg('c','btts',3)]};
  assert.deepEqual(settleTicket(bet,[done('a',1,0),{id:'b',voided:true},done('c',1,1)]),{status:'won',payout:60});
  assert.equal(settleTicket(bet,[done('a',1,0),{id:'b',voided:true},done('c',0,0)]).status,'lost');
  assert.equal(settleTicket(bet,[done('a',1,0),{id:'b',voided:true}]).status,'pending');
  assert.deepEqual(settleTicket(bet,[{id:'a',voided:true},{id:'b',voided:true},{id:'c',voided:true}]),{status:'void',payout:10});
});
test('un combiné perdu dès une sélection perdue, même si d’autres matchs ne sont pas joués',()=>{
  const bet={betType:'combined',stake:10,items:[leg('a','home',2),leg('b','home',2)]};
  assert.equal(settleTicket(bet,[done('a',0,3)]).status,'lost');
});
test('un système 2 sur 3 paie les lignes gagnantes et tolère une erreur',()=>{
  const items=['a','b','c'].map(id=>leg(id,'home',2)),lines=[[0,1],[0,2],[1,2]].map(indexes=>({indexes,odds:4,stake:3})),bet={betType:'multiple',stake:9,items,systemLines:lines};
  assert.deepEqual(settleTicket(bet,[done('a',1,0),done('b',1,0),done('c',0,1)]),{status:'won',payout:12});
  assert.equal(settleTicket(bet,[done('a',1,0),done('b',1,0)]).status,'pending');
  assert.deepEqual(settleTicket(bet,[done('a',0,1),done('b',0,1),done('c',1,0)]),{status:'lost',payout:0});
  assert.deepEqual(settleTicket(bet,[{id:'a',voided:true},{id:'b',voided:true},{id:'c',voided:true}]),{status:'void',payout:9});
});
test('un résultat annulé est reconnu par selectionResult',()=>{assert.equal(selectionResult(leg('a','home',2),[{id:'a',voided:true}]).status,'void')});
test('la ligne de la table fixtures reprend scores, cotes et provenance',()=>{
  const row=fixtureRow({id:'espn-1',league:'Ligue 1',home:'Paris',away:'Lyon',homeId:'160',awayId:'167',kickoff:'2026-10-22T19:00:00.000Z',date:'2026-10-22',status:'Programmé',completed:false,odds:{home:1.8,draw:3.5,away:4.2,over:1.9,btts:0},realOddsMarkets:['home','draw']},new Date('2026-10-22T10:00:00Z'));
  assert.deepEqual(row.odds,{home:1.8,draw:3.5,away:4.2,over:1.9});assert.deepEqual(row.odds_source,{home:'real',draw:'real',away:'estimated',over:'estimated'});
  assert.equal(row.home_score,null);assert.equal(row.voided,false);assert.equal(row.home_id,'160');
});
test('les résultats ignorent les matchs en cours et annulent les matchs jamais joués après 10 jours',()=>{
  const now=Date.parse('2026-10-22T12:00:00Z'),rows=[{id:'x',kickoff:'2026-10-01T12:00:00Z',completed:false,voided:false},{id:'y',kickoff:'2026-10-21T12:00:00Z',completed:false,voided:false},{id:'z',home:'A',away:'B',kickoff:'2026-10-20T12:00:00Z',completed:true,voided:false,home_score:2,away_score:1},{id:'w',kickoff:'2026-10-20T12:00:00Z',completed:false,voided:true}];
  const results=buildResults([done('s',1,0),{id:'t',voided:true}],rows,now),byId=Object.fromEntries(results.map(r=>[r.id,r]));
  assert.equal(byId.x.voided,true);assert.equal(byId.y,undefined);assert.equal(byId.z.homeScore,2);assert.equal(byId.w.voided,true);assert.equal(byId.s.completed,true);assert.equal(byId.t.voided,true);
});
test('le règlement rapproche les sélections par identifiant seulement, pas par noms d’équipes',()=>{
  const bets=[{id:'b1',bet_type:'single',stake:10,selections:[{matchId:'espn-2',key:'home',odd:2,home:'Paris',away:'Lyon',match:'Paris - Lyon'}]}],old={id:'espn-1',home:'Paris',away:'Lyon',completed:true,homeScore:3,awayScore:0};
  assert.deepEqual(planSettlements(bets,[old]),[]);
  assert.deepEqual(planSettlements(bets,[old,done('espn-2',1,0)]),[{id:'b1',status:'won',payout:20}]);
});
test('le règlement est idempotent : seuls les paris acceptés par le serveur sont comptés',async()=>{
  const calls=[],admin={select:async table=>table==='bets'?[{id:'b1',bet_type:'single',stake:10,selections:[leg('espn-1','home',2)],system_lines:null},{id:'b2',bet_type:'single',stake:10,selections:[leg('espn-9','home',2)],system_lines:null}]:[{id:'espn-1',home:'A',away:'B',kickoff:'2026-10-22T10:00:00Z',completed:true,voided:false,home_score:1,away_score:0}],rpc:async(name,args)=>{calls.push([name,args]);return args.p_bet_id!=='b1'}};
  assert.equal(await settleServerBets(admin,[],Date.parse('2026-10-22T14:00:00Z')),0);
  assert.deepEqual(calls,[['settle_bet',{p_bet_id:'b1',p_status:'won',p_payout:20}]]);
});
test('la synchronisation des matchs ignore les matchs incomplets et envoie les autres par lots',async()=>{
  const sent=[],admin={upsert:async(table,rows)=>sent.push([table,rows.map(r=>r.id)])};
  await syncFixtures(admin,[{id:'espn-1',league:'L',home:'A',away:'B',kickoff:'2026-10-22T10:00:00Z',odds:{home:2}},{id:'espn-2',league:'L',home:'',away:'B'},{league:'L',home:'A',away:'B'}]);
  assert.deepEqual(sent,[['fixtures',['espn-1']]]);
});
test('le client service_role refuse une configuration incomplète et ne fuit pas la clé dans les erreurs',async()=>{
  assert.equal(createAdmin({}),null);assert.equal(createAdmin({SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'court'}),null);assert.equal(createAdmin({SUPABASE_URL:'http://evil.example',SUPABASE_SERVICE_ROLE_KEY:'a'.repeat(40)}),null);
  const secret='s'.repeat(40),admin=createAdmin({SUPABASE_URL:'https://x.supabase.co/',SUPABASE_SERVICE_ROLE_KEY:secret},async()=>({ok:false,status:401,text:async()=>'refusé'}));
  await assert.rejects(()=>admin.select('bets'),error=>error.message.includes('HTTP 401')&&!error.message.includes(secret));
});
