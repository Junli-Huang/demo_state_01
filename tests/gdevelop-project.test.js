const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const project = JSON.parse(fs.readFileSync('gdevelop/game.json', 'utf8'));

test('GDevelop project has a playable Playground scene', () => {
  assert.equal(project.firstLayout, 'Playground');
  const scene = project.layouts.find(layout => layout.name === 'Playground');
  assert.ok(scene);
  assert.equal(scene.instances.filter(instance => instance.name === 'Entity').length, 3);
});

test('Entity is one data-driven draggable object', () => {
  const entity = project.layouts[0].objects.find(object => object.name === 'Entity');
  assert.ok(entity);
  assert.ok(entity.behaviors.some(behavior => behavior.type === 'DraggableBehavior::Draggable'));
  const names = entity.variables.map(variable => variable.name);
  assert.deepEqual(names, ['Id', 'Name', 'Attributes', 'States']);
});

test('V0.3 model stays inside the requested rule scope', () => {
  assert.deepEqual(project.projectModel.attributes, ['Fire', 'Water', 'Ice', 'Poison']);
  assert.deepEqual(project.projectModel.states, ['Burning', 'Wet', 'Frozen', 'Poisoned']);
  assert.deepEqual(project.projectModel.effectTypes, [
    'AddAttribute', 'RemoveAttribute', 'AddStateProgress', 'RemoveStateProgress'
  ]);
  assert.deepEqual(project.projectModel.burningRules.map(rule => rule.condition.seconds), [5, 10]);
});
