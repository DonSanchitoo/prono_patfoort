import test from 'node:test';import assert from 'node:assert/strict';
// BET-61 · ligues privées : règles pures (les limites et le transfert sont aussi vérifiés côté SQL)
const C=await import('./community.js');
test('le code d’invitation est normalisé : casse, tiret et espaces tolérés, caractères ambigus refusés',()=>{
  assert.equal(C.normalizeCode('BM-AB2C'),'BM-AB2C');assert.equal(C.normalizeCode(' bm-ab2c '),'BM-AB2C');assert.equal(C.normalizeCode('bmab2c'),'BM-AB2C');
  for(const bad of ['BM-AB0C','BM-AB1C','BM-ABIC','BM-ABOC','BM-AB2','BM-AB2CD','XX-AB2C','',null,undefined,'BM-'])assert.equal(C.normalizeCode(bad),null,String(bad));
});
test('le lien direct #ligue-privee-BM-XXXX est lu et normalisé',()=>{
  assert.equal(C.parsePrivateHash('#ligue-privee-BM-AB2C'),'BM-AB2C');assert.equal(C.parsePrivateHash('#ligue-privee-bm-ab2c'),'BM-AB2C');assert.equal(C.parsePrivateHash('#ligue-privee-nope'),null);assert.equal(C.parsePrivateHash('#communaute'),null);assert.equal(C.parsePrivateHash(''),null);
  assert.equal(C.privateLink('BM-AB2C','https://x.github.io/app/'),'https://x.github.io/app/#ligue-privee-BM-AB2C');
});
test('limites : 5 ligues par joueur, 50 membres par ligue, nom de 3 à 30 caractères',()=>{
  assert.equal(C.canCreateOrJoin(4),true);assert.equal(C.canCreateOrJoin(5),false);assert.equal(C.isFull(49),false);assert.equal(C.isFull(50),true);
  assert.equal(C.validLeagueName('ab'),false);assert.equal(C.validLeagueName('  abc  '),true);assert.equal(C.validLeagueName('x'.repeat(31)),false);assert.equal(C.validLeagueName(null),false);
});
test('le propriétaire qui quitte transmet la ligue au plus ancien membre, le dernier qui part la supprime',()=>{
  const members=[{user_id:'b',joined_at:'2026-10-02'},{user_id:'a',joined_at:'2026-10-01'},{user_id:'c',joined_at:'2026-10-03'},{user_id:'d',joined_at:'2026-10-02'}];
  assert.equal(C.nextOwner(members,'a'),'b');assert.equal(C.nextOwner(members,'b'),'a');assert.equal(C.nextOwner([{user_id:'a',joined_at:'2026-10-01'}],'a'),null);assert.equal(C.nextOwner([],'a'),null);
});
test('12 emblèmes proposés, un emblème inconnu retombe sur le ballon',()=>{assert.equal(C.PRIVATE_EMBLEMS.length,12);assert.equal(C.emblemOf('crown'),'👑');assert.equal(C.emblemOf('???'),'⚽')});
