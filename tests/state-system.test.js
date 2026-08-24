const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../state-system.js');

function run(entity, influence, milliseconds, startAt = 0) {
  let now = startAt;
  const events = [];
  for (let elapsed = 0; elapsed < milliseconds; elapsed += 100) {
    now += 100;
    events.push(...S.advanceEntity(entity, influence, 100, now));
    events.push(...S.evaluateRules(entity, now));
  }
  return { now, events };
}

test('Burning OnEnter no longer grants Fire', () => {
  const entity = S.createEntity(1, 'B');
  const onEnter = S.STATE_DEFS.burning.triggers.onEnter;
  assert.equal(onEnter.length, 0);
  entity.states.burning.active = true;
  entity.states.burning.hasActivated = true;
  S.evaluateRules(entity, 0);
  assert.equal(S.getAttributeTotal(entity, 'fire'), 0);
});

test('Burning shorter than 5 seconds does not grant Fire', () => {
  const entity = S.createEntity(1, 'B');
  entity.states.burning.active = true;
  entity.states.burning.hasActivated = true;
  run(entity, { fire: 1 }, 4900);
  assert.equal(S.getAttributeTotal(entity, 'fire'), 0);
});

test('Burning ActiveFor 5 seconds grants Fire +1 exactly once', () => {
  const entity = S.createEntity(1, 'B');
  entity.states.burning.active = true;
  entity.states.burning.hasActivated = true;
  let result = run(entity, { fire: 1 }, 5000);
  assert.equal(S.getAttributeTotal(entity, 'fire'), 1);
  result = run(entity, { fire: 1 }, 15000, result.now);
  assert.equal(S.getAttributeTotal(entity, 'fire'), 1);
  assert.equal(entity.contributions[0].remainingMs, null);
});

test('Fire remains after Burning exits and is removed after 10 inactive seconds', () => {
  const entity = S.createEntity(1, 'B');
  entity.states.burning.active = true;
  entity.states.burning.hasActivated = true;
  let result = run(entity, { fire: 1 }, 5000);
  assert.equal(S.getAttributeTotal(entity, 'fire'), 1);
  entity.states.burning.active = false;
  entity.states.burning.activeDurationMs = 0;
  entity.states.burning.inactiveDurationMs = 0;
  result = run(entity, {}, 9900, result.now);
  assert.equal(S.getAttributeTotal(entity, 'fire'), 1);
  run(entity, {}, 100, result.now);
  assert.equal(S.getAttributeTotal(entity, 'fire'), 0);
});

test('re-entering Burning cancels removal and keeps Fire without stacking', () => {
  const entity = S.createEntity(1, 'B');
  entity.states.burning.active = true;
  entity.states.burning.hasActivated = true;
  let result = run(entity, { fire: 1 }, 5000);
  entity.states.burning.active = false;
  entity.states.burning.activeDurationMs = 0;
  entity.states.burning.inactiveDurationMs = 0;
  result = run(entity, {}, 7000, result.now);
  entity.states.burning.active = true;
  entity.states.burning.inactiveDurationMs = 0;
  result = run(entity, { fire: 1 }, 6000, result.now);
  assert.equal(S.getAttributeTotal(entity, 'fire'), 1);
  assert.equal(entity.contributions.length, 1);
});

test('A Fire +2 can burn B; B becomes a source only after active duration', () => {
  const b = S.createEntity(2, 'B');
  let result = run(b, { fire: 2 }, 5000);
  assert.equal(b.states.burning.active, true);
  assert.equal(S.getAttributeTotal(b, 'fire'), 0);
  result = run(b, { fire: 2 }, 5000, result.now);
  assert.equal(S.getAttributeTotal(b, 'fire'), 1);
  const c = S.createEntity(3, 'C');
  run(c, { fire: S.getAttributeTotal(b, 'fire') }, 10000, result.now);
  assert.equal(c.states.burning.active, true);
});

test('Burning and Frozen remain coexistent and use existing progress effects', () => {
  const entity = S.createEntity(1, 'B');
  entity.states.burning.active = true;
  entity.states.frozen.active = true;
  S.applyEffect(entity, S.STATE_DEFS.burning.triggers.onTick[0], 'Burning.OnTick');
  S.applyEffect(entity, S.STATE_DEFS.frozen.triggers.onTick[0], 'Frozen.OnTick');
  assert.equal(entity.states.burning.active, true);
  assert.equal(entity.states.frozen.active, true);
  assert.equal(entity.states.burning.exit, 5);
  assert.equal(entity.states.frozen.exit, 5);
});

test('Environment uses the same durations, rules and effects', () => {
  const environment = S.createEnvironment(0, 'Environment');
  environment.states.burning.active = true;
  environment.states.burning.hasActivated = true;
  run(environment, {}, 5000);
  assert.equal(S.getAttributeTotal(environment, 'fire'), 1);
});

test('editable trigger definitions are global for every entity', () => {
  S.resetTriggerEffects();
  S.STATE_DEFS.burning.triggers.onEnter.push({ kind: 'AddAttribute', attribute: 'fire', amount: 2, duration: 10 });
  const b = S.createEntity(2, 'B');
  const c = S.createEntity(3, 'C');
  for (const entity of [b, c]) {
    for (const effect of S.STATE_DEFS.burning.triggers.onEnter) S.applyEffect(entity, effect, 'Burning.onEnter');
  }
  assert.equal(S.getAttributeTotal(b, 'fire'), 2);
  assert.equal(S.getAttributeTotal(c, 'fire'), 2);
  assert.equal(b.contributions[0].remainingMs, 10000);
});

test('all four editable Effect types reuse applyEffect', () => {
  const entity = S.createEntity(1, 'E', 0, 0, { fire: 2 });
  const effects = [
    { kind: 'AddAttribute', attribute: 'water', amount: 2 },
    { kind: 'RemoveAttribute', attribute: 'fire', amount: 1 },
    { kind: 'AddStateProgress', state: 'poisoned', amount: 10 },
    { kind: 'RemoveStateProgress', state: 'poisoned', amount: 3 }
  ];
  effects.forEach(effect => S.applyEffect(entity, effect, 'UI Config'));
  assert.equal(S.getAttributeTotal(entity, 'water'), 2);
  assert.equal(entity.baseAttributes.fire, 1);
  assert.equal(entity.states.poisoned.entry, 7);
});

test('Reset restores default Trigger Effects without touching Condition Rules', () => {
  S.STATE_DEFS.burning.triggers.onTick.length = 0;
  S.STATE_DEFS.burning.triggers.onExit.push(S.createEffect('AddAttribute'));
  S.resetTriggerEffects();
  assert.deepEqual(S.STATE_DEFS.burning.triggers, S.DEFAULT_TRIGGER_EFFECTS.burning);
  assert.equal(S.RULE_DEFS.find(rule => rule.id === 'burning-fire-grant').condition.durationMs, 5000);
  assert.equal(S.RULE_DEFS.find(rule => rule.id === 'burning-fire-remove').condition.durationMs, 10000);
});
