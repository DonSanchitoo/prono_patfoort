import test from 'node:test';import assert from 'node:assert/strict';
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
globalThis.document={querySelector:()=>({addEventListener:()=>{},classList:{add:()=>{},toggle:()=>{},contains:()=>false},style:{},set textContent(v){},set innerHTML(v){}}),documentElement:{classList:{add:()=>{},toggle:()=>{},contains:()=>false}}};
const {poisson,analyseMatch,optimizeCombo}=await import('./app.js');
test('Poisson produit une distribution normalisée',()=>{let total=0;for(let i=0;i<20;i++)total+=poisson(i,1.8);assert.ok(Math.abs(total-1)<1e-8)});
test('analyse les probabilités 1N2 et les marchés',()=>{const a=analyseMatch({home:'A',away:'B',homeGoals:2,awayGoals:1,odds:{home:2,draw:3,away:4,over:2,btts:2}});assert.ok(Math.abs(a.probs.home+a.probs.draw+a.probs.away-1)<.001);assert.equal(a.markets.length,5);assert.ok(a.probs.home>a.probs.away)});
test('le combiné ne sélectionne jamais deux marchés du même match',()=>{const matches=[1,2,3].map(i=>({id:String(i),home:`A${i}`,away:`B${i}`,homeGoals:2,awayGoals:1,odds:{home:2,draw:3.5,away:4,over:1.8,btts:1.9}}));const combo=optimizeCombo(matches,3,3);assert.equal(new Set(combo.map(x=>x.matchId)).size,combo.length);assert.ok(combo.length>=2)});
