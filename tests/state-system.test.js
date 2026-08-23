const test=require('node:test');
const assert=require('node:assert/strict');
const S=require('../state-system.js');

test('Burning OnEnter adds only its own temporary Fire contribution',()=>{
  const e=S.createEntity(1,'B',0,0,{fire:2});
  S.applyEffect(e,S.STATE_DEFS.burning.triggers.onEnter[0],'Burning.OnEnter',0);
  assert.equal(S.getAttributeTotal(e,'fire'),3);
  S.expireContributions(e,9999);
  assert.equal(S.getAttributeTotal(e,'fire'),3);
  S.expireContributions(e,1);
  assert.equal(S.getAttributeTotal(e,'fire'),2);
});

test('Fire +2 burns B, and B temporary Fire +1 burns C before expiry',()=>{
  const b=S.createEntity(2,'B'),c=S.createEntity(3,'C');
  let now=0,entered=false;
  for(let i=0;i<50;i++){now+=100;const events=S.advanceEntity(b,{fire:2},100,now);if(events.some(e=>e.type==='enter'&&e.state==='burning'))entered=true;}
  assert.equal(entered,true);
  S.applyEffect(b,S.STATE_DEFS.burning.triggers.onEnter[0],'Burning.OnEnter',now);
  assert.equal(S.getAttributeTotal(b,'fire'),1);
  let cEntered=false;
  for(let i=0;i<100;i++){now+=100;const fire=S.getAttributeTotal(b,'fire');const events=S.advanceEntity(c,{fire},100,now);if(events.some(e=>e.type==='enter'&&e.state==='burning'))cEntered=true;S.expireContributions(b,100);}
  assert.equal(cEntered,true);
  assert.equal(S.getAttributeTotal(b,'fire'),0);
});

test('Burning and Frozen coexist; RemoveStateProgress advances exits',()=>{
  const e=S.createEntity(1,'B');
  e.states.burning.active=true;e.states.burning.entry=100;
  e.states.frozen.active=true;e.states.frozen.entry=100;
  S.applyEffect(e,S.STATE_DEFS.burning.triggers.onTick[0],'Burning.OnTick');
  S.applyEffect(e,S.STATE_DEFS.frozen.triggers.onTick[0],'Frozen.OnTick');
  assert.equal(e.states.burning.active,true);assert.equal(e.states.frozen.active,true);
  assert.equal(e.states.burning.exit,5);assert.equal(e.states.frozen.exit,5);
});

test('all four V0.2 effect types operate on existing data',()=>{
  const e=S.createEntity(1,'E',0,0,{fire:2});
  S.applyEffect(e,{kind:'RemoveAttribute',attribute:'fire',amount:1},'test');assert.equal(e.baseAttributes.fire,1);
  S.applyEffect(e,{kind:'AddAttribute',attribute:'water',amount:1},'test');assert.equal(S.getAttributeTotal(e,'water'),1);
  S.applyEffect(e,{kind:'AddStateProgress',state:'poisoned',amount:20},'test');assert.equal(e.states.poisoned.entry,20);
  S.applyEffect(e,{kind:'RemoveStateProgress',state:'poisoned',amount:5},'test');assert.equal(e.states.poisoned.entry,15);
});

test('Environment uses the same state, effect and contribution model',()=>{
  const env=S.createEnvironment(0,'Environment');
  env.states.burning.active=true;
  S.applyEffect(env,S.STATE_DEFS.burning.triggers.onEnter[0],'Burning.OnEnter',0);
  assert.equal(env.isEnvironment,true);
  assert.equal(S.getAttributeTotal(env,'fire'),1);
  assert.ok(env.states.frozen);
});
